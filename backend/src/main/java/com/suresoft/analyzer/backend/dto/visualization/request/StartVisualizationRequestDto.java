package com.suresoft.analyzer.backend.dto.visualization.request;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class StartVisualizationRequestDto {
    private String projectId;
    private int rrdFileCount;
    private List<CreateProjectBlueprintSettingRequest> blueprints;
}
