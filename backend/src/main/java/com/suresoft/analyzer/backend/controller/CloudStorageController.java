package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.storage.DeleteUploadFilesResultDto;
import com.suresoft.analyzer.backend.dto.storage.UploadFileDto;
import com.suresoft.analyzer.backend.dto.storage.UploadFileUsageDto;
import com.suresoft.analyzer.backend.dto.storage.request.UploadFileCreateRequest;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class CloudStorageController {
    private final StorageService storageService;

    @GetMapping("/upload-files/me")
    public ResponseEntity<ApiResponse<List<UploadFileDto>>> getUploadFilesByUserId(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<UploadFileDto> files = storageService.getAllUploadFilesByUserId(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("업로드파일 목록 조회 성공",files));
    }

    @GetMapping("/upload-file")
    public ResponseEntity<ApiResponse<UploadFileDto>> getUploadFile(@RequestParam String id) {
        UploadFileDto file = storageService.getById(id);
        return ResponseEntity.ok(ApiResponse.success("업로드 파일 조회 성공",file));
    }

    @PostMapping("/upload-files")
    public ResponseEntity<ApiResponse<String>> createUploadFile(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody UploadFileCreateRequest dto) {
        String uploadFileId = storageService.createUploadFile(dto); // 파일 생성만

        // 생성된 파일의 시간을 구하는 로직을 비동기로 실행하고 파일 total time 업데이트 하는 메서드
        return ResponseEntity.ok(ApiResponse.success("업로드 파일 생성 성공", uploadFileId));
    }

    @PatchMapping("/upload-file/{id}")
    public ResponseEntity<ApiResponse<Void>> updateUploadFile(
            @PathVariable String id,
            @RequestParam(required = false) Optional<String> parserId,
            @RequestParam(required = false) Optional<String> dbcFileId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        storageService.updateUploadFile(
                id,
                parserId.orElse(null),
                dbcFileId.orElse(null),
                userDetails.getUserId()
        );

        return ResponseEntity.ok(ApiResponse.success("업로드 파일 수정 성공", null));
    }

    @PostMapping("/upload-files/batch")
    public ResponseEntity<ApiResponse<List<String>>> batchCreateUploadFiles(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody List<UploadFileCreateRequest> dtoList
    ) {

        List<String> createdIds = storageService.createUploadFiles(dtoList, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("업로드 파일 일괄 생성 성공", createdIds));
    }


    @PostMapping("/delete-upload-files")
    public ResponseEntity<ApiResponse<DeleteUploadFilesResultDto>> deleteUploadFiles(
            @RequestBody List<String> fileIds,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DeleteUploadFilesResultDto result = storageService.deleteUploadFiles(fileIds, userDetails.getUserId());

        if (!result.getSkipped().isEmpty()) {
            return ResponseEntity.ok(
                    ApiResponse.partialSuccess("일부 파일은 사용 중이라 삭제되지 않았습니다.", result)
            );
        }

        return ResponseEntity.ok(ApiResponse.success("모든 파일이 삭제되었습니다.", result));
    }



    @GetMapping("/{uploadFileId}/usage")
    public ResponseEntity<UploadFileUsageDto> getUploadFileUsage(@PathVariable String uploadFileId) {
        UploadFileUsageDto usageDto = storageService.getUploadFileUsage(uploadFileId);
        return ResponseEntity.ok(usageDto);
    }
}
