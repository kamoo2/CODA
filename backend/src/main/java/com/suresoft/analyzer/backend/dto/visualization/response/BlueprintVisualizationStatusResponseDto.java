package com.suresoft.analyzer.backend.dto.visualization.response;

import com.suresoft.analyzer.backend.dto.visualization.EBlueprintVisualizationStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BlueprintVisualizationStatusResponseDto {
    private EBlueprintVisualizationStatus status;                      // 상태 코드 (시각화 필요 or 재사용 가능)
    private SimpleVisualizationProjectResponseDto visualizedProject; // 재사용할 프로젝트 정보 (있을 때만)
}
