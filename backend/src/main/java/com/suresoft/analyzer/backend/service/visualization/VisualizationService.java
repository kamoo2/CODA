package com.suresoft.analyzer.backend.service.visualization;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.suresoft.analyzer.backend.config.EnvProperties;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.dto.storage.UploadFileDto;
import com.suresoft.analyzer.backend.dto.visualization.*;
import com.suresoft.analyzer.backend.dto.visualization.request.BlueprintSettingRequestDto;
import com.suresoft.analyzer.backend.dto.visualization.request.CreateProjectBlueprintSettingRequest;
import com.suresoft.analyzer.backend.dto.visualization.request.CreateVisualizationProjectRequestDto;
import com.suresoft.analyzer.backend.dto.visualization.response.*;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.entity.storage.BucketEntity;
import com.suresoft.analyzer.backend.entity.storage.DbcFileEntity;
import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import com.suresoft.analyzer.backend.entity.visualization.RRDFileEntity;
import com.suresoft.analyzer.backend.entity.visualization.VisualizationProjectEntity;
import com.suresoft.analyzer.backend.entity.visualization.BlueprintSettingEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.TeamRepository;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.repository.storage.BucketRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import com.suresoft.analyzer.backend.repository.visualization.RRDFileRepository;
import com.suresoft.analyzer.backend.repository.visualization.VisualizationProjectRepository;
import com.suresoft.analyzer.backend.repository.visualization.BlueprintSettingRepository;
import com.suresoft.analyzer.backend.service.storage.SecureStorageService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VisualizationService {

    private final EnvProperties env;
    private final VisualizationProjectRepository visualizationProjectRepository;
    private final RRDFileRepository rrdFileRepository;
    private final BlueprintSettingRepository blueprintSettingRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final UploadFileRepository uploadFileRepository;
    private final BucketRepository bucketRepository;
    private final SecureStorageService secureStorageService;

    @Transactional
    public BlueprintVisualizationStatusResponseDto checkBlueprintVisualizationStatus(String userId, List<CreateProjectBlueprintSettingRequest> dtos){
        String targetSignature = generateBlueprintSignature(dtos);

        // 2. 동일한 signature를 가진 유저의 프로젝트 조회
        Optional<VisualizationProjectEntity> optionalProject =
                visualizationProjectRepository.findByUserIdAndBlueprintSignature(userId, targetSignature);

        BlueprintVisualizationStatusResponseDto response = new BlueprintVisualizationStatusResponseDto();

        // 3. 결과 판단
        if (optionalProject.isPresent()) {
            VisualizationProjectEntity project = optionalProject.get();
            boolean canVisualize = project.isVisualizationAvailable(); // status == PROCESSING || COMPLETE

            if (canVisualize) {
                response.setStatus(EBlueprintVisualizationStatus.REUSE_EXISTING);
                SimpleVisualizationProjectResponseDto dto = new SimpleVisualizationProjectResponseDto();
                dto.setId(project.getId());
                dto.setName(project.getName());
                response.setVisualizedProject(dto);
            }else{
                response.setStatus(EBlueprintVisualizationStatus.NEEDS_VISUALIZATION);
                response.setVisualizedProject(null);
            }
        }else{
            // 없으면 새로 생성해야함
            response.setStatus(EBlueprintVisualizationStatus.NEEDS_VISUALIZATION);
            response.setVisualizedProject(null);
        }
        return response;
    }

    public String startVisualizationProcess(String userId, String projectId, List<CreateProjectBlueprintSettingRequest> blueprints) {
        // ✅ 업로드 파일 ID를 blueprint 중 하나에서 가져옴
        String uploadFileId = blueprints.stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.BAD_REQUEST, "한개 이상의 시각화 데이터가 전달되지 않음."))
                .getUploadFileId();  // 필드명이 정확히 뭐인지 확인 필요

        // ✅ 업로드 파일 조회 후 Bucket ID 확인
        UploadFileEntity uploadFile = uploadFileRepository.findById(uploadFileId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "업로드 파일을 찾을 수 없습니다."));

        String bucketId = uploadFile.getBucket().getId();

        BucketEntity bucket = bucketRepository.findById(bucketId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        String accessKey = secureStorageService.decrypt(bucket.getAccessKey());
        String secretKey = secureStorageService.decrypt(bucket.getSecretKey());
        String regionName = bucket.getRegion();
        String bucketName = bucket.getName();

        CredentialDto credentialDto = new CredentialDto(accessKey,secretKey,regionName,bucketName);
        List<FileMetadataDto> metadataDtos = convertToFileMetadataDto(blueprints);

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

        String blueprintsBase64;
        String credentialBase64;

        try {
            String blueprintsJson = objectMapper.writeValueAsString(metadataDtos);
            String credentialJson = objectMapper.writeValueAsString(credentialDto);

            System.out.println("[DEBUG] blueprintsJson = " + blueprintsJson);
            System.out.println("[DEBUG] credentialJson = " + credentialJson);

            blueprintsBase64 = Base64.getEncoder().encodeToString(blueprintsJson.getBytes(StandardCharsets.UTF_8));
            credentialBase64 = Base64.getEncoder().encodeToString(credentialJson.getBytes(StandardCharsets.UTF_8));
        } catch (JsonProcessingException e) {
            throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "JSON 직렬화 실패");
        }

        // ✅ 2. Docker run 명령 실행
        List<String> command = new ArrayList<>();
        command.add("docker");
        command.add("run");
        command.add("--name");
        command.add(userId + "-" + projectId);
        command.add("--network");
        command.add("coda-network");
        command.add("--rm");

        // ✅ CPU와 메모리 제한 추가 (이 부분!)
