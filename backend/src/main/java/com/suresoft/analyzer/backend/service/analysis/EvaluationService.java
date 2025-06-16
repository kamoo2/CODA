package com.suresoft.analyzer.backend.service.analysis;

import com.suresoft.analyzer.backend.dto.analysis.evaluation.EvaluationProjectCriteriaDto;
import com.suresoft.analyzer.backend.dto.analysis.ProjectFileDto;
import com.suresoft.analyzer.backend.dto.analysis.evaluation.*;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaState;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaType;
import com.suresoft.analyzer.backend.entity.analysis.ProjectFileEntity;
import com.suresoft.analyzer.backend.entity.analysis.evaluation.*;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.analysis.CriteriaRepository;
import com.suresoft.analyzer.backend.repository.analysis.ProjectFileRepository;
import com.suresoft.analyzer.backend.repository.analysis.evaluation.*;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Service;

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
public class EvaluationService {
    private final EvaluationProjectRepository evalProjectRepository;
    private final UserRepository userRepository;
    private final ProjectFileRepository projectFileRepository;
    private final UploadFileRepository uploadFileRepository;
    private final EvaluationProjectCriteriaRepository projectCriteriaRepository;
    private final CriteriaRepository criteriaRepository;
    private final PassEvaluationResultRepository passEvaluationResultRepository;
    private final ScoreEvaluationResultRepository scoreEvaluationResultRepository;
    private final TaggingResultRepository taggingResultRepository;

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
        EvaluationProjectCriteriaEntity prjCrt = projectCriteriaRepository.findById(projectCriteriaId).orElseThrow();

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
            int repeatCount = new Random().nextInt(10);
            for (int i = startIndex; i < repeatCount; i++) {
                System.out.printf("[%s/%s] 분석 중..%d%n",userId,projectCriteriaId,i);
                // 분석 도중 일시정지/중지 된 항목들 종료
                if (analysisStateMap.getOrDefault(projectCriteriaId, AnalysisState.RUNNING) == AnalysisState.STOPPED) {
                    return;
                }
                if (analysisStateMap.get(projectCriteriaId) == AnalysisState.PAUSED) {
                    // 일시 정지 index 저장 TODO!! DB에 저장해야 할듯.
                    pausedIndexMap.put(projectCriteriaId, i);
                    return;
                }

                Thread.sleep(1000); // 실제 분석 시간 대체

                // 결과 생성 DB 저장 예제
                if(prjCrt.getType() == CriteriaType.PASS) {
                    // crt1 은 pass 조건으로
                    if(!prjCrt.getCriteria().getName().equals("crt1")) {
                        PassEvaluationResultEntity resultEntity = new PassEvaluationResultEntity();
                        resultEntity.setMessage("속도 : " + Math.round(new Random().nextFloat(51) + 50*100.0)/100.0
                                + "km/h, TTC : " + Math.round(new Random().nextFloat(2)*100.0)/100.0 + "s");
                        resultEntity.setEvaluationProjectCriteria(prjCrt);
                        resultEntity.setFailStartTime(startTime);
                        resultEntity.setFailEndTime(startTime.plusMinutes(10));
                        passEvaluationResultRepository.save(resultEntity);
                        AnalysisWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "NEW_PASS_EVAL_RESULT");
                    }
                }
                else if(prjCrt.getType() == CriteriaType.SCORE) {
                    ScoreEvaluationResultEntity resultEntity = new ScoreEvaluationResultEntity();
                    resultEntity.setEvaluationProjectCriteria(prjCrt);
                    resultEntity.setStartTime(startTime);
                    resultEntity.setEndTime(startTime.plusMinutes(10));
                    resultEntity.setScore(Math.round((Math.random()*100+1)*100.0)/100.0);
                    resultEntity.setMessage("속도 : " + Math.round(new Random().nextFloat(51) + 50*100.0)/100.0
                            + "km/h, TTC : " + Math.round(new Random().nextFloat(2)*100.0)/100.0 + "s");
                    scoreEvaluationResultRepository.save(resultEntity);
                    AnalysisWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "NEW_SCORE_EVAL_RESULT");
                }else if(prjCrt.getType() == CriteriaType.TAGGING) {
                    TaggingResultEntity resultEntity = new TaggingResultEntity();
                    resultEntity.setStartTime(startTime);
                    resultEntity.setEndTime(startTime.plusMinutes(10));
                    resultEntity.setColor(prjCrt.getTagColor());
                    resultEntity.setEvaluationProjectCriteria(prjCrt);
                    resultEntity.setMessage(prjCrt.getCriteria().getName() + " 위반");
                    taggingResultRepository.save(resultEntity);
                    AnalysisWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "NEW_TAGGING_RESULT");
                }
                startTime = startTime.plusMinutes(10);
            }

            analysisStateMap.remove(projectCriteriaId);
            pausedIndexMap.remove(projectCriteriaId);

            if(prjCrt.getType() == CriteriaType.PASS) {
                AnalysisWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "PASS_EVAL_COMPLETED");
            }else if(prjCrt.getType() == CriteriaType.SCORE) {
                AnalysisWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "SCORE_EVAL_COMPLETED");
            }else if(prjCrt.getType() == CriteriaType.TAGGING) {
                AnalysisWebSocketHandler.sendAnalysisMessageToUser(userId, projectCriteriaId, "TAGGING_COMPLETED");
            }
            System.out.printf("[%s/%s] 분석 완료%n",userId,projectCriteriaId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private record AnalysisRequest(String userId, String projectCriteriaId, boolean isResume) {}

    public List<EvaluationProjectDto> getAllProjects() {
        return evalProjectRepository.findAll().stream()
                .map(project -> {
                    EvaluationProjectDto dto = new EvaluationProjectDto();
                    dto.setId(project.getId());
                    dto.setName(project.getName());
                    dto.setAnalysisDate(project.getAnalysisDate());
                    dto.setOwner(project.getOwner());
                    dto.setDescription(project.getDescription());
                    dto.setPassEvalEnabled(project.isPassEvalEnabled());
                    dto.setScoreEvalEnabled(project.isScoreEvalEnabled());
                    dto.setTaggingEnabled(project.isTaggingEnabled());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<TreeFolderNodeDto<EvaluationProjectDto>> getMyEvaluationProjects(String userId) {
        List<EvaluationProjectEntity> projects = evalProjectRepository.findByUserId(userId);
        List<TreeFolderNodeDto<EvaluationProjectDto>> result = new ArrayList<>();

        if (projects.size() > 0) {
            List<EvaluationProjectDto> projectDtos = projects.stream().sorted(Comparator.comparing(EvaluationProjectEntity::getCreatedAt).reversed())
                    .map(EvaluationProjectDto::new)
                    .toList();
            Map<String, List<TreeFolderNodeDto<EvaluationProjectDto>>> folderMap = new LinkedHashMap<>();
            // created at 날짜로 폴더링
            for (EvaluationProjectDto projectDto : projectDtos) {
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
                    List<TreeFolderNodeDto<EvaluationProjectDto>> files = new ArrayList<TreeFolderNodeDto<EvaluationProjectDto>>();
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
    public EvaluationProjectDto updateProjectName(String userId, String projectId, String updateName){
        EvaluationProjectEntity project = evalProjectRepository.findById(projectId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Project Not Found"));

        // 자신의 프로젝트만 수정 가능
        if (project.getUser().getId().equals(userId)){
            project.setName(updateName);
        }else{
            throw new ApiException(ErrorCode.FORBIDDEN, "자신의 프로젝트만 수정 가능합니다.");
        }

        return new EvaluationProjectDto(project);
    }

    public List<EvaluationProjectDto> getProjectsByUserId(String userId) {
        return evalProjectRepository.findByUserId(userId).stream()
                .map(project -> {
                    EvaluationProjectDto dto = new EvaluationProjectDto();
                    dto.setId(project.getId());
                    dto.setName(project.getName());
                    dto.setAnalysisDate(project.getAnalysisDate());
                    dto.setOwner(project.getOwner());
                    dto.setDescription(project.getDescription());
                    dto.setPassEvalEnabled(project.isPassEvalEnabled());
                    dto.setScoreEvalEnabled(project.isScoreEvalEnabled());
                    dto.setTaggingEnabled(project.isTaggingEnabled());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<ProjectFileDto> getEvalProjectFilesByProjectId(String projectId) {
        List<ProjectFileEntity> entity = projectFileRepository.findByEvaluationProjectId(projectId);
        return entity.stream().map(projectFile -> {
            ProjectFileDto dto = new ProjectFileDto();
            dto.setUploadFileId(projectFile.getUploadFile().getId());
            dto.setUploadFileName(projectFile.getUploadFile().getName());
            dto.setUploadFilePath(projectFile.getUploadFile().getS3Url());
            return dto;
        }).collect(Collectors.toList());
    }

    public List<PassEvaluationResultDto> getPassEvalResultsByEvaluationProjectId(String projectId) {
        List<PassEvaluationResultEntity> entities = passEvaluationResultRepository.findByEvaluationProjectCriteriaProjectId(projectId);
        return entities.stream().map(PassEvaluationResultDto::new).collect(Collectors.toList());
    }

    public List<PassEvaluationResultDto> getPassEvalResultsByEvaluationProjectCriteriaId(String prjCrtId) {
        List<PassEvaluationResultEntity> entities = passEvaluationResultRepository.findByEvaluationProjectCriteriaId(prjCrtId);
        return entities.stream().map(PassEvaluationResultDto::new).collect(Collectors.toList());
    }

    public List<ScoreEvaluationResultDto> getScoreEvalResultsByEvaluationProjectId(String projectId) {
        List<ScoreEvaluationResultEntity> entities = scoreEvaluationResultRepository.findByEvaluationProjectCriteriaProjectId(projectId);
        return entities.stream().map(ScoreEvaluationResultDto::new).collect(Collectors.toList());
    }

    public List<TaggingResultDto> getTaggingResultsByEvaluationProjectId(String projectId) {
        List<TaggingResultEntity> entities = taggingResultRepository.findByEvaluationProjectCriteriaProjectId(projectId);
        return entities.stream().map(TaggingResultDto::new).collect(Collectors.toList());
    }

    public List<EvaluationProjectCriteriaDto> getCriteriaByProjectId(String projectId) {
        List<EvaluationProjectCriteriaEntity> entity = projectCriteriaRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        // created at으로 정렬 후 같은 데이터들은 criteria name으로 정렬
        return entity.stream().sorted(Comparator.comparing(EvaluationProjectCriteriaEntity::getCreatedAt).
                thenComparing(criteria->criteria.getCriteria().getName())).map(criteria -> {
            EvaluationProjectCriteriaDto dto = new EvaluationProjectCriteriaDto();
            dto.setId(criteria.getId());
            dto.setProjectId(criteria.getProject().getId());
            dto.setCriteriaId(criteria.getCriteria().getId());
            dto.setCriteriaName(criteria.getCriteria().getName()); // criteria entity 추가 후 이름으로 변경 필요
            dto.setState(criteria.getState());
            dto.setType(criteria.getType());
            dto.setTagColor(criteria.getTagColor());
            return dto;
        }).collect(Collectors.toList());
    }

    public EvaluationProjectDto saveProject(String userId, EvaluationProjectDto projectDto) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->  new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "User Not Found"));
        EvaluationProjectEntity newProject = getEvaluationProjectEntity(projectDto, user);
        EvaluationProjectEntity savedProject = evalProjectRepository.save(newProject);
        return new EvaluationProjectDto(savedProject);
    }

    @NotNull
    private static EvaluationProjectEntity getEvaluationProjectEntity(EvaluationProjectDto projectDto, UserEntity user) {
        EvaluationProjectEntity newProject = new EvaluationProjectEntity();
        newProject.setUser(user);
        newProject.setCreatedAt(projectDto.getCreatedAt());
        newProject.setOwner(user.getName());
        newProject.setName(projectDto.getName());
        newProject.setAnalysisDate(projectDto.getAnalysisDate());
        newProject.setDescription(projectDto.getDescription());
        newProject.setPassEvalEnabled(projectDto.isPassEvalEnabled());
        newProject.setScoreEvalEnabled(projectDto.isScoreEvalEnabled());
        newProject.setTaggingEnabled(projectDto.isTaggingEnabled());
        return newProject;
    }

    public ProjectFileDto saveProjectFile(ProjectFileDto fileDto) {
        ProjectFileEntity newFile = new ProjectFileEntity();
        newFile.setUploadFile(uploadFileRepository.getReferenceById(fileDto.getUploadFileId()));
        newFile.setEvaluationProject(evalProjectRepository.getReferenceById(fileDto.getProjectId()));
        ProjectFileEntity savedFile = projectFileRepository.save(newFile);
        return new ProjectFileDto(savedFile);
    }

    public EvaluationProjectCriteriaDto saveProjectCritaria(EvaluationProjectCriteriaDto crtDto) {
        EvaluationProjectCriteriaEntity newCrt = new EvaluationProjectCriteriaEntity();
        newCrt.setProject(evalProjectRepository.getReferenceById(crtDto.getProjectId()));
        newCrt.setCriteria(criteriaRepository.getReferenceById(crtDto.getCriteriaId()));
        newCrt.setState(crtDto.getState());
        newCrt.setCreatedAt(crtDto.getCreatedAt());
        newCrt.setType(crtDto.getType());
        newCrt.setTagColor(crtDto.getTagColor());
        EvaluationProjectCriteriaEntity savedCrt = projectCriteriaRepository.save(newCrt);
        return new EvaluationProjectCriteriaDto(savedCrt);
    }

    public void deleteProject(String projectId) {
        // 엔티티 존재 여부 확인
        if (!evalProjectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("프로젝트가 존재하지 않습니다.");
        }
        // 프로젝트 파일 삭제
        List<ProjectFileEntity> files = projectFileRepository.findByEvaluationProjectId(projectId);
        for(ProjectFileEntity deleteEntity : files) {
            projectFileRepository.deleteById(deleteEntity.getId());
        }
        // 프로젝트 조건 삭제

        List<EvaluationProjectCriteriaEntity> criterias = projectCriteriaRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        for(EvaluationProjectCriteriaEntity deleteEntity : criterias) {
            deleteProjectCriteria(deleteEntity.getId());
        }
        // 프로젝트 삭제
        evalProjectRepository.deleteById(projectId);
    }

    public void deleteProjectCriteria(String projectCriteriaId) {
        // 엔티티 존재 여부 확인
        if (!projectCriteriaRepository.existsById(projectCriteriaId)) {
            throw new IllegalArgumentException("프로젝트 연결 조건이 존재하지 않습니다.");
        }
        EvaluationProjectCriteriaEntity deleteCriteria = projectCriteriaRepository.findById(projectCriteriaId).orElseThrow(() -> new IllegalArgumentException("기준이 존재하지 않습니다."));;
        // 평가 결과 삭제
        if(deleteCriteria.getType() == CriteriaType.PASS) {
            deletePassEvalResultsByEvaluationProjectCriteriaId(deleteCriteria.getId());
        }else if(deleteCriteria.getType() == CriteriaType.SCORE) {
            deleteScoreEvalResultsByEvaluationProjectCriteriaId(deleteCriteria.getId());
        }else if(deleteCriteria.getType() == CriteriaType.TAGGING) {
            deleteTaggingResultsByEvaluationProjectCriteriaId(deleteCriteria.getId());
        }
        // 삭제
        projectCriteriaRepository.deleteById(projectCriteriaId);
    }

    public void deletePassEvalResultsByEvaluationProjectCriteriaId(String projectCriteriaId) {
        List<PassEvaluationResultEntity> deleteResults = passEvaluationResultRepository.findByEvaluationProjectCriteriaId(projectCriteriaId);

        for(PassEvaluationResultEntity entity : deleteResults) {
            passEvaluationResultRepository.deleteById(entity.getId());
        }
    }

    public void deleteScoreEvalResultsByEvaluationProjectCriteriaId(String projectCriteriaId) {
        List<ScoreEvaluationResultEntity> deleteResults = scoreEvaluationResultRepository.findByEvaluationProjectCriteriaId(projectCriteriaId);

        for(ScoreEvaluationResultEntity entity : deleteResults) {
            scoreEvaluationResultRepository.deleteById(entity.getId());
        }
    }

    public void deleteTaggingResultsByEvaluationProjectCriteriaId(String projectCriteriaId) {
        List<TaggingResultEntity> deleteResults = taggingResultRepository.findByEvaluationProjectCriteriaId(projectCriteriaId);

        for(TaggingResultEntity entity : deleteResults) {
            taggingResultRepository.deleteById(entity.getId());
        }
    }

    public void deleteEvaluationProjectFile(String projectId, String fileId) {
        List<ProjectFileEntity> entities = projectFileRepository.findByEvaluationProjectId(projectId);
        List<ProjectFileEntity> deleteEntities = entities.stream().filter(entity -> entity.getUploadFile().getId().equals(fileId)).toList();
        for(ProjectFileEntity deleteEntity : deleteEntities) {
            projectFileRepository.deleteById(deleteEntity.getId());
        }
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updateProjectCriteriaState(String prjCrtId, CriteriaState state) {
        EvaluationProjectCriteriaEntity prjCrtEntity =  projectCriteriaRepository.findById(prjCrtId).orElseThrow(() -> new IllegalArgumentException("프로젝트가 존재하지 않습니다."));
        prjCrtEntity.setState(state);
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updatePassEvalEnabled(String projectId, boolean passEvalEnabled) {
        EvaluationProjectEntity project = evalProjectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트가 존재하지 않습니다."));

        project.setPassEvalEnabled(passEvalEnabled); // 변경 감지
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updateScoreEvalEnabled(String projectId, boolean scoreEvalEnabled) {
        EvaluationProjectEntity project = evalProjectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트가 존재하지 않습니다."));

        project.setScoreEvalEnabled(scoreEvalEnabled); // 변경 감지
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updateTaggingEnabled(String projectId, boolean taggingEnabled) {
        EvaluationProjectEntity project = evalProjectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트가 존재하지 않습니다."));

        project.setTaggingEnabled(taggingEnabled); // 변경 감지
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updateProjectDescription(String projectId, String description) {
        EvaluationProjectEntity project = evalProjectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트가 존재하지 않습니다."));

        project.setDescription(description); // 변경 감지
    }

    @Transactional // JPA의 변경 감지를 위해 필요
    public void updateTagColor(String crtId, String color) {
        // 태그 색상 변경
        EvaluationProjectCriteriaEntity crt = projectCriteriaRepository.findById(crtId)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트 연결 조건이 존재하지 않습니다.\nID : " + crtId));
        crt.setTagColor(color);
        // 태깅 결과 색상 변경
        for(TaggingResultEntity result : taggingResultRepository.findByEvaluationProjectCriteriaId(crt.getId()))
        {
            result.setColor(color);
        }
    }
}
