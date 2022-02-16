from typing import Callable, Optional

from watchmen_reactor.pipeline.runtime import PipelineVariables

ConstantValue = Callable[[PipelineVariables], bool]


def parse_constant(value: Optional[str]) -> ConstantValue:
	# TODO parse constant
	pass
