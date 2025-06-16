package com.suresoft.analyzer.backend.repository.analysis.dataset.curation;

import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CurationProjectRepository extends JpaRepository<CurationProjectEntity, String> {
    /**
     * 특정 프로젝트에 속한 RRD 파일 리스트 조회
     */
    List<CurationProjectEntity> findByUserId(String userId);
}