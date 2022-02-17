from typing import Any, Callable

from watchmen_model.admin import Conditional

PrerequisiteDefinedAs = Callable[[], Any]


def parse_prerequisite_defined_as(conditional: Conditional) -> PrerequisiteDefinedAs:
	defined_as = {
		'conditional': False if conditional.conditional is None else conditional.conditional,
		'on': None if conditional.on is None else conditional.on.dict()
	}

	return lambda: defined_as
