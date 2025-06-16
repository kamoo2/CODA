package com.suresoft.analyzer.backend.dto.analysis;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateStringValueByIdRequest {
    private String id;
    private String value;
}
