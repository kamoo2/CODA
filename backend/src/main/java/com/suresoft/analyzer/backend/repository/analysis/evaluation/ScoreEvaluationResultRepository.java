package com.suresoft.analyzer.backend.repository.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.ScoreEvaluationResultEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoreEvaluationResultRepository extends JpaRepository<ScoreEvaluationResultEntity, String> {
    @EntityGraph(attributePaths = {"evaluationProjectCriteria"})
    List<ScoreEvaluationResultEntity> findByEvaluationProjectCriteriaId(String criteriaId);
    @EntityGraph(attributePaths = {"evaluationProjectCriteria"})
    List<ScoreEvaluationResultEntity> findByEvaluationProjectCriteriaProjectId(String projectId);
}