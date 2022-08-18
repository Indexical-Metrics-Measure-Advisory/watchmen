import json
from urllib import request

from src.watchmen_indicator_kernel.common.settings import ask_plugin_host
from watchmen_model.indicator import AchievementPluginTask
from watchmen_model.system import Plugin


def call_connector_service(task: AchievementPluginTask, plugin: Plugin):
	data = {
		'achievementTaskId': str(task.achievementTaskId),
		'achievementId': str(task.achievementId),
		'pluginType': plugin.type
	}
	req = request.Request(ask_plugin_host() + '/task/run', method='POST')
	req.add_header('Content-Type', 'application/json')
	data = json.dumps(data)
	data = data.encode()
	request.urlopen(req, data=data)
