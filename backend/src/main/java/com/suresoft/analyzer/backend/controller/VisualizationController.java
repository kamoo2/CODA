package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.dto.visualization.request.*;
import com.suresoft.analyzer.backend.dto.visualization.response.*;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.visualization.VisualizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/visualization")
@RequiredArgsConstructor
public class VisualizationController {
    private final VisualizationService visualizationService;
    private final UploadFileRepository uploadFileRepository;
    private final UserRepository userRepository;

    /**
     *
     * @param dtos 시각화 RRD 파일 요청이 들어왔을 때, 해당 블루프린트세팅파일들로 만들어진 RRD 파일이 있는지 확인 (단, 팀구성원의 프로젝트에서 만들어진 RRD 파일인 경우에만 가능)
     * @return 있는지 없는지, 있다면 해당 프로젝트의 Id를 전달
     */
    @PostMapping("/blueprints/visualization-status")
    public ResponseEntity<ApiResponse<BlueprintVisualizationStatusResponseDto>> checkBlueprintVisualizationStatus(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody List<CreateProjectBlueprintSettingRequest> dtos){
        BlueprintVisualizationStatusResponseDto response = visualizationService.checkBlueprintVisualizationStatus(userDetails.getUserId(),dtos);

        return ResponseEntity.ok(ApiResponse.success("Check Blueprint Complete",response));
    }

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<String>> startVisualization(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody StartVisualizationRequestDto dto){
        String userId = userDetails.getUserId();
        String message = visualizationService.startVisualizationProcess(userId,dto.getProjectId(),dto.getBlueprints());

        return ResponseEntity.ok(ApiResponse.success("시각화 파일 처리 시작",message));
    }

    @GetMapping("/rrd-files")
    public ResponseEntity<ApiResponse<List<RRDFileResponseDto>>> getRRDFiles(@RequestParam String projectId) {

        List<RRDFileResponseDto> dtos = visualizationService.getRRDFilesByProjectId(projectId);
        return ResponseEntity.ok(ApiResponse.success("RRD 파일 리스트 조회 완료",dtos));
    }
    /**
     *
     * @param userDetails Request 요청 보낸 사용자 정보
     * @return 사용자의 팀 구성원들의 시각화 프로젝트 List
     */
    @GetMapping("/projects/my-team")
    public ResponseEntity<ApiResponse<List<TreeFolderNodeDto<SimpleVisualizationProjectResponseDto>>>> getTeamVisualizationProjects(@AuthenticationPrincipal CustomUserDetails userDetails) {
        UserEntity user = userRepository.findById(userDetails.getUserId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND,"Not Found User"));

        List<TreeFolderNodeDto<SimpleVisualizationProjectResponseDto>> projects = visualizationService.getTeamVisualizationProjects(user.getTeam().getId());

        return ResponseEntity.ok(ApiResponse.success("팀 전체 프로젝트 목록 조회 성공", projects));
    }

    /**
     *
     * @param userDetails Request 요청 보낸 사용자 정보
     * @return 사용자의 시각화 프로젝트 List
     */
    @GetMapping("/projects/my")
    public ResponseEntity<ApiResponse<List<SimpleVisualizationProjectResponseDto>>> getMyVisualizationProjects(@AuthenticationPrincipal CustomUserDetails userDetails) {
        String userId = userDetails.getUserId();
        // 토큰으로 현재 사용자 User Entity 가져오기
        // UserId를 이용해 프로젝트 가져오기
        List<SimpleVisualizationProjectResponseDto> projects = visualizationService.getMyVisualizationProjects(userId);
        return ResponseEntity.ok(ApiResponse.success("내 프로젝트 목록 조회 성공", projects));
    }

    /**
     *
     * @param id : 포로젝트 ID
     * @return 단일 프로젝트 조회
     */
    @GetMapping("/project/{id}")
    public ResponseEntity<ApiResponse<VisualizationProjectResponseDto>> getProjectId(@PathVariable String id) {
        VisualizationProjectResponseDto project = visualizationService.getProjectById(id);
        return ResponseEntity.ok(ApiResponse.success("프로젝트 조회 성공",project));
    }

    /**
     *
     * @param userDetails Request 요청 보낸 사용자 정보
     * @return 사용자의 시각화 프로젝트 생성
     */
    @PostMapping("/project")
    public ResponseEntity<ApiResponse<SimpleVisualizationProjectResponseDto>> createProject(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody CreateVisualizationProjectRequestDto dto) {
        SimpleVisualizationProjectResponseDto project = visualizationService.createProject(userDetails.getUserId(),dto);
        return ResponseEntity.ok(ApiResponse.success("프로젝트 생성 완료",project));
    }

    /**
     *
     * @param userDetails Request 요청 보낸 사용자 정보
     * @param projectId 프로젝트 ID
     * @param dto 프로젝트 이름 변경값
     * @return 수정된 프로젝트
     */
    @PatchMapping("/project/{projectId}/name")
    public ResponseEntity<ApiResponse<SimpleVisualizationProjectResponseDto>> updateProjectByName(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable String projectId, @RequestBody UpdateNameRequestDto dto) {
        SimpleVisualizationProjectResponseDto project = visualizationService.updateProjectName(userDetails.getUserId(),projectId,dto.getName());
        return ResponseEntity.ok(ApiResponse.success("프로젝트 수정 완료",project));
    }

    @DeleteMapping("/project/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable String id) {
        visualizationService.deleteProjectById(userDetails.getUserId(),id);

        return ResponseEntity.ok(ApiResponse.success("프로젝트 삭제 완료",null));
    }

    @DeleteMapping("/projects")
    public ResponseEntity<ApiResponse<Void>> deleteProjects(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody List<String> projectIds) {
        visualizationService.deleteProjects(userDetails.getUserId(),projectIds);
        return ResponseEntity.ok(ApiResponse.success("프로젝트들 삭제 완료",null));
    }
}
