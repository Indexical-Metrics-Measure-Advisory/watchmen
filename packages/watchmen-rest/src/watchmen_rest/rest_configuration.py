from pydantic import BaseModel


class RestConfiguration(BaseModel):
	title: str = 'Watchmen Doll'
	version: str = '16.0.0'
	description: str = 'A lighter platform for data analytics'
	cors: bool = True

	prometheus: bool = False
