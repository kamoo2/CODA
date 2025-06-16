package com.suresoft.analyzer.backend.repository.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationProjectRepository extends JpaRepository<EvaluationProjectEntity, String> {
    /**
     * 특정 프로젝트에 속한 RRD 파일 리스트 조회
     */
    List<EvaluationProjectEntity> findByUserId(String userId);
}