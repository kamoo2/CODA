package com.suresoft.analyzer.backend.repository.storage;

import com.suresoft.analyzer.backend.entity.storage.DbcFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;


@Repository
public interface DbcFileRepository extends JpaRepository<DbcFileEntity, String> {
    Optional<DbcFileEntity> findByName(String name);

    boolean existsByName(String name); // 파일명 중복 여부 확인용
}