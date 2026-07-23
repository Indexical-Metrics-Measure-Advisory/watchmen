// Monitor result models — mirror watchmen-model dqc/monitor_data.py + monitor_result.py.
// Source: packages/watchmen-model/src/watchmen_model/dqc/{monitor_data,monitor_result}.py
// Endpoints: POST /dqc/monitor/result (monitor/topic_monitor_router.py),
// GET /dqc/error/monitor (data_health/data_health_router.py)

import type { MonitorRuleCode } from './monitorRule';

/** `MonitorRuleLog` model — one aggregated hit row of a rule on a topic/factor. */
export interface MonitorRuleLog {
	ruleCode?: MonitorRuleCode;
	topicId?: string;
	factorId?: string;
	count?: number;
	lastOccurredTime?: string;
}

/** `MonitorRuleLogCriteria` model — body of POST /dqc/monitor/result. */
export interface MonitorRuleLogCriteria {
	startDate?: string;
	endDate?: string;
	ruleCode?: MonitorRuleCode;
	topicId?: string;
	factorId?: string;
}

/** `RawTopicMonitorResult` model. */
export interface RawTopicMonitorResult {
	rawTopicErrorCount?: number;
	rawTopicErrorDetails?: Record<string, any>;
}

/** `PipelineMonitorResult` model — pipeline errors grouped by topic+pipeline. */
export interface PipelineMonitorResult {
	errorCount?: number;
	errorSummary?: Record<string, number>;
	errorDetails?: Array<Record<string, any>>;
}

/** `MonitorResult` model — response of GET /dqc/error/monitor. */
export interface MonitorResult {
	hasError?: boolean;
	rawTopicError?: RawTopicMonitorResult;
	pipelineError?: PipelineMonitorResult;
}
