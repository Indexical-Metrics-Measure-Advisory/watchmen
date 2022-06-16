from enum import Enum


class MixedImportType(str, Enum):
	NON_REDUNDANT = 'non-redundant'
	REPLACE = 'replace'
	FORCE_NEW = 'force-new'


NON_REDUNDANT = 'non-redundant'
REPLACE = 'replace'
FORCE_NEW = 'force-new'

login_url = '/login'
access_token = 'accessToken'

pipeline_id = 'pipelineId'
topic_id = 'topicId'
space_id = 'spaceId'
connect_id = 'connectId'

topics = 'topics'
pipelines = 'pipelines'
spaces = 'spaces'
connected_spaces = 'connectedSpaces'
import_type = 'importType'

prefix_encoding = '<a href="data:application/json;base64,'
