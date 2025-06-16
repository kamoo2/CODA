package com.suresoft.analyzer.backend.service.storage;

import com.suresoft.analyzer.backend.dto.analysis.ProjectFileDto;
import com.suresoft.analyzer.backend.dto.storage.DeleteUploadFilesResultDto;
import com.suresoft.analyzer.backend.dto.storage.UploadFileDto;
import com.suresoft.analyzer.backend.dto.storage.UploadFileUsageDto;
import com.suresoft.analyzer.backend.dto.storage.request.UploadFileCreateRequest;
import com.suresoft.analyzer.backend.entity.storage.BucketEntity;
import com.suresoft.analyzer.backend.entity.storage.DbcFileEntity;
import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import com.suresoft.analyzer.backend.entity.system.ParserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.analysis.ProjectFileRepository;
import com.suresoft.analyzer.backend.repository.storage.BucketRepository;
import com.suresoft.analyzer.backend.repository.storage.DbcFileRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import com.suresoft.analyzer.backend.repository.system.ParserRepository;
import com.suresoft.analyzer.backend.repository.visualization.BlueprintSettingRepository;
import com.suresoft.analyzer.backend.repository.visualization.VisualizationProjectRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StorageService {
    private final UploadFileRepository uploadFileRepository;
    private final BucketRepository bucketRepository;
    private final ParserRepository parserRepository;
    private final DbcFileRepository dbcFileRepository;

    private final ProjectFileRepository projectFileRepository;
    private final BlueprintSettingRepository   blueprintSettingRepository;
    private final VisualizationProjectRepository visualizationProjectRepository;


    public List<UploadFileDto> getAllUploadFilesByUserId(String userId) {
        List<BucketEntity> buckets = bucketRepository.findAllByUserId(userId);
        List<UploadFileDto> results = new ArrayList<>();

        for (BucketEntity bucket : buckets) {
            results.addAll(uploadFileRepository.findByBucketId(bucket.getId()).stream().map(uploadFile -> {
                UploadFileDto dto = new UploadFileDto();
                dto.setId(uploadFile.getId());
                dto.setName(uploadFile.getName());

                if (uploadFile.getParser() != null) {
                    dto.setParserName(uploadFile.getParser().getName());
                    dto.setParserId(uploadFile.getParser().getId());
                }

                if (uploadFile.getDbc() != null) {
                    dto.setDbcFileId(uploadFile.getDbc().getId());
                    dto.setDbcFileName(uploadFile.getDbc().getName());
                }

                dto.setS3Url(uploadFile.getS3Url());
                dto.setTimestamp(uploadFile.getTimestampMicro());

                return dto;
            }).toList());
        }

        return results;
    }



    public UploadFileDto getById(String id) {
        UploadFileEntity entity = uploadFileRepository.findById(id).orElseThrow(() ->  new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "User Not Found"));;
        UploadFileDto dto = new UploadFileDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setParserName(entity.getParser().getName());
        dto.setS3Url(entity.getS3Url());
        return dto;
    }

    public String createUploadFile(UploadFileCreateRequest request) {
        BucketEntity bucket = bucketRepository.findById(request.getBucketId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        ParserEntity parser = parserRepository.findById(request.getParserId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        UploadFileEntity file = new UploadFileEntity();
        file.setName(request.getName());
        file.setS3Url(request.getPath());
        file.setBucket(bucket);
        file.setParser(parser);
        file.setTimestampMicro(null); // 초기값은 null

        //  DBC 파일 연결 (있으면)
        if (request.getDbcFileId() != null && !request.getDbcFileId().isEmpty()) {
            dbcFileRepository.findById(request.getDbcFileId())
                    .ifPresent(file::setDbc);
        }

        UploadFileEntity saved = uploadFileRepository.save(file);
        return saved.getId();
    }


    public void updateUploadFile(String id, String parserId, String dbcFileId, String userId) {
        UploadFileEntity file = uploadFileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다."));

        if (parserId != null && !parserId.isBlank()) {
            file.setParser(parserRepository.findById(parserId)
                    .orElseThrow(() -> new RuntimeException("parser 파일을 찾을 수 없습니다.")));
        }

        if (dbcFileId != null && !dbcFileId.isBlank()) {
            file.setDbc(dbcFileRepository.findById(dbcFileId)
                    .orElseThrow(() -> new RuntimeException("dbc 파일을 찾을 수 없습니다.")));
        }


        uploadFileRepository.save(file);
    }


    public DeleteUploadFilesResultDto deleteUploadFiles(List<String> fileIds, String userId) {
        List<String> deleted = new ArrayList<>();
        List<UploadFileUsageDto> skipped = new ArrayList<>();

        for (String fileId : fileIds) {
            UploadFileUsageDto usage = getUploadFileUsage(fileId);
            if (usage.isUsed()) {
                skipped.add(usage); // 그대로 재사용
                continue;
            }

            uploadFileRepository.deleteById(fileId);
            deleted.add(fileId);
        }

        return new DeleteUploadFilesResultDto(deleted, skipped);
    }


    public List<String> createUploadFiles(List<UploadFileCreateRequest> dtoList, String userId) {
        List<String> ids = new ArrayList<>();
        for (UploadFileCreateRequest dto : dtoList) {
            String id = createOrUpdateUploadFile(dto, userId); // <-- 수정된 메서드 사용
            ids.add(id);
        }
        return ids;
    }

    @Transactional
    public String createOrUpdateUploadFile(UploadFileCreateRequest dto, String userId) {
        Optional<UploadFileEntity> existingOpt = uploadFileRepository.findByS3Url(dto.getPath());

        // 엔티티 조회
        ParserEntity parser = null;
        if (dto.getParserId() != null) {
            parser = parserRepository.findById(dto.getParserId())
                    .orElse(null); // 못 찾으면 null
        }

        BucketEntity bucket = bucketRepository.findById(dto.getBucketId())
                .orElseThrow(() -> new IllegalArgumentException("Bucket not found: " + dto.getBucketId()));

        DbcFileEntity dbc = null;
        if (dto.getDbcFileId() != null) {
            dbc = dbcFileRepository.findById(dto.getDbcFileId())
                    .orElseThrow(() -> new IllegalArgumentException("DbcFile not found: " + dto.getDbcFileId()));
        }
        if (existingOpt.isPresent()) {
            // === UPDATE EXISTING ===
            UploadFileEntity file = existingOpt.get();
            file.setName(dto.getName());
            file.setParser(parser);
            file.setBucket(bucket);
            file.setDbc(dbc);
            return uploadFileRepository.save(file).getId();

        }  else {
            // === CREATE NEW ===
            UploadFileEntity newFile = new UploadFileEntity();
            newFile.setName(dto.getName());
            newFile.setS3Url(dto.getPath());
            newFile.setParser(parser);
            newFile.setBucket(bucket);
            newFile.setDbc(dbc);
            newFile.setCreatedAt(LocalDateTime.now());
            return uploadFileRepository.save(newFile).getId();
        }
    }

    public UploadFileUsageDto getUploadFileUsage(String uploadFileId) {
        UploadFileEntity file = uploadFileRepository.findById(uploadFileId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "해당 파일이 존재하지 않습니다."));

        List<String> usedIn = new ArrayList<>();

        if (projectFileRepository.existsByUploadFile_Id(uploadFileId)) {
            usedIn.add("PROJECT_FILE");
        }

        if (blueprintSettingRepository.existsByUploadFile_Id(uploadFileId)) {
            usedIn.add("BLUEPRINT_SETTING_FILE");
        }

        return new UploadFileUsageDto(
                uploadFileId,
                file.getName(),
                !usedIn.isEmpty(),
                usedIn
        );
    }

}



