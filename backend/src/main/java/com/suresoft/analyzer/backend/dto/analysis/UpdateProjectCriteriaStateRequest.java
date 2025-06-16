package com.suresoft.analyzer.backend.dto.analysis;

import com.suresoft.analyzer.backend.entity.analysis.CriteriaState;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProjectCriteriaStateRequest {
    private String id;
    private CriteriaState state;
}
