package com.suresoft.analyzer.backend.dto.analysis;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveScriptRequest {
    private String crtId;
    private String script;
}
