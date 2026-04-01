class AgentRuntimeCliException(Exception):
    exit_code = 1


class ConfigException(AgentRuntimeCliException):
    exit_code = 2


class AuthenticationException(AgentRuntimeCliException):
    exit_code = 3


class ApiException(AgentRuntimeCliException):
    exit_code = 4
