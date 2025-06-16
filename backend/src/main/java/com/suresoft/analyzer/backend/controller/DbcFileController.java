package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.config.EnvProperties;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.storage.DbcFileDto;
import com.suresoft.analyzer.backend.entity.storage.DbcFileEntity;
import com.suresoft.analyzer.backend.service.storage.DbcFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dbc")
public class DbcFileController {
    private final EnvProperties env;
    private final DbcFileService dbcFileService;


    //  1. DBC 메타데이터를 DB에 저장
    @PostMapping("/upload-db")
    public ResponseEntity<ApiResponse<DbcFileDto>> uploadDbcFileToDB(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        DbcFileEntity saved = dbcFileService.saveIfNotExists(name);
        DbcFileDto dto = new DbcFileDto(saved.getId(), saved.getName(), saved.getCreatedAt());
        return ResponseEntity.ok(ApiResponse.success("DBC 저장 완료", dto));
    }



    //  2. 실제 DBC 파일을 nginx에 저장
    @PostMapping("/upload-cloud")
    public ResponseEntity<ApiResponse<String>> uploadDbcFileToNginx(
            @RequestParam("file") MultipartFile file,
            @RequestParam("userId") String userId
    ) {
        try {
            String uploadDir =  env.getPath() + "/dbc/" + userId;
            File userDir = new File(uploadDir);
            if (!userDir.exists()) userDir.mkdirs();

            // 사용자 디렉토리에 파일 저장
            File saveFile = new File(userDir, file.getOriginalFilename());
            file.transferTo(saveFile);

            return ResponseEntity.ok(ApiResponse.success("업로드 성공", env.getPath() + "/dbc/" + userId + "/" + file.getOriginalFilename()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.failure("업로드 실패: " + e.getMessage(), null));
        }
    }


    //  3. nginx에 저장된 DBC 목록 조회
    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<String>>> listDbcFiles() {
        String uploadDir =  env.getPath() + "/dbc-files";
        File dir = new File(uploadDir);
        String[] files = dir.list((d, name) -> name.toLowerCase().endsWith(".dbc"));

        return ResponseEntity.ok(ApiResponse.success("목록 조회 성공", Arrays.asList(files)));
    }

    //  4. DB에 저장된 DBC 목록 조회
    @GetMapping("/map")
    public ApiResponse<List<DbcFileDto>> getAllDbcFiles() {
        List<DbcFileDto> result = dbcFileService.getAllDbcFiles();
        return ApiResponse.success("목록 조회 성공", result);
    }

    // 5. DBC 파일 삭제 (DB, nginx 에서 삭제)
    @PostMapping("/delete-dbc-files-batch")
    public ResponseEntity<ApiResponse<Void>> deleteDbcFilesBatch(@RequestBody Map<String, List<String>> body, @RequestParam("userId") String userId) {
        List<String> ids = body.get("ids");
        try {
            dbcFileService.deleteMultipleDbcFiles(ids, userId);
            return ResponseEntity.ok(ApiResponse.success("삭제 성공", null));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(ApiResponse.failure("삭제 실패: 참조 중인 데이터가 있습니다.", null));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.failure("삭제 실패: " + e.getMessage(), null));
        }
    }

    // 6. DBC 파일명 중복 확인
    @GetMapping("/check-duplicate")
    public ResponseEntity<ApiResponse<Boolean>> checkDuplicateDbcFileName(@RequestParam String name) {
        boolean exists = dbcFileService.existsByName(name);
        return ResponseEntity.ok(ApiResponse.success("중복 여부 확인", exists));
    }


}
