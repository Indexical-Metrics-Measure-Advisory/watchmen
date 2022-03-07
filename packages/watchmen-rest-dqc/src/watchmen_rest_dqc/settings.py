from watchmen_rest import RestSettings


class DqcSettings(RestSettings):
	APP_NAME: str = 'Watchmen DQC'

	TUPLE_DELETABLE: bool = False
