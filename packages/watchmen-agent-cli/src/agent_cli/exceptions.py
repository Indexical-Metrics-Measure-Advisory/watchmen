class AgentCliException(Exception):
    exit_code = 1


class ConfigException(AgentCliException):
    exit_code = 3


class AuthenticationException(AgentCliException):
    exit_code = 4


class ApiException(AgentCliException):
    exit_code = 5
