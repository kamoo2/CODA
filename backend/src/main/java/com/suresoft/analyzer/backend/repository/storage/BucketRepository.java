package com.suresoft.analyzer.backend.repository.storage;

import com.suresoft.analyzer.backend.entity.storage.BucketEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BucketRepository extends JpaRepository<BucketEntity, String> {
    Optional<BucketEntity> findByName(String name);

    List<BucketEntity> findAllByUserId(String userId);

    Optional<BucketEntity> findByUserIdAndId(String userId, String bucketId);

   Optional<BucketEntity> findById(String bucketId); // 또는 직접 이름만 조회해도 됨

}