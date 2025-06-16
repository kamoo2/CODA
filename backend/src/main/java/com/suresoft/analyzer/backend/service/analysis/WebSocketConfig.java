package com.suresoft.analyzer.backend.service.analysis;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final EvaluationService evaluationService;
    private final CurationService curationService;

    public WebSocketConfig(EvaluationService evaluationService, CurationService curationService) {
        this.evaluationService = evaluationService;
        this.curationService = curationService;
    }

    @Bean
    public AnalysisWebSocketHandler analysisWebSocketHandler() {
        return new AnalysisWebSocketHandler(evaluationService);
    }

    @Bean
    public CurationWebSocketHandler curationWebSocketHandler() {
        return new CurationWebSocketHandler(curationService);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(analysisWebSocketHandler(), "/ws/analysis")
                .setAllowedOriginPatterns("*");

        registry.addHandler(curationWebSocketHandler(), "/ws/curation")
                .setAllowedOriginPatterns("*");
    }
}
