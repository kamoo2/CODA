package com.suresoft.analyzer.backend.mqtt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.suresoft.analyzer.backend.dto.visualization.EVisualizationProcessStatus;
import com.suresoft.analyzer.backend.entity.visualization.RRDFileEntity;
import com.suresoft.analyzer.backend.entity.visualization.VisualizationProjectEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.visualization.RRDFileRepository;
import com.suresoft.analyzer.backend.repository.visualization.VisualizationProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;
@Slf4j
@Component
@RequiredArgsConstructor
public class VisualizationMqttSubscriber implements MqttCallback {

    private final ObjectMapper objectMapper;
    private final VisualizationProjectRepository visualizationProjectRepository;
    private final RRDFileRepository rrdFileRepository;
    private final MqttPublisher mqttPublisher; // 프론트로 재전송용
    private final MqttClient mqttClient;

    @EventListener(ApplicationReadyEvent.class)
    public void subscribe() {
        try {
            mqttClient.setCallback(this);

            if (mqttClient.isConnected()) {
                mqttClient.disconnect();
                log.warn("🔄 기존 MQTT 연결 해제 후 재연결 시도");
            }

            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(false);
            options.setKeepAliveInterval(60);

            mqttClient.connect(options);

            String subscribeTopic = "visualization/backend/+/+/+";
            mqttClient.subscribe(subscribeTopic);

            log.info("📡 MQTT 구독 성공 | ClientId: {} | Topic: {}", mqttClient.getClientId(), subscribeTopic);
        } catch (MqttException e) {
            log.error("❌ MQTT 구독 실패", e);
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        log.warn("⚠️ MQTT 연결 끊김", cause);
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) throws Exception {
        try {
            log.info("📨 MQTT 메시지 수신 | Topic: {} | Payload: {}", topic, new String(message.getPayload()));

            String[] parts = topic.split("/");
            if (parts.length < 5) {
                log.warn("⚠️ 예상치 못한 토픽 형식: " + topic);
                return;
            }

            String topicType = parts[2]; // progress or complete
            String userId = parts[3];
            String projectId = parts[4];

            JsonNode json = objectMapper.readTree(message.getPayload());

            VisualizationProjectEntity project = visualizationProjectRepository.findById(projectId)
                    .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

            if (!project.getUser().getId().equals(userId)) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }

            switch (topicType) {
                case "progress":
                    handleProgressMessage(json, project, userId);
                    break;
                case "complete":
                    handleCompleteMessage(project, userId);
                    break;
                default:
                    log.warn("⚠️ 알 수 없는 topicType: {}", topicType);
            }

        } catch (Exception e) {
            log.error("❌ MQTT 메시지 처리 실패: " + topic, e);
        }
    }

    private void handleProgressMessage(JsonNode json, VisualizationProjectEntity project, String userId) {
        String filePath = json.get("file_path").asText();
        String segmentName = json.get("segment_name").asText();
        int segmentIndex = json.get("segment_index").asInt();

        RRDFileEntity file = new RRDFileEntity();
        file.setRrdUrl(filePath);
        file.setName(segmentName);
        file.setVisualizationProject(project);
        rrdFileRepository.save(file);

        String frontendTopic = String.format("visualization/frontend/progress/%s/%s", userId, project.getId());
        Map<String, Object> payload = Map.of(
                "status", "PROGRESSING",
                "rrd_url", filePath,
                "segment_index", segmentIndex,
                "segment_name", segmentName
        );

        log.info("📤 MQTT 발행 (progress) | Topic: {} | Payload: {}", frontendTopic, payload);
        mqttPublisher.publish(frontendTopic, payload);
    }

    private void handleCompleteMessage(VisualizationProjectEntity project, String userId) {
        project.setStatus(EVisualizationProcessStatus.COMPLETE);
        visualizationProjectRepository.save(project);

        String frontendTopic = String.format("visualization/frontend/progress/%s/%s", userId, project.getId());
        String globalTopic = String.format("global/user/%s/visualization/complete",userId);
        Map<String, Object> payload = Map.of("status", "COMPLETE");

        log.info("📤 MQTT 발행 (complete) | Topic: {} | Payload: {}", frontendTopic, payload);
        mqttPublisher.publish(frontendTopic, payload);
        payload = Map.of(
                "projectId", project.getId()
        );
        log.info("📤 MQTT 발행 (complete) | Topic: {} | Payload: {}", globalTopic, payload);
        mqttPublisher.publish(globalTopic,payload);
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
        // 구독자는 발행 안 하므로 무시
    }
}