from typing import Any, Callable

from watchmen_model.admin import PipelineAction

ActionDefinedAs = Callable[[], Any]


def parse_action_defined_as(action: PipelineAction) -> ActionDefinedAs:
	defined_as = action.dict()
	return lambda: defined_as
