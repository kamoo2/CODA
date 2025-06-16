package com.suresoft.analyzer.backend.repository.system;

import com.suresoft.analyzer.backend.entity.system.ParserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParserRepository extends JpaRepository<ParserEntity, String> {
    Optional<ParserEntity> findByName(String name); // 파서 이름으로 조회
    List<ParserEntity> findByNameIn(List<String> names); // 파서 이름 여러개 조회
}