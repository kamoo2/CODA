package com.suresoft.analyzer.backend.dto.analysis.evaluation;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaState;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaType;
import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectCriteriaEntity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class EvaluationProjectCriteriaDto {
    private String id;
    private LocalDateTime createdAt;
    private String projectId;
    private String criteriaId;
    private String criteriaName;
    private CriteriaType type;
    private CriteriaState state;
    private String tagColor;

    public EvaluationProjectCriteriaDto(EvaluationProjectCriteriaEntity entity){
        setId(entity.getId());
        setCreatedAt(entity.getCreatedAt());
        setProjectId(entity.getProject().getId());
        setCriteriaId(entity.getCriteria().getId());
        setCriteriaName(entity.getCriteria().getName());
        setType(entity.getType());
        setState((entity.getState()));
        setTagColor(entity.getTagColor());
    }
}