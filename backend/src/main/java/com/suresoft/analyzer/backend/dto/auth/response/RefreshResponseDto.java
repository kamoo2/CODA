package com.suresoft.analyzer.backend.dto.auth.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class RefreshResponseDto {
    private String accessToken;
}
