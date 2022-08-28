from watchmen_model.common import SettingsModel


class S3CollectorSettings(SettingsModel):
	access_key_id: str
	secret_access_key: str
	bucket_name: str
	region: str
	token: str
	tenant_id: int
	consume_prefix: str
	dead_prefix: str
	max_keys: int = 10
	clean_task_interval: int = 3600
