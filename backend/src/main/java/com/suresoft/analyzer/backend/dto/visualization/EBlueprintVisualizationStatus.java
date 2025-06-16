package com.suresoft.analyzer.backend.dto.visualization;

public enum EBlueprintVisualizationStatus {
    NEEDS_VISUALIZATION,  // RRD 파일이 없어서 시각화 프로세스 필요
    REUSE_EXISTING        // 이미 시각화된 프로젝트 있음 → 재사용 가능
}
