class OperationCliException(Exception):
	exit_code = 1


class ConfigException(OperationCliException):
	exit_code = 2


class AuthenticationException(OperationCliException):
	exit_code = 3


class ApiException(OperationCliException):
	exit_code = 4
