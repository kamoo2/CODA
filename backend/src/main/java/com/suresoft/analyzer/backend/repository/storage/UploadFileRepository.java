package com.suresoft.analyzer.backend.repository.storage;

import com.suresoft.analyzer.backend.dto.storage.UploadFileDto;
import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UploadFileRepository extends JpaRepository<UploadFileEntity, String> {

    /**
     * 특정 Bucket에 속한 업로드 파일 리스트 조회
     */
    List<UploadFileEntity> findByBucketId(String bucketId);
    boolean existsByS3Url(String s3Url);

    List<UploadFileEntity> findByS3UrlIn(List<String> s3Urls);

    Optional<UploadFileEntity> findByS3Url(String path);
}