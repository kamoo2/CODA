package com.suresoft.analyzer.backend.repository.system;

import com.suresoft.analyzer.backend.entity.system.ExtensionEntity;
import com.suresoft.analyzer.backend.entity.system.ExtensionParserEntity;
import com.suresoft.analyzer.backend.entity.system.ParserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExtensionParserRepository extends JpaRepository<ExtensionParserEntity, String> {
    // ✅ 특정 확장자 ID에 연결된 파서 엔티티 목록 조회
    @Query("SELECT ep.parser FROM ExtensionParserEntity ep WHERE ep.extension.id = :extensionId")
    List<ParserEntity> findParsersByExtensionId(@Param("extensionId") String extensionId);
}