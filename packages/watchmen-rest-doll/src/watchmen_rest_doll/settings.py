from watchmen_rest import RestSettings


class DollSettings(RestSettings):
	APP_NAME: str = 'Watchmen Doll'

	TUPLE_DELETABLE: bool = False
	CREATE_PIPELINE_MONITOR_TOPICS_ON_TENANT_CREATE: bool = True
	CREATE_DQC_TOPICS_ON_TENANT_CREATE: bool = False  # enable it when dqc is on
