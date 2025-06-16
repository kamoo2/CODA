package com.suresoft.analyzer.backend.dto.visualization.response;

import com.suresoft.analyzer.backend.dto.storage.UploadFileDto;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class BlueprintSettingResponseDto {
    private String id;
    private String viewName;   // fileType
    private String entityName; // VisualizationUploadFileEntity ID 또는 Name
    private UploadFileDto uploadFile; // 연결된 UploadFile 정보
}