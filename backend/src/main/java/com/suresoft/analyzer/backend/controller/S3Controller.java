package com.suresoft.analyzer.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.suresoft.analyzer.backend.dto.AwsCredentialsRequest;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.dto.storage.BucketDto;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.entity.storage.BucketEntity;
import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.storage.S3Service;
import com.suresoft.analyzer.backend.service.auth.AuthService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/s3")
public class S3Controller {
    private final S3Service s3Service;
    private final AuthService authService ;
    private final UserRepository userRepository;
    private final UploadFileRepository uploadFileRepository;

    public S3Controller(S3Service s3Service, AuthService authService, UserRepository userRepository, UploadFileRepository uploadFileRepository) {
        this.s3Service = s3Service;
        this.authService = authService;
        this.userRepository = userRepository;
        this.uploadFileRepository = uploadFileRepository;
    }

    /**
     * AWS Credentials 설정 (Access Key & Secret Key)
     */
    @PostMapping("/set-credentials")
    public ResponseEntity<ApiResponse<Void>> setAwsCredentials(@RequestBody AwsCredentialsRequest credentials,@AuthenticationPrincipal CustomUserDetails userDetails) {
        // 현재 사용자의 ID 가져오기
        UserEntity currentUser = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        // AWS 자격 증명 설정
        s3Service.setAwsCredentials(credentials.getAccessKey(), credentials.getSecretKey(), credentials.getRegion(), credentials.getName(), currentUser, false);

        return ResponseEntity.ok(ApiResponse.success("AWS Credentials 인증 성공", null));
    }

