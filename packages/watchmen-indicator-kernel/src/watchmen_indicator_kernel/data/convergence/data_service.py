from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_model.indicator import Convergence


class ConvergenceAxisSegment(BaseModel):
	name: str
	segments: Optional[List[ConvergenceAxisSegment]]


class ConvergenceCellValue(BaseModel):
	row: int
	col: int
	value: Optional[str]
	failed: bool


class ConvergenceData(BaseModel):
	xAxis: List[ConvergenceAxisSegment]
	yAxis: List[ConvergenceAxisSegment]
	values: List[ConvergenceCellValue]


class ConvergenceDataService:
	def __init__(self, convergence: Convergence, principal_service: PrincipalService):
		self.principalService = principal_service
		self.convergence = convergence

	def ask_values(self):
		# TODO
		pass
