package com.suresoft.analyzer.backend.config;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MqttConfig {
    @Value("${mqtt.broker}")
    private String broker;

    @Value("${mqtt.client-id:backend-subscriber}")
    private String clientId;

    @Bean
    public MqttClient mqttClient() throws MqttException {
        System.out.println(broker + " : " + clientId);

        return new MqttClient(broker, clientId, new MemoryPersistence());
    }
}
