package com.suresoft.analyzer.backend.dto.visualization.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@Builder
public class RRDFileResponseDto {
    private String id;
    private String name;
    private String rrdUrl;
}
