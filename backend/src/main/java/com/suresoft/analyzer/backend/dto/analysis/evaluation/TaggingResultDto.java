package com.suresoft.analyzer.backend.dto.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.TaggingResultEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaggingResultDto {
    private String id;
    private String criteriaId;
    private String criteriaName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String message;
    private String color;


    // 엔티티를 받아 생성하는 생성자
    public TaggingResultDto(TaggingResultEntity entity) {
        setId(entity.getId());
        setCriteriaId(entity.getEvaluationProjectCriteria().getCriteria().getId());
        setCriteriaName(entity.getEvaluationProjectCriteria().getCriteria().getName());
        setStartTime(entity.getStartTime());
        setEndTime(entity.getEndTime());
        setMessage(entity.getMessage());
        setColor(entity.getColor());
    }
}