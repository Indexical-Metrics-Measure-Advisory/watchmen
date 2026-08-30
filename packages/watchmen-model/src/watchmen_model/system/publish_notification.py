from enum import Enum
from typing import List, Optional

from watchmen_model.common import OptimisticLock, TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


class PublishNotificationTargetType(str, Enum):
	# feishu custom bot webhook
	FEISHU = 'feishu'
	# generic http endpoint which accepts the published config payload as json
	WEBHOOK = 'webhook'


class PublishNotificationResource(str, Enum):
	TOPIC = 'topic'
	PIPELINE = 'pipeline'


class PublishNotificationSetting(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	# one setting per tenant, decides where the config published event is sent to
	settingId: Optional[str] = None
	# notify only when enabled
	enabled: bool = False
	# resources whose publish action triggers the notification
	resources: List[PublishNotificationResource] = []
	# target type of the external system
	type: Optional[PublishNotificationTargetType] = None
	# feishu bot webhook url, or the url of a generic http endpoint
	url: Optional[str] = None
	# sign secret of the feishu bot, or bearer token of the generic endpoint
	secret: Optional[str] = None
