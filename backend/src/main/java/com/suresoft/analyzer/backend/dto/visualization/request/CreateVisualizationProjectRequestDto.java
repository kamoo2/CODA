package com.suresoft.analyzer.backend.dto.visualization.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
public class CreateVisualizationProjectRequestDto {
    private String projectName;
    private List<CreateProjectBlueprintSettingRequest> blueprints;
}
