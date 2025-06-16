package com.suresoft.analyzer.backend.repository.analysis;

import com.suresoft.analyzer.backend.entity.analysis.CriteriaEntity;
import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CriteriaRepository extends JpaRepository<CriteriaEntity, String> {
    List<CriteriaEntity> findByUserId(String userId);
}

