from __future__ import annotations

from typing import List, Optional
from watchmen_auth import PrincipalService
from watchmen_model.indicator import Convergence
from watchmen_utilities import ExtendedBaseModel


class ConvergenceAxisSegment(ExtendedBaseModel):
	name: Optional[str] = None
	segments: Optional[List[ConvergenceAxisSegment]] = None


class ConvergenceCellValue(ExtendedBaseModel):
	row: Optional[int] = None
	col: Optional[int] = None
	value: Optional[str] = None
	failed: Optional[bool] = None


class ConvergenceData(ExtendedBaseModel):
	xAxis: Optional[List[ConvergenceAxisSegment]] = None
	yAxis: Optional[List[ConvergenceAxisSegment]] = None
	values: Optional[List[ConvergenceCellValue]] = None


class ConvergenceDataService:
	def __init__(self, convergence: Convergence, principal_service: PrincipalService):
		self.principalService = principal_service
		self.convergence = convergence

	def ask_values(self):
		# TODO
		pass
