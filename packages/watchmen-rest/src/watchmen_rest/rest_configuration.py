from typing import Callable

from fastapi import FastAPI
from pydantic import BaseModel


class RestConfiguration(BaseModel):
	title: str = 'Watchmen Doll'
	version: str = '16.0.0'
	description: str = 'A lighter platform for data analytics'
	cors: bool = True

	"""
	do post construction
	"""
	post_construct: Callable[[FastAPI], None] = None
