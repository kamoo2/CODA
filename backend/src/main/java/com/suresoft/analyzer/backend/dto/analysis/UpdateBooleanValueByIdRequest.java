package com.suresoft.analyzer.backend.dto.analysis;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateBooleanValueByIdRequest {
    private String id;
    private boolean value;
}
