from pydantic import BaseModel, ConfigDict
from pydantic_settings import BaseSettings


class ExtendedBaseModel(BaseModel):
	model_config = ConfigDict(arbitrary_types_allowed=True)


class ExtendedBaseSettings(BaseSettings):

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
		extra = 'ignore'
