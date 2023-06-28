from typing import Dict, Any

from pydantic import BaseModel


class RawTopicMonitorResult(BaseModel):
	rawTopicErrorCount:int = None
	rawTopicErrorDetails:Dict = None


class PipelineMonitorResult(BaseModel):
	errorCount:int = None
	errorSummary:Dict = {}
	errorDetails:Any = {}

class MonitorResult(BaseModel):
	hasError:bool = False
	rawTopicError:RawTopicMonitorResult = None
	pipelineError:PipelineMonitorResult = None
