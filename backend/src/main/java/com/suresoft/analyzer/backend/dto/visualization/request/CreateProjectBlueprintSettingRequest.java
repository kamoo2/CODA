package com.suresoft.analyzer.backend.dto.visualization.request;

import lombok.Getter;

import java.util.List;

@Getter
public class CreateProjectBlueprintSettingRequest {
    private String uploadFileId;
    private String uploadFilePath;
    private String dbcFileName;
    private String entityName;
    private String viewName;
    private String parserName;
    private List<SelectedSignal> selectedSignals; // ✅ 프론트에서 넘어오는 배열

    @Getter
    public static class SelectedSignal { // ✅ 내부 클래스 선언
        private String messageName;
        private List<String> signalNames;
    }
}