package com.suresoft.analyzer.backend.service.analysis;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WebSocketAnalysisMessage {

    private String message;
    private String projectCriteriaId;

    public WebSocketAnalysisMessage(String message, String projectCriteriaId) {
        this.message = message;
        this.projectCriteriaId = projectCriteriaId;
    }
}
