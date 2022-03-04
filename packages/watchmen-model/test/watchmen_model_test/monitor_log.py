from datetime import datetime
from unittest import TestCase

from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogStatus, PipelineMonitorLog


def now():
	return datetime.now().replace(tzinfo=None)


class MonitorLogTest(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_serialize(self):
		pipeline_log = PipelineMonitorLog(
			uid='1',
			traceId='1',
			pipelineId='1', topicId='1',
			status=MonitorLogStatus.DONE, startTime=now(), spentInMills=0, error=None,
			oldValue=None,
			newValue=None,
			prerequisite=True,
			prerequisiteDefinedAs={'conditional': False, 'on': None},
			stages=[
				MonitorLogStage(
					stageId='1', name='stage 1',
					status=MonitorLogStatus.DONE, startTime=now(), spentInMills=0, error=None,
					prerequisite=True,
					prerequisiteDefinedAs={'conditional': False, 'on': None},
					units=[]
				)
			]
		)
		d = pipeline_log.dict()
		print(d)
