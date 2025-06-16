package com.suresoft.analyzer.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "env")
@Getter
@Setter
public class EnvProperties {
    private String mode;
    private String path;
    private String serverUrl;
    private Long jwtAccessTokenExpiration;
    private Long jwtRefreshTokenExpiration;
    private String jwtSecretKey;
    private String aesMasterKey;
}
