package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.system.response.FileExtensionResponseDto;
import com.suresoft.analyzer.backend.dto.system.response.ParserResponseDto;
import com.suresoft.analyzer.backend.dto.visualization.response.DbcMessageDto;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.system.SystemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemController {
    private final SystemService systemService;
    @GetMapping("/extension")
    public ResponseEntity<ApiResponse<List<FileExtensionResponseDto>>> getSupportedFileExtensions(@AuthenticationPrincipal CustomUserDetails userDetails) {

        return ResponseEntity.ok(ApiResponse.success("확장자 목록 조회 성공",systemService.getFileExtensions()));
    }

    @GetMapping("/parser")
    public ResponseEntity<ApiResponse<List<ParserResponseDto>>> getSupportedParser(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("파서 목록 조회 성공",systemService.getParsers()));
    }

    @GetMapping("/extension/{id}/parser")
    public ResponseEntity<ApiResponse<List<ParserResponseDto>>> getSupportedFileParsersByExtId(@PathVariable("id") String id) {
        return ResponseEntity.ok(ApiResponse.success("특정 확장자의 파서 목록 조회 성공",systemService.getParsersByExtId(id)));
    }

    @PostMapping("/dbc/{id}/parsing")
    public ResponseEntity<ApiResponse<List<DbcMessageDto>>> parsingDbcFile(@AuthenticationPrincipal CustomUserDetails userDetails, @PathVariable String id) {
        // Parsing DBC
        List<DbcMessageDto> result = systemService.parsingDbcFile(userDetails.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.success("파싱 완료",result));
    }
}
