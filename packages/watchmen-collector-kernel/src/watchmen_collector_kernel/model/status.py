from enum import Enum


class Status(int, Enum):
	INITIAL = 0,
	EXECUTING = 1,
	SUCCESS = 2,
	FAIL = 3
