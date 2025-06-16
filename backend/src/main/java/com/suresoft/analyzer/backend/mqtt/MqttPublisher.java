package com.suresoft.analyzer.backend.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class MqttPublisher {

    private final MqttClient mqttClient;
    private final ObjectMapper objectMapper;

    public void publish(String topic, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            MqttMessage message = new MqttMessage(json.getBytes(StandardCharsets.UTF_8));
            message.setQos(1);
            mqttClient.publish(topic, message);

            // ✅ 콘솔 로그로 출력
            System.out.println("📤 MQTT 발행: " + topic + " → " + json);

        } catch (Exception e) {
            System.err.println("❌ MQTT 발행 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}