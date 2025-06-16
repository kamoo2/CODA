package com.suresoft.analyzer.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
public class AwsCredentialsRequest {
    private String accessKey;
    private String secretKey;

    @JsonIgnoreProperties
    private String region;
    @JsonIgnoreProperties
    private String name;

    // 기본 생성자
    public AwsCredentialsRequest() {}

}
