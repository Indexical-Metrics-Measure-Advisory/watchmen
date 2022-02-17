from typing import Any, Callable, Optional

from watchmen_auth import PrincipalService
from .variables import PipelineVariables

ConstantValue = Callable[[PipelineVariables], Any]


# noinspection PyUnusedLocal
def parse_constant(value: Optional[str], principal_service: PrincipalService) -> ConstantValue:
	# TODO parse constant
	pass
