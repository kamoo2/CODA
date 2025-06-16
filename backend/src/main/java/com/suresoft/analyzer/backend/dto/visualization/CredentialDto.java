package com.suresoft.analyzer.backend.dto.visualization;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CredentialDto {
    private String accessKey;
    private String secretKey;
    private String regionName;
    private String bucketName;
}
