package com.suresoft.analyzer.backend.repository.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectCriteriaEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvaluationProjectCriteriaRepository extends JpaRepository<EvaluationProjectCriteriaEntity, String> {
    @EntityGraph(attributePaths = {"criteria", "project"}) // file과 project를 즉시 로드
    List<EvaluationProjectCriteriaEntity> findByProjectIdOrderByCreatedAtAsc(String projectId);
    @EntityGraph(attributePaths = {"criteria", "project"}) // file과 project를 즉시 로드
    List<EvaluationProjectCriteriaEntity> findByCriteriaIdOrderByCreatedAtAsc(String criteriaId);

    @Override
    @EntityGraph(attributePaths = {"criteria", "project"}) // file과 project를 즉시 로드
    Optional<EvaluationProjectCriteriaEntity> findById(String id);
}