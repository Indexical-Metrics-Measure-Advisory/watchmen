from logging import getLogger
from typing import Any, Callable

from watchmen_model.admin import PipelineAction

logger = getLogger(__name__)

ActionDefinedAs = Callable[[], Any]


def parse_action_defined_as(action: PipelineAction) -> ActionDefinedAs:
	logger.info("action type is: " + action.type)
	defined_as = action.dict()
	return lambda: defined_as
