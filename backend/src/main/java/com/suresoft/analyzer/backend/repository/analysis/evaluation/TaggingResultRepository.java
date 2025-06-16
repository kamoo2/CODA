package com.suresoft.analyzer.backend.repository.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.TaggingResultEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaggingResultRepository extends JpaRepository<TaggingResultEntity, String> {
    @EntityGraph(attributePaths = {"evaluationProjectCriteria"})
    List<TaggingResultEntity> findByEvaluationProjectCriteriaId(String criteriaId);
    @EntityGraph(attributePaths = {"evaluationProjectCriteria"})
    List<TaggingResultEntity> findByEvaluationProjectCriteriaProjectId(String projectId);
}