from typing import Any, Callable, Optional

from .variables import PipelineVariables

ConstantValue = Callable[[PipelineVariables], Any]


def parse_constant(value: Optional[str]) -> ConstantValue:
	# TODO parse constant
	pass
