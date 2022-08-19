
from watchmen_model.common import SettingsModel


class S3CollectorSettings(SettingsModel):
	access_key_id: str
	secret_access_key: str
	bucket_name: str
	region: str
	token: str
