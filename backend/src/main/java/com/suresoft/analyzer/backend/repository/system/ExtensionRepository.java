package com.suresoft.analyzer.backend.repository.system;

import com.suresoft.analyzer.backend.entity.system.ExtensionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExtensionRepository extends JpaRepository<ExtensionEntity, String> {
    Optional<ExtensionEntity> findByName(String name); // 확장자 이름으로 조회
}