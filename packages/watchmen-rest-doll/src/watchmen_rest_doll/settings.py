from watchmen_rest import RestSettings


class DollSettings(RestSettings):
	APP_NAME: str = 'Watchmen Doll'

	TUPLE_DELETABLE: bool = False

	ENGINE_INDEX: bool = True