    /**
     * 버킷 삭제
     */
    @DeleteMapping("/delete-bucket")
    public ResponseEntity<ApiResponse<Void>> deleteBucket(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam String bucketId
    ) {
        UserEntity user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        BucketEntity bucket = s3Service.findBucketOrThrow(bucketId);

        if (!bucket.getUser().getId().equals(user.getId())) {
            throw new SecurityException("해당 버킷을 삭제할 권한이 없습니다.");
        }


        try {
            s3Service.deleteBucketFromDb(bucketId);
            return ResponseEntity.ok(ApiResponse.success("버킷 삭제 성공", null));
        } catch (DataIntegrityViolationException e) {
            String message = "버킷 삭제 실패: 관련된 데이터가 존재합니다.";

            Throwable rootCause = e.getRootCause(); // 깊은 원인 추적
            if (rootCause != null) {
                String rootMsg = rootCause.getMessage();

                // 예: foreign key 제약조건 이름에 따라 메시지 분기
                if (rootMsg.contains("upload_file")) {
                    message = "해당 버킷의 업로드 파일이 존재하여 해제할 수 없습니다.";
                } else if (rootMsg.contains("app_user")) {
                    message = "현재 사용중인 버킷은 해제할 수 없습니다. ";
                }
                // 필요 시 추가
            }

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.failure(message, ErrorCode.FILE_IN_USE.toString()));
        }
    }



    /**
     * AWS Credentials 검증
     */
    @PostMapping("/check-credentials")
    public ResponseEntity<ApiResponse<Void>> checkAwsCredentials(@RequestBody AwsCredentialsRequest credentials) {
        s3Service.validateAndDetectRegion(credentials.getAccessKey(), credentials.getSecretKey());
        return ResponseEntity.ok(ApiResponse.success("AWS Credentials 인증 성공", null));
    }


    @PostMapping("/buckets-list")
    public ResponseEntity<ApiResponse<List<String>>> getBucketNames(@RequestBody AwsCredentialsRequest credentials) {
        List<String> bucketNames = s3Service.getBucketNameList(
                credentials.getAccessKey(),
                credentials.getSecretKey(),
                credentials.getRegion()
        );

        return ResponseEntity.ok(ApiResponse.success("버킷 목록 조회 성공", bucketNames));
    }

    @GetMapping("/my-buckets")
    public ResponseEntity<ApiResponse<List<BucketDto>>> getMyBuckets(@AuthenticationPrincipal CustomUserDetails userDetails) {
        UserEntity user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        List<BucketDto> buckets = s3Service.getUserBuckets(user);
        return ResponseEntity.ok(ApiResponse.success("저장된 버킷 목록 조회 성공", buckets));
    }

    @GetMapping("/get-my-bucket-details")
    public ResponseEntity<ApiResponse<BucketDto>> getBucketDetails(
            @RequestParam String bucketId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        UserEntity user = userRepository.findById(userDetails.getUserId())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        // 버킷 ID를 기준으로 디테일을 가져옵니다
        BucketDto bucketDetail = s3Service.getBucketDetailById(user, bucketId);
        return ResponseEntity.ok(ApiResponse.success("버킷 디테일 조회 성공", bucketDetail));
    }


    /**
     * 특정 버킷의 폴더(디렉토리) 목록 조회
     */
    @GetMapping("/get-bucket-folder-tree")
    public ResponseEntity<ApiResponse<List<TreeFolderNodeDto>>> getFolderTree(
            @RequestParam String bucketName,
            @RequestParam(required = false, defaultValue = "") String prefix
    ) throws Exception {
        List<TreeFolderNodeDto> tree = s3Service.extractFoldersOnly(bucketName, prefix);
        return ResponseEntity.ok(ApiResponse.success("폴더 트리 조회 성공", tree));
    }



    @GetMapping("/get-bucket-objects")
    public ResponseEntity<ApiResponse<Object>> getBucketObjects(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                                @RequestParam String bucketName,
                                                                @RequestParam(required = false, defaultValue = "") String prefix) throws Exception {

        UserEntity user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        Object res = new ObjectMapper().readValue(s3Service.getBucketAndObjectsInfoAsJson(bucketName, prefix), Object.class);

        return ResponseEntity.ok(ApiResponse.success("폴더 트리 조회 성공", res));
    }

    @PutMapping("/set-currentUsed-bucket/{bucketId}")
    public ResponseEntity<ApiResponse<Void>> assignBucket(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String bucketId
    ) {
        s3Service.assignBucketToUser(userDetails.getUserId(), bucketId);
        return ResponseEntity.ok(ApiResponse.success("버킷 등록 성공", null));
    }



    @PostMapping("/upload-status/batch")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkUploadedBatch(@RequestBody List<String> s3Keys) {
        // 업로드된 파일의 S3 URL 목록을 Set으로 변환
        Set<String> uploadedSet = uploadFileRepository.findByS3UrlIn(s3Keys)
                .stream()
                .map(UploadFileEntity::getS3Url)
                .collect(Collectors.toSet());

        // 요청된 키와 업로드 상태를 매핑하여 Map으로 반환
        Map<String, Boolean> result = new HashMap<>();
        for (String key : s3Keys) {
            result.put(key, uploadedSet.contains(key));
        }
        return ResponseEntity.ok(ApiResponse.success("확인", result));
    }


    @GetMapping("/bucket-usage")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBucketUsage(
            @RequestParam String bucketName,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        s3Service.initializeS3Client(bucketName);

        long usedSize = s3Service.calculateTotalSize(bucketName);

        Map<String, Object> result = new HashMap<>();
        result.put("usedSize", usedSize); // byte 단위

        return ResponseEntity.ok(ApiResponse.success("버킷 사용량 조회 성공", result));
    }

    @GetMapping("/get-files-under-folder")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFilesUnderFolder(
            @RequestParam String bucketName,
            @RequestParam(required = false, defaultValue = "") String prefix
    ) throws Exception {
        List<Map<String, Object>> files = s3Service.getAllFilesUnderFolder(bucketName, prefix);
        return ResponseEntity.ok(ApiResponse.success("폴더 내 파일 조회 성공", files));
    }


}