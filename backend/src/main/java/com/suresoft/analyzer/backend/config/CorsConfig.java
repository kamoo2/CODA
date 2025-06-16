package com.suresoft.analyzer.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:3000","http://localhost:3001") //TODO : 실제 도메인으로 변경
                .allowedMethods("GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE")
                .allowedHeaders("*")  //TODO : 보안상 필수적인 헤더만 허용하도록 .allowedHeaders("Authorization", "Content-Type", "Accept")
                .maxAge(3600)  // 1시간 동안 OPTIONS 요청을 캐싱, 프리플라이트가 발생하면 성능 과부하와서 재사용할 수 있도록 설정함
                .allowCredentials(true); //TODO : 실제 도메인으로 변경 .allowedOrigins("https://your-production-domain.com")

    }
}
