package com.suresoft.analyzer.backend.service.analysis;

import com.suresoft.analyzer.backend.dto.analysis.ProjectFileDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationProjectCriteriaDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationResultDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationProjectDto;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaState;
import com.suresoft.analyzer.backend.entity.analysis.ProjectFileEntity;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectCriteriaEntity;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationResultEntity;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectEntity;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.analysis.CriteriaRepository;
import com.suresoft.analyzer.backend.repository.analysis.ProjectFileRepository;
import com.suresoft.analyzer.backend.repository.analysis.dataset.curation.CurationProjectCriteriaRepository;
import com.suresoft.analyzer.backend.repository.analysis.dataset.curation.CurationResultRepository;
import com.suresoft.analyzer.backend.repository.analysis.dataset.curation.CurationProjectRepository;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CurationService {
    private final CurationProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectFileRepository projectFileRepository;
    private final UploadFileRepository uploadFileRepository;
    private final CurationProjectCriteriaRepository projectCriteriaRepository;
    private final CriteriaRepository criteriaRepository;
    private final CurationResultRepository curationResultRepository;

    // key : 유저 id, value : 작업 요청 큐
    private final Map<String, BlockingQueue<AnalysisRequest>> userAnalysisQueues = new ConcurrentHashMap<>();
    // key : 유저 id, value : 작업 쓰레드
    private final Map<String, Thread> userWorkers = new ConcurrentHashMap<>();
    // key : 프로젝트 연결 기준 id, value : 일시 정지 인덱스 (TODO 추후 시간 등으로 변경 필요)
    private final Map<String, Integer> pausedIndexMap = new ConcurrentHashMap<>();
    // key : 프로젝트 연결 기준 id, value : 기준 별 분석 상태
    private final Map<String, AnalysisState> analysisStateMap = new ConcurrentHashMap<>();
    // 기준 분석 상태
    private enum AnalysisState {
        RUNNING, PAUSED, STOPPED
    }

    public void runAnalysisAsync(String userId, String projectCriteriaId) {
        analysisStateMap.put(projectCriteriaId, AnalysisState.RUNNING);
        getOrCreateQueue(userId).offer(new AnalysisRequest(userId, projectCriteriaId, false));
        startWorkerIfNeeded(userId); // 유저별 워커가 없다면 새로 시작
    }

    public void pauseAnalysis(String projectCriteriaId) {
        analysisStateMap.put(projectCriteriaId, AnalysisState.PAUSED);
    }

    public void stopAnalysis(String projectCriteriaId) {
        analysisStateMap.put(projectCriteriaId, AnalysisState.STOPPED);
    }

    public void resumeAnalysis(String userId, String projectCriteriaId) {
        analysisStateMap.put(projectCriteriaId, AnalysisState.RUNNING);
        getOrCreateQueue(userId).offer(new AnalysisRequest(userId, projectCriteriaId, true));
        startWorkerIfNeeded(userId);
    }

    private BlockingQueue<AnalysisRequest> getOrCreateQueue(String userId) {
        return userAnalysisQueues.computeIfAbsent(userId, k -> new LinkedBlockingQueue<>());
    }

    private void startWorkerIfNeeded(String userId) {
        userWorkers.computeIfAbsent(userId, uid -> {
            Thread worker = new Thread(() -> {
                BlockingQueue<AnalysisRequest> queue = getOrCreateQueue(uid);
                while (true) {
                    try {
                        AnalysisRequest request = queue.take();
                        processAnalysis(request);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            });
            worker.setDaemon(true);
            worker.start();
            return worker;
        });
    }

    private void processAnalysis(AnalysisRequest request) {
        String userId = request.userId();
        String projectCriteriaId = request.projectCriteriaId();
        CurationProjectCriteriaEntity prjCrt = projectCriteriaRepository.findById(projectCriteriaId).orElseThrow();

        System.out.printf("[%s/%s] 분석 시작%n",userId,projectCriteriaId);
        // 분석 수행 이전에 일시정지/중지 된 항목들은 종료시켜준다.
        if (analysisStateMap.getOrDefault(projectCriteriaId, AnalysisState.RUNNING) == AnalysisState.STOPPED) {
            System.out.printf("[%s/%s] 분석 시작 전, 중지됨%n",userId,projectCriteriaId);
            return;
        }
        if (analysisStateMap.get(projectCriteriaId) == AnalysisState.PAUSED) {
            System.out.printf("[%s/%s] 분석 시작 전, 일시 정지됨%n",userId,projectCriteriaId);
            pausedIndexMap.put(projectCriteriaId, 0);
            return;
        }

        boolean isResume = request.isResume();

        int startIndex = 0;
        if (isResume) {
            startIndex = pausedIndexMap.getOrDefault(projectCriteriaId, 0);
            System.out.printf("[%s/%s] resume index : %d%n",userId,projectCriteriaId,startIndex);
        }

        analysisStateMap.put(projectCriteriaId, AnalysisState.RUNNING);

        try {
            DateTimeFormatter formatter = DateTimeFormatter.ISO_INSTANT;
            LocalDateTime startTime = LocalDateTime.now();

            for (int i = startIndex; i < 10; i++) {
                System.out.printf("[%s/%s] 분석 중..%d%n",userId,projectCriteriaId,i);
                // 분석 도중 일시정지/중지 된 항목들 종료
                if (analysisStateMap.getOrDefault(projectCriteriaId, AnalysisState.RUNNING) == AnalysisState.STOPPED) {
                    return;
                }
                if (analysisStateMap.get(projectCriteriaId) == AnalysisState.PAUSED) {
                    // 일시 정지 index 저장 TODO!! DB에 저장해야 함.
                    pausedIndexMap.put(projectCriteriaId, i);
                    return;
                }

                Thread.sleep(200); // 실제 분석 시간 대체

                // 결과 생성 DB 저장 예제
                CurationResultEntity resultEntity = new CurationResultEntity();
                resultEntity.setStartTime(startTime);

                resultEntity.setEndTime(startTime.plusMinutes(10));
                resultEntity.setProjectCriteria(prjCrt);
                curationResultRepository.save(resultEntity);
                CurationWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "NEW_CURATION_RESULT");
                startTime = startTime.plusMinutes(10);
            }

            analysisStateMap.remove(projectCriteriaId);
            pausedIndexMap.remove(projectCriteriaId);

            CurationWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "CURATION_COMPLETED");
            System.out.printf("[%s/%s] 분석 완료%n",userId,projectCriteriaId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private record AnalysisRequest(String userId, String projectCriteriaId, boolean isResume) {}

    public List<CurationProjectDto> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(project -> {
                    CurationProjectDto dto = new CurationProjectDto();
                    dto.setId(project.getId());
                    dto.setName(project.getName());
                    dto.setAnalysisDate(project.getAnalysisDate());
                    dto.setOwner(project.getOwner());
                    dto.setDescription(project.getDescription());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<TreeFolderNodeDto<CurationProjectDto>> getMyEvaluationProjects(String userId) {
        List<CurationProjectEntity> projects = projectRepository.findByUserId(userId);
        List<TreeFolderNodeDto<CurationProjectDto>> result = new ArrayList<>();

        if (projects.size() > 0) {
            List<CurationProjectDto> projectDtos = projects.stream().sorted(Comparator.comparing(CurationProjectEntity::getCreatedAt).reversed())
                    .map(CurationProjectDto::new)
                    .toList();
            Map<String, List<TreeFolderNodeDto<CurationProjectDto>>> folderMap = new LinkedHashMap<>();
            // created at 날짜로 폴더링
            for (CurationProjectDto projectDto : projectDtos) {
                String folderName = projectDto.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                TreeFolderNodeDto fileNodeDto = new TreeFolderNodeDto(
                        projectDto.getName(),
                        projectDto.getId(),
                        true,
                        projectDto,
                        null
                );
                if(folderMap.containsKey(folderName)) {
                    folderMap.get(folderName).add(fileNodeDto);
                }else {
                    List<TreeFolderNodeDto<CurationProjectDto>> files = new ArrayList<TreeFolderNodeDto<CurationProjectDto>>();
                    files.add(fileNodeDto);
                    folderMap.put(folderName,files);
                }
            }
            // tree folder 객체로 생성
            for(String key : folderMap.keySet()) {
                result.add(new TreeFolderNodeDto<>(
                        key,
                        key,
                        false,
                        null,
                        folderMap.get(key)
                ));
            }
        }
        return result;
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public CurationProjectDto updateProjectName(String userId, String projectId, String updateName){
        CurationProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Project Not Found"));

        // 자신의 프로젝트만 수정 가능
        if (project.getUser().getId().equals(userId)){
            project.setName(updateName);
        }else{
            throw new ApiException(ErrorCode.FORBIDDEN, "자신의 프로젝트만 수정 가능합니다.");
        }

        return new CurationProjectDto(project);
    }

    public List<CurationProjectDto> getProjectsByUserId(String userId) {
        return projectRepository.findByUserId(userId).stream()
                .map(project -> {
                    CurationProjectDto dto = new CurationProjectDto();
                    dto.setId(project.getId());
                    dto.setName(project.getName());
                    dto.setAnalysisDate(project.getAnalysisDate());
                    dto.setOwner(project.getOwner());
                    dto.setDescription(project.getDescription());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public CurationProjectDto saveProject(String userId, CurationProjectDto projectDto) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->  new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "User Not Found"));

        CurationProjectEntity newProject = getCurationProjectEntity(projectDto, user);
        CurationProjectEntity savedProject = projectRepository.save(newProject);
        return new CurationProjectDto(savedProject);
    }

    @NotNull
    private static CurationProjectEntity getCurationProjectEntity(CurationProjectDto projectDto, UserEntity user) {
        CurationProjectEntity newProject = new CurationProjectEntity();
        newProject.setUser(user);
        newProject.setCreatedAt(projectDto.getCreatedAt());
        newProject.setOwner(user.getName());
        newProject.setName(projectDto.getName());
        newProject.setAnalysisDate(projectDto.getAnalysisDate());
        newProject.setDescription(projectDto.getDescription());
        return newProject;
    }

    public void deleteProject(String projectId) {
        // 엔티티 존재 여부 확인
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("프로젝트가 존재하지 않습니다.");
        }
        // 프로젝트 파일 삭제
        List<ProjectFileEntity> files = projectFileRepository.findByCurationProjectId(projectId);
        for(ProjectFileEntity deleteEntity : files) {
            deleteProjectFile(projectId,deleteEntity.getUploadFile().getId());
        }
        // 프로젝트 조건 삭제
        List<CurationProjectCriteriaEntity> criteria = projectCriteriaRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        for(CurationProjectCriteriaEntity deleteEntity : criteria) {
            deleteProjectCriteria(deleteEntity.getId());
        }
        // 프로젝트 삭제
        projectRepository.deleteById(projectId);
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updateProjectDescription(String projectId, String description) {
        CurationProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트가 존재하지 않습니다."));

        project.setDescription(description); // 변경 감지
    }

    public List<ProjectFileDto> getProjectFilesByProjectId(String projectId) {
        List<ProjectFileEntity> entity = projectFileRepository.findByCurationProjectId(projectId);
        return entity.stream().map(projectFile -> {
            ProjectFileDto dto = new ProjectFileDto();
            dto.setId(projectFile.getId());
            dto.setProjectId(projectFile.getCurationProject().getId());
            dto.setUploadFileId(projectFile.getUploadFile().getId());
            dto.setUploadFileName(projectFile.getUploadFile().getName());
            dto.setUploadFilePath(projectFile.getUploadFile().getS3Url());
            return dto;
        }).collect(Collectors.toList());
    }

    public ProjectFileDto saveProjectFile(ProjectFileDto fileDto) {
        ProjectFileEntity newFile = new ProjectFileEntity();
        newFile.setUploadFile(uploadFileRepository.getReferenceById(fileDto.getUploadFileId()));
        newFile.setCurationProject(projectRepository.getReferenceById(fileDto.getProjectId()));
        ProjectFileEntity savedFile = projectFileRepository.save(newFile);
        return new ProjectFileDto(savedFile);
    }

    public void deleteProjectFile(String projectId, String fileId) {
        List<ProjectFileEntity> entities = projectFileRepository.findByCurationProjectId(projectId);
        List<ProjectFileEntity> deleteEntities = entities.stream().filter(entity -> entity.getUploadFile().getId().equals(fileId)).toList();

        for(ProjectFileEntity deleteEntity : deleteEntities) {
            // 해당 파일과 연결된 조건 삭제
            List<CurationProjectCriteriaEntity> criteria = projectCriteriaRepository.findByProjectFileId(deleteEntity.getId());
            for(CurationProjectCriteriaEntity deleteCrtEntity : criteria) {
                deleteProjectCriteria(deleteCrtEntity.getId());
            }
            // 파일 삭제
            projectFileRepository.deleteById(deleteEntity.getId());
        }
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updateProjectCriteriaState(String prjCrtId, CriteriaState state) {
        CurationProjectCriteriaEntity prjCrtEntity =  projectCriteriaRepository.findById(prjCrtId).orElseThrow(() -> new IllegalArgumentException("프로젝트가 연결 기준이 존재하지 않습니다."));
        prjCrtEntity.setState(state);
    }

    public List<CurationProjectCriteriaDto> getCriteriaByProjectId(String projectId) {
        List<CurationProjectCriteriaEntity> entities = projectCriteriaRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        // created at으로 정렬 후 같은 데이터들은 criteria name으로 정렬
        return entities.stream().sorted(Comparator.comparing(CurationProjectCriteriaEntity::getCreatedAt).thenComparing(criteria->criteria.getCriteria().getName())).map(CurationProjectCriteriaDto::new).collect(Collectors.toList());
    }

    public List<CurationResultDto> getCurationResultsByProjectId(String projectId) {
        List<CurationResultEntity> entities = curationResultRepository.findByProjectCriteriaProjectId(projectId);
        return entities.stream().map(CurationResultDto::new).collect(Collectors.toList());
    }
    public CurationProjectCriteriaDto saveProjectCriteria(CurationProjectCriteriaDto crtDto) {
        CurationProjectCriteriaEntity newCrt = new CurationProjectCriteriaEntity();
        newCrt.setProject(projectRepository.getReferenceById(crtDto.getProjectId()));
        newCrt.setCriteria(criteriaRepository.getReferenceById(crtDto.getCriteriaId()));
        newCrt.setState(crtDto.getState());
        newCrt.setCreatedAt(crtDto.getCreatedAt());
        newCrt.setProjectFile(projectFileRepository.getReferenceById(crtDto.getProjectFileId()));
        CurationProjectCriteriaEntity savedCrt = projectCriteriaRepository.save(newCrt);
        return new CurationProjectCriteriaDto(savedCrt);
    }

    public void deleteCurationResultsByProjectCriteriaId(String projectCriteriaId) {
        List<CurationResultEntity> deleteResults = curationResultRepository.findByProjectCriteriaId(projectCriteriaId);

        for(CurationResultEntity entity : deleteResults) {
            curationResultRepository.deleteById(entity.getId());
        }
    }

    public void deleteProjectCriteria(String projectCriteriaId) {
        // 엔티티 존재 여부 확인
        if (!projectCriteriaRepository.existsById(projectCriteriaId)) {
            throw new IllegalArgumentException("프로젝트 연결 조건이 존재하지 않습니다.");
        }
        CurationProjectCriteriaEntity deleteCriteria = projectCriteriaRepository.findById(projectCriteriaId).orElseThrow(() -> new IllegalArgumentException("기준이 존재하지 않습니다."));;
        // 평가 결과 삭제
        deleteCurationResultsByProjectCriteriaId(deleteCriteria.getId());
        // 삭제
        projectCriteriaRepository.deleteById(projectCriteriaId);
    }
}
