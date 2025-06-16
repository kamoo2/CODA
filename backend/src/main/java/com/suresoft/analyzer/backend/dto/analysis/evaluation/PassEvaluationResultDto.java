package com.suresoft.analyzer.backend.dto.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.PassEvaluationResultEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PassEvaluationResultDto {
    private String id;
    private String criteriaId;
    private String criteriaName;
    private LocalDateTime failStartTime;
    private LocalDateTime failEndTime;
    private String failMessage;

    // 엔티티를 받아 생성하는 생성자
    public PassEvaluationResultDto(PassEvaluationResultEntity entity) {
        setId(entity.getId());
        setCriteriaId(entity.getEvaluationProjectCriteria().getCriteria().getId());
        setCriteriaName(entity.getEvaluationProjectCriteria().getCriteria().getName());
        setFailStartTime(entity.getFailStartTime());
        setFailEndTime(entity.getFailEndTime());
        setFailMessage(entity.getMessage());
    }
}