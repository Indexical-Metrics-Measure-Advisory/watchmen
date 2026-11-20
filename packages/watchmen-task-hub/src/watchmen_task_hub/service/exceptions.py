class TaskHubException(Exception):
	pass


class TaskValidationException(TaskHubException):
	pass


class TaskNotFoundException(TaskHubException):
	pass


class TaskConflictException(TaskHubException):
	pass


class TaskAccessDeniedException(TaskHubException):
	pass


class TaskCapabilityException(TaskHubException):
	pass
