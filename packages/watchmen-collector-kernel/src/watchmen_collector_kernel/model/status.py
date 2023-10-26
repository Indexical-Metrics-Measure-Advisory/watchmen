from enum import Enum


class Status(int, Enum):
	INITIAL = 0,
	EXECUTING = 1,
	SUCCESS = 2,
	FAIL = 3


class ExecutionStatus(int, Enum):
	SHOULD_RUN = 1,
	EXECUTING_BY_OTHERS = 2,
	FINISHED = 3
