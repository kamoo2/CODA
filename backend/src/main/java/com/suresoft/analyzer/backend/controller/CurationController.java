package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.analysis.*;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationProjectCriteriaDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationResultDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationProjectDto;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.dto.visualization.request.UpdateNameRequestDto;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.analysis.CurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/curation")
@RequiredArgsConstructor
public class CurationController {
    private final CurationService curationService;

    @GetMapping("/projects")
    public ResponseEntity<ApiResponse<List<CurationProjectDto>>> getAllProjects() {
        List<CurationProjectDto> projects = curationService.getAllProjects();
        return ResponseEntity.ok(ApiResponse.success("프로젝트 목록 조회 성공",projects));
    }

    /**
     *
     * @param userDetails Request 요청 보낸 사용자 정보
     * @return 사용자의 시각화 프로젝트 List
     */
    @GetMapping("/projects/my")
    public ResponseEntity<ApiResponse<List<TreeFolderNodeDto<CurationProjectDto>>>> getMyEvaluationProjects(@AuthenticationPrincipal CustomUserDetails userDetails) {
        String userId = userDetails.getUserId();
        String username = userDetails.getUsername();
        // 토큰으로 현재 사용자 User Entity 가져오기
        // UserId를 이용해 프로젝트 가져오기
        List<TreeFolderNodeDto<CurationProjectDto>> projects = curationService.getMyEvaluationProjects(userId);
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
    public ResponseEntity<ApiResponse<CurationProjectDto>> updateProjectByName(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable String projectId, @RequestBody UpdateNameRequestDto dto) {
        CurationProjectDto project = curationService.updateProjectName(userDetails.getUserId(),projectId,dto.getName());
        return ResponseEntity.ok(ApiResponse.success("프로젝트 수정 완료",project));
    }

    @GetMapping("/projects_by_userid")
    public ResponseEntity<ApiResponse<List<CurationProjectDto>>> getProjectsByUserId(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<CurationProjectDto> projects = curationService.getProjectsByUserId(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("프로젝트 목록 조회 성공",projects));
    }

    @PostMapping("/save_project")
    public ResponseEntity<ApiResponse<CurationProjectDto>> saveProject(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody CurationProjectDto projectDto) {
        CurationProjectDto savedProject = curationService.saveProject(userDetails.getUserId(), projectDto);
        return ResponseEntity.ok(ApiResponse.success("프로젝트 저장 성공",savedProject));
    }

    @PostMapping("/delete_project")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@RequestParam String projectId) {
        try {
            curationService.deleteProject(projectId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "project id : " + projectId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("프로젝트 삭제 완료 : " + projectId, null));
    }

    @PostMapping("/updateProjectDescription")
    public ResponseEntity<ApiResponse<Void>> updateProjectDescription(@RequestBody UpdateStringValueByIdRequest request) {
        try {
            curationService.updateProjectDescription(request.getId(), request.getValue());
            return ResponseEntity.ok(ApiResponse.success("프로젝트 설명 업데이트 완료", null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }

    @GetMapping("/project_file_by_projectId")
    public ResponseEntity<ApiResponse<List<ProjectFileDto>>> getEvalProjectFiles(@RequestParam String projectId) {
        List<ProjectFileDto> files = curationService.getProjectFilesByProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("프로젝트 파일 목록 조회 성공",files));
    }

    @PostMapping("/save_project_file")
    public ResponseEntity<ApiResponse<ProjectFileDto>> saveEvalProjectFile(@RequestBody ProjectFileDto fileDto) {
        ProjectFileDto savedFile = curationService.saveProjectFile(fileDto);
        return ResponseEntity.ok(ApiResponse.success(" 저장 성공",savedFile));
    }

    @PostMapping("/delete_project_file")
    public ResponseEntity<ApiResponse<Void>> deleteProjectFile(@RequestBody DeleteProjectFileRequest request) {
        try {
            curationService.deleteProjectFile(request.getProjectId(), request.getFileId());
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "project id : " + request.getProjectId()
                    + "\nfile id : " + request.getFileId() , null));
        }
        return ResponseEntity.ok(ApiResponse.success("프로젝트 파일 삭제 완료\n project id: " + request.getProjectId()
                + "\nfile id : " + request.getFileId() , null));
    }

    @PostMapping("/updateProjectCriteriaState")
    public ResponseEntity<ApiResponse<Void>> updateProjectCriteriaState(@RequestBody UpdateProjectCriteriaStateRequest request) {
        try {
            curationService.updateProjectCriteriaState(request.getId(), request.getState());
            return ResponseEntity.ok(ApiResponse.success("프로젝트 연결 조건 상태 업데이트 완료 : " + request.getId(), null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }

    @GetMapping("/criterias")
    public ResponseEntity<ApiResponse<List<CurationProjectCriteriaDto>>> getPassEvalCriterias(@RequestParam String projectId) {
        List<CurationProjectCriteriaDto> criterias = curationService.getCriteriaByProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("curation 기준 조회 성공",criterias));
    }

    @GetMapping("/curation_results_by_projectId")
    public ResponseEntity<ApiResponse<List<CurationResultDto>>> getCurationResultsByProjectId(@RequestParam String projectId) {

        List<CurationResultDto> results = curationService.getCurationResultsByProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("curation 결과 조회 성공\nproject id:"+projectId,results));
    }

    @PostMapping("/save_project_criteria")
    public ResponseEntity<ApiResponse<CurationProjectCriteriaDto>> saveProjectCriteria(@RequestBody CurationProjectCriteriaDto crtDto) {
        CurationProjectCriteriaDto savedDto = curationService.saveProjectCriteria(crtDto);
        return ResponseEntity.ok(ApiResponse.success(" 저장 성공",savedDto));
    }


    @PostMapping("/delete_curation_results_by_prjCrtId")
    public ResponseEntity<ApiResponse<Void>> deleteCurationResultsByProjectCriteriaId(@RequestParam String projectCriteriaId) {
        try {
            curationService.deleteCurationResultsByProjectCriteriaId(projectCriteriaId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "projectCriteriaId : " + projectCriteriaId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("curation results 삭제 완료 prj crt id : " + projectCriteriaId, null));
    }

    @PostMapping("/delete_project_criteria")
    public ResponseEntity<ApiResponse<Void>> deleteProjectCriteria(@RequestParam String projectCriteriaId) {
        try {
            curationService.deleteProjectCriteria(projectCriteriaId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "projectCriteriaId : " + projectCriteriaId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("큐레이션 프로젝트 연결 조건 삭제 완료 : " + projectCriteriaId, null));
    }

}
