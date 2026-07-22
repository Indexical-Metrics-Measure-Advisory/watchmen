from watchmen_rest import RestSettings


class DqcSettings(RestSettings):
	APP_NAME: str = 'Watchmen DQC'
	# include the PII classification router (and its seed import) only when
	# explicitly enabled via the PII_CLASSIFICATION_ENABLED env var
	PII_CLASSIFICATION_ENABLED: bool = False


