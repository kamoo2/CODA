package com.suresoft.analyzer.backend.service.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AnalysisWebSocketHandler extends TextWebSocketHandler {
    private final EvaluationService analysisService;
    // 사용자 ID별 WebSocketSession 관리
    private static final ConcurrentHashMap<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();

    public AnalysisWebSocketHandler(EvaluationService analysisService) {
        this.analysisService = analysisService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // 쿼리 파라미터 또는 헤더에서 사용자 ID 가져오기
        String userId = getUserIdFromSession(session);
        if (userId != null) {
            WebSocketSession existingSession = userSessions.get(userId);
            if (existingSession != null && existingSession.isOpen()) {
                existingSession.close(CloseStatus.NORMAL); // 기존 연결 끊기
                System.out.println("[Eval]기존 연결 종료: " + userId);
            }

            userSessions.put(userId, session);
            System.out.println("[Eval]새 연결 수립: " + userId);
        } else {
            System.out.println("[Eval]userId가 전달되지 않음! 연결 거부.");
            session.close(CloseStatus.NOT_ACCEPTABLE);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        String userId = getUserIdFromSession(session);

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode json = objectMapper.readTree(payload);

        String command = json.get("command").asText();
        String projectCriteriaId = json.get("projectCriteriaId").asText();

        if (userId != null && "START".equals(command)) {
            analysisService.runAnalysisAsync(userId, projectCriteriaId);
        } else if (userId != null && "PAUSE".equals(command)) {
            analysisService.pauseAnalysis(projectCriteriaId);
        } else if (userId != null && "STOP".equals(command)) {
            analysisService.stopAnalysis(projectCriteriaId);
        }else if (userId != null && "RESUME".equals(command)) {
            analysisService.resumeAnalysis(userId, projectCriteriaId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = getUserIdFromSession(session);
        if (userId != null) {
            userSessions.remove(userId);
            System.out.println("[Eval]사용자 " + userId + " 연결 종료됨.");
        }
    }

    public static void sendAnalysisMessageToUser(String userId, String projectCriteriaId, String message) throws IOException {
        WebSocketSession session = userSessions.get(userId);
        if (session != null && session.isOpen()) {
            WebSocketAnalysisMessage msg = new WebSocketAnalysisMessage(message,projectCriteriaId);
            ObjectMapper objectMapper = new ObjectMapper();
            String jsonMsg = objectMapper.writeValueAsString(msg);
            session.sendMessage(new TextMessage(jsonMsg));
        }
    }

    // 세션에서 사용자 ID 가져오는 로직 (쿼리 파라미터 또는 헤더 기반)
    private String getUserIdFromSession(WebSocketSession session) {
        String query = session.getUri().getQuery(); // "userId=123" 형식
        if (query != null && query.startsWith("userId=")) {
            return query.split("=")[1]; // "123" 추출
        }
        return null;
    }
}
