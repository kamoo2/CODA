package com.suresoft.analyzer.backend.repository.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectEntity;
import com.suresoft.analyzer.backend.entity.analysis.evaluation.PassEvaluationResultEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PassEvaluationResultRepository extends JpaRepository<PassEvaluationResultEntity, String> {
    @EntityGraph(attributePaths = {"evaluationProjectCriteria"})
    List<PassEvaluationResultEntity> findByEvaluationProjectCriteriaId(String criteriaId);
    @EntityGraph(attributePaths = {"evaluationProjectCriteria"})
    List<PassEvaluationResultEntity> findByEvaluationProjectCriteriaProjectId(String projectId);
}