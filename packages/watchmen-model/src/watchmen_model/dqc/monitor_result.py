from typing import Dict, Any, List

from pydantic import BaseModel


class RawTopicMonitorResult(BaseModel):
	rawTopicErrorCount:int = None
	rawTopicErrorDetails:Dict = None


class PipelineMonitorResult(BaseModel):
	errorCount:int = None
	errorSummary:Dict = {}
	errorDetails:List[Any] = []

class MonitorResult(BaseModel):
	hasError:bool = False
	rawTopicError:RawTopicMonitorResult = None
	pipelineError:PipelineMonitorResult = None
