package com.suresoft.analyzer.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

public class SwaggerConfig {

    @Configuration
    public static class ProdSwaggerConfig {
        @Bean
        public OpenAPI customOpenAPI() {
            return new OpenAPI()
                    .info(new Info()
                            .title("API Documentation (PROD)")
                            .version("1.0")
                            .description("Spring Boot JWT Authentication API (Production)"))
                    .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"))
                    .components(new io.swagger.v3.oas.models.Components()
                            .addSecuritySchemes("Bearer Authentication",
                                    new SecurityScheme()
                                            .name("Bearer Authentication")
                                            .type(SecurityScheme.Type.HTTP)
                                            .scheme("bearer")
                                            .bearerFormat("JWT")));
        }
    }

}