//        command.add("--cpus");
//        command.add("1");
//        command.add("--memory");
//        command.add("512m");

        // ✅ MQTT 브로커 접근 가능하도록 host.docker.internal을 host-gateway로 설정
        command.add("--add-host");
        command.add("host.docker.internal:host-gateway");

        // ✅ 볼륨 마운트는 전체 문자열로 추가
        command.add("-v");
        command.add(env.getPath() + "/dbc:/data/dbc");

        command.add("-v");
        command.add(env.getPath() + "/rrd:/data/rrd");

        command.add("visualization-task");
        command.add("--server-url");
        command.add(env.getServerUrl());
        command.add("--user-id");
        command.add(userId);
        command.add("--project-id");
        command.add(projectId);
        command.add("--blueprints");
        command.add(blueprintsBase64);
        command.add("--credential");
        command.add(credentialBase64);

        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start(); // ✅ 여기서 실행만 시키고 대기하지 않음

            new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        System.out.println("[DOCKER LOG] " + line);
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }).start();

            // ✅ 실행 성공했다면 바로 상태 갱신
            VisualizationProjectEntity project = visualizationProjectRepository.findById(projectId)
                    .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
            project.setStatus(EVisualizationProcessStatus.PROCESSING);
            visualizationProjectRepository.save(project);

            return EVisualizationProcessStatus.PROCESSING.name();

        } catch (IOException e) {
            throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "Docker 실행 중 예외 발생");
        }
    }

    public List<RRDFileResponseDto> getRRDFilesByProjectId(String projectId){
        List<RRDFileEntity> rrdFiles = rrdFileRepository.findByVisualizationProjectId(projectId);
        return rrdFiles.stream()
                .map(file -> RRDFileResponseDto.builder()
                        .id(file.getId())
                        .name(file.getName())
                        .rrdUrl(file.getRrdUrl())
                        .build())
                .toList();
    }
    public List<SimpleVisualizationProjectResponseDto> getMyVisualizationProjects(String userId) {
        List<VisualizationProjectEntity> projects = visualizationProjectRepository.findVisualizationProjectsByUserId(userId);

        return projects.stream()
                .map(project -> SimpleVisualizationProjectResponseDto.builder()
                        .id(project.getId())
                        .name(project.getName())
                        .status(project.getStatus())
                        .createdAt(project.getCreatedAt())
                        .build()
                )
                .toList();
    }
    @Transactional
    public SimpleVisualizationProjectResponseDto updateProjectName(String userId, String projectId, String updateName){
        VisualizationProjectEntity project = visualizationProjectRepository.findById(projectId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Project Not Found"));

        // 자신의 프로젝트만 수정 가능
        if (project.getUser().getId().equals(userId)){
            project.setName(updateName);
            visualizationProjectRepository.save(project);
        }else{
            throw new ApiException(ErrorCode.FORBIDDEN, "자신의 프로젝트만 수정 가능합니다.");
        }

        return SimpleVisualizationProjectResponseDto.builder()
                .id(project.getId())
                .name(project.getName())
                .createdAt(project.getCreatedAt())
                .build();
    }
    @Transactional
    public void deleteProjectById(String userId,String projectId){
        VisualizationProjectEntity project = visualizationProjectRepository.findById(projectId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Project Not Found"));

        // 자신의 프로젝트만 수정 가능
        if (project.getUser().getId().equals(userId)){
            // 청사진 제거
            blueprintSettingRepository.deleteByVisualizationProjectId(project.getId());

            // RRD 파일 제거
            rrdFileRepository.deleteByVisualizationProjectId(project.getId());

            visualizationProjectRepository.deleteById(projectId);
        }else{
            throw new ApiException(ErrorCode.FORBIDDEN, "자신의 프로젝트만 수정 가능합니다.");
        }
    }
    @Transactional
    public void deleteProjects(String userId, List<String> projectIds){
        List<VisualizationProjectEntity> projects = visualizationProjectRepository.findAllById(projectIds);

        if (projects.size() != projectIds.size()) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "일부 프로젝트가 존재하지 않습니다.");
        }

        boolean hasUnauthorizedProject = projects.stream()
                .anyMatch(project -> !project.getUser().getId().equals(userId));

        if(hasUnauthorizedProject){
            throw new ApiException(ErrorCode.FORBIDDEN, "본인의 프로젝트만 삭제할 수 있습니다.");
        }

        visualizationProjectRepository.deleteAll(projects);

    }

    public List<TreeFolderNodeDto<SimpleVisualizationProjectResponseDto>> getTeamVisualizationProjects(String teamId) {

        List<UserEntity> users = teamRepository.findUserIdsByTeamId(teamId);
        Map<UserEntity, List<SimpleVisualizationProjectResponseDto>> map = new HashMap<>();

        for (UserEntity user : users) {
            List<VisualizationProjectEntity> projects = visualizationProjectRepository.findVisualizationProjectsByUserId(user.getId());

            if (!projects.isEmpty()) {
                List<SimpleVisualizationProjectResponseDto> dtos = projects.stream()
                        .map(project -> SimpleVisualizationProjectResponseDto.builder()
                                .id(project.getId())
                                .name(project.getName())
                                .status(project.getStatus())
                                .createdAt(project.getCreatedAt())
                                .build()
                        )
                        .toList();

                map.put(user,dtos);
            }
        }

        return map.entrySet().stream()
                .map(entry -> {
                    UserEntity user = entry.getKey(); // userName이 폴더
                    List<SimpleVisualizationProjectResponseDto> userProjects = entry.getValue();

                    // 유저 노드 생성
                    return new TreeFolderNodeDto<>(
                            user.getName(),
                            user.getTeam().getId() + "-" + user.getId(),
                            false,
                            null,
                            userProjects.stream()
                                    .sorted(Comparator.comparing(SimpleVisualizationProjectResponseDto::getCreatedAt).reversed())
                                    .map(project -> new TreeFolderNodeDto<SimpleVisualizationProjectResponseDto>(
                                            project.getName(),
                                            project.getId(),
                                            true,
                                            project,
                                            null
                                    ))
                                    .collect(Collectors.toList())
                    );
                })
                .toList();
    }

    public VisualizationProjectResponseDto getProjectById(String id) {
        VisualizationProjectEntity project = visualizationProjectRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND,"해당Id를 가진 시각화 프로젝트를 찾을 수 없습니다."));
        List<RRDFileResponseDto> rrdFiles = rrdFileRepository.findByVisualizationProjectId(id).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        List<BlueprintSettingResponseDto> blueprintSettings = blueprintSettingRepository.findAllByVisualizationProjectId(id).stream()
                .map(this::convertToDto)
                .toList();

        VisualizationProjectResponseDto dto = new VisualizationProjectResponseDto();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setCreatedAt(project.getCreatedAt());
        dto.setBlueprintSettings(blueprintSettings);
        dto.setRrdFiles(rrdFiles);
        dto.setStatus(project.getStatus());

        return dto;
    }

    @Transactional
    public SimpleVisualizationProjectResponseDto createProject(String userId, CreateVisualizationProjectRequestDto dto){

        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND,"User를 찾을 수 없습니다."));

        VisualizationProjectEntity project = new VisualizationProjectEntity();

        project.setName(dto.getProjectName());
        project.setUser(user);
        project.setStatus(EVisualizationProcessStatus.NOT_STARTED);
        project.setBlueprintSignature(generateBlueprintSignature(dto.getBlueprints()));

        VisualizationProjectEntity savedProject = visualizationProjectRepository.save(project);

        for (CreateProjectBlueprintSettingRequest blueprint : dto.getBlueprints()){
            String entityName = blueprint.getEntityName();
            String viewName = blueprint.getViewName();
            String uploadFileId = blueprint.getUploadFileId();

            UploadFileEntity uploadFile = uploadFileRepository.findById(uploadFileId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

            BlueprintSettingEntity blueprintSettingEntity = new BlueprintSettingEntity();
            blueprintSettingEntity.setEntityName(entityName);
            blueprintSettingEntity.setViewName(viewName);
            blueprintSettingEntity.setUploadFile(uploadFile);
            blueprintSettingEntity.setVisualizationProject(savedProject);
            blueprintSettingRepository.save(blueprintSettingEntity);
        }

        SimpleVisualizationProjectResponseDto response = new SimpleVisualizationProjectResponseDto();
        response.setId(project.getId());
        response.setName(project.getName());
        response.setCreatedAt(project.getCreatedAt());
        response.setStatus(project.getStatus());

        return response;

    }

    private String generateBlueprintSignature(List<CreateProjectBlueprintSettingRequest> dtos) {
        StringBuilder sb = new StringBuilder();

        dtos.stream()
                .sorted(Comparator.comparing(CreateProjectBlueprintSettingRequest::getUploadFileId))
                .forEach(dto -> {
                    sb.append(dto.getUploadFileId())
                            .append("|").append(dto.getEntityName())
                            .append("|").append(dto.getViewName());

                    // riff 파일이고 선택된 신호들이 들어왔으면
                    if (dto.getViewName().equals("RiffParser") && !dto.getSelectedSignals().isEmpty()){
                        dto.getSelectedSignals().stream()
                                .sorted(Comparator.comparing(CreateProjectBlueprintSettingRequest.SelectedSignal::getMessageName))
                                .forEach(signal->{
                                    sb.append("|").append(signal.getMessageName());
                                    signal.getSignalNames().stream()
                                            .sorted()
                                            .forEach(sig -> sb.append(":").append(sig));
                                });
                    }

                    sb.append(";");
                });
        return sha256(sb.toString());
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash); // 고정 길이 서명
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 hashing failed", e);
        }
    }

    /**
     * 전달받은 요청 리스트와 동일한 `VisualizationUploadFileEntity`가 DB에 존재하는지 조회
     */
    private List<BlueprintSettingEntity> findMatchingUploadFiles(List<BlueprintSettingRequestDto> requestList) {
        return requestList.stream()
                .map(req -> blueprintSettingRepository.findByEntityNameAndViewNameAndUploadFileId(
                        req.getEntityName(), req.getViewName(), req.getUploadFileId()))
                .filter(Optional::isPresent) // DB에 없다면 empty로 들어오므로 그 데이터는 제거해야함.
                .map(Optional::get) // Optional에서 값을 꺼냄
                .collect(Collectors.toList());
    }



    private RRDFileResponseDto convertToDto(RRDFileEntity file) {
        return new RRDFileResponseDto(
                file.getId(),
                file.getName(),
                file.getRrdUrl()
        );
    }

    private BlueprintSettingResponseDto convertToDto(BlueprintSettingEntity vuf) {
        UploadFileEntity uploadFile = vuf.getUploadFile();
        DbcFileEntity dbc = uploadFile.getDbc();  // Dbc 파일 가져오기

        return new BlueprintSettingResponseDto(
                vuf.getId(),
                vuf.getViewName(),
                vuf.getEntityName(),
                new UploadFileDto(
                        uploadFile.getId(),
                        uploadFile.getName(),
                        uploadFile.getS3Url(),
                        uploadFile.getParser().getName(),
                        dbc != null ? dbc.getName() : null,  // ✅ null 체크 후 getPath
                        uploadFile.getParser().getId(),
                        uploadFile.getTimestampMicro(),
                        dbc != null ? dbc.getId() : null
                )
        );
    }

    private List<FileMetadataDto> convertToFileMetadataDto(List<CreateProjectBlueprintSettingRequest> requests) {
        return requests.stream().map(req -> {
            List<FileMetadataDto.SelectedSignalDto> selectedSignals = req.getSelectedSignals().stream()
                    .map(signal -> new FileMetadataDto.SelectedSignalDto(
                            signal.getMessageName(),
                            signal.getSignalNames()
                    ))
                    .collect(Collectors.toList());

            String dbcFileName = (req.getDbcFileName() != null && !req.getDbcFileName().isBlank())
                    ? req.getDbcFileName()
                    : null;

            return new FileMetadataDto(
                    req.getUploadFilePath(),
                    req.getParserName(),
                    req.getEntityName(),
                    dbcFileName,
                    selectedSignals
            );
        }).collect(Collectors.toList());
    }
}
