package com.suresoft.analyzer.backend.dto.visualization.response;

import com.suresoft.analyzer.backend.dto.visualization.EVisualizationProcessStatus;
import lombok.*;

import java.util.List;

@Getter
@Setter
public class VisualizationProjectResponseDto extends SimpleVisualizationProjectResponseDto {
    private List<RRDFileResponseDto> rrdFiles;
    private List<BlueprintSettingResponseDto> blueprintSettings;
}