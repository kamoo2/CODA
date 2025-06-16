package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.analysis.*;
import com.suresoft.analyzer.backend.dto.analysis.evaluation.*;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.dto.visualization.request.UpdateNameRequestDto;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaType;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.analysis.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/evaluation")
@RequiredArgsConstructor
public class EvaluationController {
    private final EvaluationService evaluationService;
    /**
     *
     * @param userDetails Request 요청 보낸 사용자 정보
     * @return 사용자의 시각화 프로젝트 List
     */
    @GetMapping("/projects/my")
    public ResponseEntity<ApiResponse<List<TreeFolderNodeDto<EvaluationProjectDto>>>> getMyEvaluationProjects(@AuthenticationPrincipal CustomUserDetails userDetails) {
        String userId = userDetails.getUserId();
        String username = userDetails.getUsername();
        // 토큰으로 현재 사용자 User Entity 가져오기
        // UserId를 이용해 프로젝트 가져오기
        List<TreeFolderNodeDto<EvaluationProjectDto>> projects = evaluationService.getMyEvaluationProjects(userId);
        return ResponseEntity.ok(ApiResponse.success("내 프로젝트 목록 조회 성공", projects));
    }

    /**
     *
     * @param userDetails Request 요청 보낸 사용자 정보
     * @param projectId 프로젝트 ID
     * @param dto 프로젝트 이름 변경값
     * @return 수정된 프로젝트
     */
    @PatchMapping("/project/{projectId}/name")
    public ResponseEntity<ApiResponse<EvaluationProjectDto>> updateProjectByName(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable String projectId, @RequestBody UpdateNameRequestDto dto) {
        EvaluationProjectDto project = evaluationService.updateProjectName(userDetails.getUserId(),projectId,dto.getName());
        return ResponseEntity.ok(ApiResponse.success("프로젝트 수정 완료",project));
    }

    @GetMapping("/projects")
    public ResponseEntity<ApiResponse<List<EvaluationProjectDto>>> getAllProjects() {
        List<EvaluationProjectDto> projects = evaluationService.getAllProjects();
        return ResponseEntity.ok(ApiResponse.success("프로젝트 목록 조회 성공",projects));
    }

    @GetMapping("/projects_by_userid")
    public ResponseEntity<ApiResponse<List<EvaluationProjectDto>>> getProjectsByUserId(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<EvaluationProjectDto> projects = evaluationService.getProjectsByUserId(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("프로젝트 목록 조회 성공",projects));
    }

