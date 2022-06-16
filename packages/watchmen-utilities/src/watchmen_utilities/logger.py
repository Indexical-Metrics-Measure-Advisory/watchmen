from enum import Enum
from logging import DEBUG, ERROR, FATAL, Formatter, getLogger, handlers, INFO, NOTSET, StreamHandler, WARNING
from sys import stdout

from pydantic import BaseSettings
from pythonjsonlogger.jsonlogger import JsonFormatter


class LogLevel(str, Enum):
	FATAL = 'FATAL',
	ERROR = 'ERROR',
	WARN = 'WARN',
	INFO = 'INFO',
	DEBUG = 'DEBUG'


class LoggerSettings(BaseSettings):
	LOGGER_LEVEL: LogLevel = LogLevel.ERROR
	LOGGER_TO_FILE: bool = False
	LOGGER_FILE: str = 'temp/rotating.log'
	LOGGER_FILE_SIZE: int = 10242880
	LOGGER_FILE_BACKUP_COUNT: int = 5
	LOGGER_FILE_ENCODING: str = 'utf-8'
	LOGGER_JSON_FORMAT: bool = False
	# noinspection SpellCheckingInspection
	LOGGER_FORMAT: str = '%(asctime)s - %(process)d - %(threadName)s - %(name)s - %(levelname)s - %(message)s'

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


def get_logger_level(level: LogLevel) -> int:
	if level == LogLevel.FATAL:
		return FATAL
	elif level == LogLevel.ERROR:
		return ERROR
	elif level == LogLevel.WARN:
		return WARNING
	elif level == LogLevel.INFO:
		return INFO
	elif level == LogLevel.DEBUG:
		return DEBUG
	else:
		return ERROR


def init_log():
	settings = LoggerSettings()
	logger = getLogger()
	logger.setLevel(NOTSET)

	logger_level = get_logger_level(settings.LOGGER_LEVEL)

	# Add stdout handler, with level INFO
	console = StreamHandler(stdout)
	console.setLevel(logger_level)
	formatter = Formatter(settings.LOGGER_FORMAT)
	console.setFormatter(formatter)
	logger.addHandler(console)

	# Add file rotating handler
	if settings.LOGGER_TO_FILE:
		file_log_handler = handlers.RotatingFileHandler(
			filename=settings.LOGGER_FILE,
			maxBytes=settings.LOGGER_FILE_SIZE,
			backupCount=settings.LOGGER_FILE_BACKUP_COUNT,
			encoding=settings.LOGGER_FILE_ENCODING)
		file_log_handler.setLevel(logger_level)
		if settings.LOGGER_JSON_FORMAT:
			formatter = JsonFormatter(settings.LOGGER_FORMAT)
		else:
			formatter = Formatter(settings.LOGGER_FORMAT)
		file_log_handler.setFormatter(formatter)
		logger.addHandler(file_log_handler)

	logger.info(f'Logger settings[{settings.dict()}].')
