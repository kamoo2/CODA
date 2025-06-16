import paho.mqtt.client as mqtt

BROKER_HOST = "mqtt"
BROKER_PORT = 1883

def get_mqtt_client(client_id: str):
    client = mqtt.Client(client_id=client_id)
    client.connect(BROKER_HOST, BROKER_PORT)
    return client