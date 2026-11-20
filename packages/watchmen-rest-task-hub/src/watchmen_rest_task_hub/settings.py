import socket

from watchmen_rest import RestSettings


class TaskHubSettings(RestSettings):
	APP_NAME: str = 'Watchmen Task Hub'
	VERSION: str = '18.0.0'
	DESCRIPTION: str = 'Unified task registration, orchestration and monitoring'
	TASKHUB_ON: bool = True
	TASKHUB_SYNC_INTERVAL: int = 60
	TASKHUB_DISCOVER_INTERVAL: int = 600
	TASKHUB_DEPENDENCY_EVAL_INTERVAL: int = 60
	TASKHUB_CALLBACK_TIMEOUT_MINUTES: int = 30
	TASKHUB_DEPENDENCY_MAX_DEPTH: int = 20
	TASKHUB_RUN_RETENTION_DAYS: int = 90
	TASKHUB_MAP_MAX_NODES: int = 200
	TASKHUB_NODE_ID: str = socket.gethostname()
	TASKHUB_NODE_ADDRESS: str = ''


taskhub_settings = TaskHubSettings()
