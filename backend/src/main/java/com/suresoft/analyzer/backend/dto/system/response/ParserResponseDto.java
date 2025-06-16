package com.suresoft.analyzer.backend.dto.system.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ParserResponseDto {
    private String id;
    private String name;
}
