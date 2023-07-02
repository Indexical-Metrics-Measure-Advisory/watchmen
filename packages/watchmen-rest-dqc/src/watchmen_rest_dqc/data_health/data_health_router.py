
from typing import Optional

from fastapi import Depends, APIRouter

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_model.admin import UserRole
from watchmen_model.dqc.monitor_result import MonitorResult, PipelineMonitorResult
from watchmen_rest import get_admin_principal
from watchmen_rest_dqc.data_health.service.pipeline_health_monitor import PipelineMonitorHealthService
from watchmen_utilities import is_date, ArrayHelper

router = APIRouter()

def enable_pipeline_monitor():
	return True




@router.get('/dqc/error/monitor', tags=[UserRole.ADMIN], response_model=Optional[MonitorResult])
async  def run_monitor(start_date:Optional[str],end_date:Optional[str],principal_service: PrincipalService = Depends(get_admin_principal)):
	parsed, start_query_date = is_date(start_date, ask_all_date_formats())
	parsed, end_query_date = is_date(end_date, ask_all_date_formats())
	monitor_result = MonitorResult()
	pipeline_health_service:PipelineMonitorHealthService  =  PipelineMonitorHealthService(principal_service)
	pipeline_error_result: PipelineMonitorResult = await pipeline_health_service.run_health_check(start_query_date, end_query_date)
	monitor_result.pipelineError = pipeline_error_result
	if pipeline_error_result.errorCount > 0:
		monitor_result.hasError = True
	groups = ArrayHelper(pipeline_error_result.errorDetails).group_by(lambda x:x["topicId"]+"_"+x["pipelineId"])

	for key ,value_list in groups.items():
		topic_id ,pipeline_id = key.split("_")
		topic_name:str = await pipeline_health_service.get_topic_name(topic_id)
		pipeline_name:str = await pipeline_health_service.get_pipeline_name(pipeline_id)
		pipeline_error_result.errorSummary[topic_name+"[pipeline: "+pipeline_name+"]"] = len(value_list)

	return monitor_result





