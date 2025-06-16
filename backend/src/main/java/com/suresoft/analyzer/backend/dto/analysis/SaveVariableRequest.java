package com.suresoft.analyzer.backend.dto.analysis;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveVariableRequest {
    private String crtId;
    private VariableDto variable;
}
