package com.suresoft.analyzer.backend.dto.visualization.response;

import com.suresoft.analyzer.backend.dto.visualization.EVisualizationProcessStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SimpleVisualizationProjectResponseDto {
    private String id;
    private String name;
    private EVisualizationProcessStatus status;
    private LocalDateTime createdAt;
}