    @GetMapping("/project_file_by_projectId")
    public ResponseEntity<ApiResponse<List<ProjectFileDto>>> getEvalProjectFiles(@RequestParam String projectId) {
        List<ProjectFileDto> files = evaluationService.getEvalProjectFilesByProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("프로젝트 파일 목록 조회 성공",files));
    }

    @GetMapping("/pass_eval_results_by_projectId")
    public ResponseEntity<ApiResponse<List<PassEvaluationResultDto>>> getPassEvalResultsByProjectId(@RequestParam String projectId) {

        List<PassEvaluationResultDto> results = evaluationService.getPassEvalResultsByEvaluationProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("합불 조건 결과 조회 성공\nproject id:"+projectId,results));
    }

    @GetMapping("/pass_eval_results_by_criteriaId")
    public ResponseEntity<ApiResponse<List<PassEvaluationResultDto>>> getPassEvalResultsByEvaluationProjectCriteriaId(@RequestParam String criteriaId) {

        List<PassEvaluationResultDto> results = evaluationService.getPassEvalResultsByEvaluationProjectCriteriaId(criteriaId);
        return ResponseEntity.ok(ApiResponse.success("합불 조건 결과 조회 성공\nproject criteria id:"+criteriaId,results));
    }

    @GetMapping("/score_eval_results_by_projectId")
    public ResponseEntity<ApiResponse<List<ScoreEvaluationResultDto>>> getScoreEvalResultsByProjectId(@RequestParam String projectId) {

        List<ScoreEvaluationResultDto> results = evaluationService.getScoreEvalResultsByEvaluationProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("점수 조건 결과 조회 성공\nproject id:"+projectId,results));
    }

    @GetMapping("/tagging_results_by_projectId")
    public ResponseEntity<ApiResponse<List<TaggingResultDto>>> getTaggingResultsByProjectId(@RequestParam String projectId) {

        List<TaggingResultDto> results = evaluationService.getTaggingResultsByEvaluationProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("태깅 결과 조회 성공\nproject id:"+projectId,results));
    }

    @PostMapping("/save_project")
    public ResponseEntity<ApiResponse<EvaluationProjectDto>> saveProject(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody EvaluationProjectDto projectDto) {
        EvaluationProjectDto savedProject = evaluationService.saveProject(userDetails.getUserId(), projectDto);
        return ResponseEntity.ok(ApiResponse.success("프로젝트 저장 성공",savedProject));
    }

    @PostMapping("/save_project_file")
    public ResponseEntity<ApiResponse<ProjectFileDto>> saveProjectFile(@RequestBody ProjectFileDto fileDto) {
        ProjectFileDto savedFile = evaluationService.saveProjectFile(fileDto);
        return ResponseEntity.ok(ApiResponse.success(" 저장 성공",savedFile));
    }

    @PostMapping("/save_project_criteria")
    public ResponseEntity<ApiResponse<EvaluationProjectCriteriaDto>> saveProjectCritaria(@RequestBody EvaluationProjectCriteriaDto crtDto) {
        EvaluationProjectCriteriaDto savedDto = evaluationService.saveProjectCritaria(crtDto);
        return ResponseEntity.ok(ApiResponse.success(" 저장 성공",savedDto));
    }

    @PostMapping("/delete_project_file")
    public ResponseEntity<ApiResponse<Void>> deleteProjectFile(@RequestBody DeleteProjectFileRequest request) {
        try {
            evaluationService.deleteEvaluationProjectFile(request.getProjectId(), request.getFileId());
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "project id : " + request.getProjectId()
                    + "\nfile id : " + request.getFileId() , null));
        }
        return ResponseEntity.ok(ApiResponse.success("프로젝트 파일 삭제 완료\n project id: " + request.getProjectId()
                + "\nfile id : " + request.getFileId() , null));
    }

    @PostMapping("/delete_project")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@RequestParam String projectId) {
        try {
            evaluationService.deleteProject(projectId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "project id : " + projectId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("프로젝트 삭제 완료 : " + projectId, null));
    }


    @PostMapping("/delete_project_criteria")
    public ResponseEntity<ApiResponse<Void>> deleteProjectCriteria(@RequestParam String projectCriteriaId) {
        try {
            evaluationService.deleteProjectCriteria(projectCriteriaId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "projectCriteriaId : " + projectCriteriaId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("프로젝트 연결 조건 삭제 완료 : " + projectCriteriaId, null));
    }

    @PostMapping("/delete_pass_eval_results_by_prjCrtId")
    public ResponseEntity<ApiResponse<Void>> deletePassEvalResultsByEvaluationProjectCriteriaId(@RequestParam String projectCriteriaId) {
        try {
            evaluationService.deletePassEvalResultsByEvaluationProjectCriteriaId(projectCriteriaId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "projectCriteriaId : " + projectCriteriaId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("pass results 삭제 완료 prj crt id : " + projectCriteriaId, null));
    }

    @PostMapping("/delete_score_eval_results_by_prjCrtId")
    public ResponseEntity<ApiResponse<Void>> deleteScoreEvalResultsByEvaluationProjectCriteriaId(@RequestParam String projectCriteriaId) {
        try {
            evaluationService.deleteScoreEvalResultsByEvaluationProjectCriteriaId(projectCriteriaId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "projectCriteriaId : " + projectCriteriaId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("score results 삭제 완료 prj crt id : " + projectCriteriaId, null));
    }

    @PostMapping("/delete_tagging_results_by_prjCrtId")
    public ResponseEntity<ApiResponse<Void>> deleteTaggingResultsByEvaluationProjectCriteriaId(@RequestParam String projectCriteriaId) {
        try {
            evaluationService.deleteTaggingResultsByEvaluationProjectCriteriaId(projectCriteriaId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "projectCriteriaId : " + projectCriteriaId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("tagging results 삭제 완료 prj crt id : " + projectCriteriaId, null));
    }

    @PostMapping("/updateProjectCriteriaState")
    public ResponseEntity<ApiResponse<Void>> updateProjectCriteriaState(@RequestBody UpdateProjectCriteriaStateRequest request) {
        try {
            evaluationService.updateProjectCriteriaState(request.getId(), request.getState());
            return ResponseEntity.ok(ApiResponse.success("프로젝트 연결 조건 상태 업데이트 완료 : " + request.getId(), null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }

    @PostMapping("/updatePassEvalEnabled")
    public ResponseEntity<ApiResponse<Void>> updatePassEvalEnabled(@RequestBody UpdateBooleanValueByIdRequest request) {
        try {
            evaluationService.updatePassEvalEnabled(request.getId(), request.isValue());
            return ResponseEntity.ok(ApiResponse.success("합격 평가 여부 업데이트 완료", null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }

    @PostMapping("/updateScoreEvalEnabled")
    public ResponseEntity<ApiResponse<Void>> updateScoreEvalEnabled(@RequestBody UpdateBooleanValueByIdRequest request) {
        try {
            evaluationService.updateScoreEvalEnabled(request.getId(), request.isValue());
            return ResponseEntity.ok(ApiResponse.success("점수 산정 여부 업데이트 완료", null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }
    @PostMapping("/updateTaggingEnabled")
    public ResponseEntity<ApiResponse<Void>> updateTaggingEnabled(@RequestBody UpdateBooleanValueByIdRequest request) {
        try {
            evaluationService.updateTaggingEnabled(request.getId(), request.isValue());
            return ResponseEntity.ok(ApiResponse.success("태깅 여부 업데이트 완료", null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }
    @PostMapping("/updateEvalProjectDescription")
    public ResponseEntity<ApiResponse<Void>> updateEvalProjectDescription(@RequestBody UpdateStringValueByIdRequest request) {
        try {
            evaluationService.updateProjectDescription(request.getId(), request.getValue());
            return ResponseEntity.ok(ApiResponse.success("프로젝트 설명 업데이트 완료", null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }

    @PostMapping("/updateTagColor")
    public ResponseEntity<ApiResponse<Void>> updateTagColor(@RequestBody UpdateStringValueByIdRequest request) {
        try {
            evaluationService.updateTagColor(request.getId(), request.getValue());
            return ResponseEntity.ok(ApiResponse.success("태그 색상 업데이트 완료 : " + request.getId(), null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }

    @GetMapping("/pass_eval_criterias")
    public ResponseEntity<ApiResponse<List<EvaluationProjectCriteriaDto>>> getPassEvalCriterias(@RequestParam String projectId) {
        List<EvaluationProjectCriteriaDto> criterias = evaluationService.getCriteriaByProjectId(projectId);
        List<EvaluationProjectCriteriaDto> passEvalCriterias = criterias.stream().filter(crt -> crt.getType()==CriteriaType.PASS).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("pass 기준 조회 성공",passEvalCriterias));
    }
    @GetMapping("/score_eval_criterias")
    public ResponseEntity<ApiResponse<List<EvaluationProjectCriteriaDto>>> getScoreEvalCriterias(@RequestParam String projectId) {
        List<EvaluationProjectCriteriaDto> criterias = evaluationService.getCriteriaByProjectId(projectId);
        List<EvaluationProjectCriteriaDto> passEvalCriterias = criterias.stream().filter(crt -> crt.getType()==CriteriaType.SCORE).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("score 기준 조회 성공",passEvalCriterias));
    }
    @GetMapping("/tagging_criterias")
    public ResponseEntity<ApiResponse<List<EvaluationProjectCriteriaDto>>> getTaggingCriterias(@RequestParam String projectId) {
        List<EvaluationProjectCriteriaDto> criterias = evaluationService.getCriteriaByProjectId(projectId);
        List<EvaluationProjectCriteriaDto> passEvalCriterias = criterias.stream().filter(crt -> crt.getType()==CriteriaType.TAGGING).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("tagging 기준 조회 성공",passEvalCriterias));
    }
}
