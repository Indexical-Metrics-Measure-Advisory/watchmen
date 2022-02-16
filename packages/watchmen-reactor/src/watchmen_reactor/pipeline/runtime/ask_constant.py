from typing import Callable, Optional

from .variables import PipelineVariables

ConstantValue = Callable[[PipelineVariables], bool]


def parse_constant(value: Optional[str]) -> ConstantValue:
	# TODO parse constant
	pass
