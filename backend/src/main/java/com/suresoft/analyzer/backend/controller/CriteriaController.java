package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.analysis.*;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.entity.analysis.VariableEntity;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.analysis.CriteriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/criteria")
@RequiredArgsConstructor
public class CriteriaController {
    private final CriteriaService criteriaService;

    @GetMapping("/criterias")
    public ResponseEntity<ApiResponse<List<CriteriaDto>>> getAllCriteria() {
        List<CriteriaDto> criteria = criteriaService.getAllCriteria();
        return ResponseEntity.ok(ApiResponse.success("기준 목록 조회 성공", criteria));
    }

    @GetMapping("/my-criteria")
    public ResponseEntity<ApiResponse<List<TreeFolderNodeDto<CriteriaDto>>>> getMyCriteria(@AuthenticationPrincipal CustomUserDetails userDetails) {
        String userId = userDetails.getUserId();
        String username = userDetails.getUsername();
        List<TreeFolderNodeDto<CriteriaDto>> crts = criteriaService.getMyCriteria(userId);
        return ResponseEntity.ok(ApiResponse.success("내 기준 목록 조회 성공", crts));
    }

    @GetMapping("/criteria-by-userid")
    public ResponseEntity<ApiResponse<List<CriteriaDto>>> getAllCriteriaByUserId(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<CriteriaDto> criteria = criteriaService.getCriteriasByUserId(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("기준 목록 조회 성공", criteria));
    }

    @PostMapping("/save_criteria")
    public ResponseEntity<ApiResponse<CriteriaDto>> saveCriteria(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody CriteriaDto crtDto) {
        CriteriaDto savedCriteria = criteriaService.saveCriteria(userDetails.getUserId(), crtDto);
        return ResponseEntity.ok(ApiResponse.success("기준 저장 성공",savedCriteria));
    }

    @PostMapping("/update-criteria")
    public ResponseEntity<ApiResponse<Void>> updateCriteria(@RequestBody CriteriaDto crtDto) {
        try {
            criteriaService.updateCriteria(crtDto);
            return ResponseEntity.ok(ApiResponse.success("기준 내용 업데이트 성공",null));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage(), null));
        }
    }

    @PostMapping("/delete-criteria")
    public ResponseEntity<ApiResponse<Void>> deleteCriteria(@RequestParam String crtId) {
        try {
            criteriaService.deleteCriteria(crtId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "crtId : " + crtId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("기준 삭제 완료 : " + crtId, null));
    }

    @PostMapping("/save-variable")
    public ResponseEntity<ApiResponse<VariableDto>> saveVariable(@RequestBody SaveVariableRequest request) {
        VariableDto savedVariable = criteriaService.saveVariable(request.getCrtId(), request.getVariable());
        return ResponseEntity.ok(ApiResponse.success("변수 저장 성공",savedVariable));
    }

    @PostMapping("/save-script")
    public ResponseEntity<ApiResponse<CriteriaDto>> saveScript(@RequestBody SaveScriptRequest request) {
        CriteriaDto savedCriteria = criteriaService.saveScript(request.getCrtId(), request.getScript());
        return ResponseEntity.ok(ApiResponse.success("스크립트 저장 성공",savedCriteria));
    }

    @GetMapping("/get-script")
    public ResponseEntity<ApiResponse<String>> getScript(@RequestParam String crtId) {
        String script = criteriaService.getScript(crtId);
        return ResponseEntity.ok(ApiResponse.success("script 조회 성공", script));
    }

    @PostMapping("/save-query")
    public ResponseEntity<ApiResponse<CriteriaDto>> saveQuery(@RequestBody SaveQueryRequest request) {
        CriteriaDto savedCriteria = criteriaService.saveQuery(request.getCrtId(), request.getQuery());
        return ResponseEntity.ok(ApiResponse.success("쿼리 저장 성공",savedCriteria));
    }

    @GetMapping("/get-query")
    public ResponseEntity<ApiResponse<String>> getQuery(@RequestParam String crtId) {
        String query = criteriaService.getQuery(crtId);
        return ResponseEntity.ok(ApiResponse.success("script 조회 성공", query));
    }

    @PostMapping("/delete-variable")
    public ResponseEntity<ApiResponse<Void>> deleteCriteriaVariable(@RequestParam String variableId) {
        try {
            criteriaService.deleteCriteriaVariable(variableId);
        }catch (Exception e){
            return ResponseEntity.ok(ApiResponse.failure(e.getMessage() + "variableId : " + variableId, null));
        }
        return ResponseEntity.ok(ApiResponse.success("변수 삭제 완료 : " + variableId, null));
    }
}
