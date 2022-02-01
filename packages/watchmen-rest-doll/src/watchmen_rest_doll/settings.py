from watchmen_rest import RestSettings


class DollSettings(RestSettings):
	APP_NAME: str = 'Watchmen Doll'
	
	RABBITMQ_CONNECTOR: bool = False
	RABBITMQ_HOST: str = ""
	RABBITMQ_PORT: str = "5672"
	RABBITMQ_USERNAME: str = ""
	RABBITMQ_PASSWORD: str = ""
	RABBITMQ_VIRTUALHOST: str = ""
	RABBITMQ_QUEUE: str = ""
	RABBITMQ_DURABLE: bool = True
	RABBITMQ_AUTO_DELETE: bool = False

	KAFKA_CONNECTOR = False
	KAFKA_BOOTSTRAP_SERVER = "localhost:9092"
	KAFKA_TOPICS = ""
