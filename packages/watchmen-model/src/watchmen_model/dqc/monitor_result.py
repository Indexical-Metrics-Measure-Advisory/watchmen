from typing import Dict, Any, List, Optional

from watchmen_utilities import ExtendedBaseModel


class RawTopicMonitorResult(ExtendedBaseModel):
	rawTopicErrorCount: Optional[int] = None
	rawTopicErrorDetails: Optional[Dict] = None


class PipelineMonitorResult(ExtendedBaseModel):
	errorCount: Optional[int] = None
	errorSummary: Optional[Dict] = {}
	errorDetails: Optional[List[Any]] = []


class MonitorResult(ExtendedBaseModel):
	hasError: Optional[bool] = False
	rawTopicError: Optional[RawTopicMonitorResult] = None
	pipelineError: Optional[PipelineMonitorResult] = None
