package com.suresoft.analyzer.backend.repository.analysis.dataset.curation;

import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectCriteriaEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CurationProjectCriteriaRepository extends JpaRepository<CurationProjectCriteriaEntity, String> {
    @EntityGraph(attributePaths = {"criteria", "project", "projectFile"})
    List<CurationProjectCriteriaEntity> findByProjectIdOrderByCreatedAtAsc(String projectId);
    @EntityGraph(attributePaths = {"criteria", "project", "projectFile"})
    List<CurationProjectCriteriaEntity> findByCriteriaIdOrderByCreatedAtAsc(String criteriaId);
    @EntityGraph(attributePaths = {"criteria", "project", "projectFile"})
    List<CurationProjectCriteriaEntity> findByProjectFileId(String projectId);

    @Override
    @EntityGraph(attributePaths = {"criteria", "project", "projectFile"})
    Optional<CurationProjectCriteriaEntity> findById(String id);
}