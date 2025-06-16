package com.suresoft.analyzer.backend.repository.analysis.dataset.curation;

import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationResultEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CurationResultRepository extends JpaRepository<CurationResultEntity, String> {
    @EntityGraph(attributePaths = {"projectCriteria"})
    List<CurationResultEntity> findByProjectCriteriaId(String projectCriteriaId);
    @EntityGraph(attributePaths = {"projectCriteria"})
    List<CurationResultEntity> findByProjectCriteriaProjectId(String projectId);
}