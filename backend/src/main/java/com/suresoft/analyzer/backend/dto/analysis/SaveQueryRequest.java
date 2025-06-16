package com.suresoft.analyzer.backend.dto.analysis;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveQueryRequest {
    private String crtId;
    private String query;
}
