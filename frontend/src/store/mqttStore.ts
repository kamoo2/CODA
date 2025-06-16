// mqttStore.ts
import mqtt, { MqttClient } from 'mqtt';
import { create } from 'zustand';

type TopicHandler = (message: string) => void;

type MqttStore = {
  client: MqttClient | null;
  isConnected: boolean;
  connect: (userId: string) => void;
  disconnect: () => void;
  subscribe: (topic: string, handler: TopicHandler) => void;
  unsubscribe: (topic: string, handler: TopicHandler) => void;
};

// 내부 핸들러 맵 (토픽별 → 핸들러 배열)
const topicHandlers: Record<string, TopicHandler[]> = {};

export const useMqttStore = create<MqttStore>((set, get) => ({
  client: null,
  isConnected: false,

  connect: (userId: string) => {
    const existing = get().client;
    if (existing && get().isConnected) return;

    const client = mqtt.connect(import.meta.env.VITE_MQTT_BROKER_URL, {
      clientId: `frontend-${userId}-${Math.random().toString(16).slice(2)}`,
      reconnectPeriod: 3000,
      clean: false, // 세션 유지
      keepalive: 60,
    });

    client.on('connect', () => {
      console.log('📡 MQTT connected');
      set({ isConnected: true });
    });

    client.on('reconnect', () => {
      console.warn('🔁 MQTT reconnecting...');
    });

    client.on('close', () => {
      console.warn('📴 MQTT disconnected');
      set({ isConnected: false });
    });

    client.on('error', (err) => {
      console.error('❌ MQTT error', err);
    });

    client.on('message', (topic, payload) => {
      const handlers = topicHandlers[topic];
      if (handlers) {
        const msg = payload.toString();
        handlers.forEach((fn) => fn(msg));
      }
    });

    set({ client });
  },

  disconnect: () => {
    const client = get().client;
    if (client) {
      client.end(true, () => {
        console.log('👋 MQTT connection closed');
        set({ client: null, isConnected: false });
      });
    }
  },

  subscribe: (topic, handler) => {
    const client = get().client;
    if (!client) return;

    // 토픽 최초 구독 시만 MQTT subscribe 호출
    if (!topicHandlers[topic]) {
      topicHandlers[topic] = [];
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) console.error(`❌ Failed to subscribe: ${topic}`, err);
        else console.log(`✅ Subscribed: ${topic}`);
      });
    }

    // 핸들러 중복 방지
    const alreadyRegistered = topicHandlers[topic].some((h) => h === handler);
    if (!alreadyRegistered) {
      topicHandlers[topic].push(handler);
    }
  },

  unsubscribe: (topic, handler) => {
    const client = get().client;
    const handlers = topicHandlers[topic];
    if (!handlers) return;

    topicHandlers[topic] = handlers.filter((h) => h !== handler);

    // 핸들러가 모두 제거되면 MQTT 구독도 해제
    if (topicHandlers[topic].length === 0) {
      delete topicHandlers[topic];
      client?.unsubscribe(topic, (err) => {
        if (err) console.error(`❌ Failed to unsubscribe: ${topic}`, err);
        else console.log(`🚫 Unsubscribed: ${topic}`);
      });
    }
  },
}));
