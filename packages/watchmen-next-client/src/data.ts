import {AppState, MainNavKey, DataSource, Topic, Pipeline, PerceiveScenario, AgentLog} from './types';

export const mainNav: Array<{key: MainNavKey; label: string; icon: string}> = [
	{key: 'perceive', label: 'Perceive', icon: '◎'},
	{key: 'ingest', label: 'Ingest', icon: '⬡'},
	{key: 'transform', label: 'Transform', icon: '⟳'},
	{key: 'model', label: 'Model', icon: '◫'},
	{key: 'govern', label: 'Govern', icon: '⛨'},
	{key: 'feedback', label: 'Feedback', icon: '↺'},
	{key: 'settings', label: 'Settings', icon: '⚙'}
];

export const initialDataSources: DataSource[] = [
	{dataSourceId: 'ds-1', dataSourceCode: 'mysql_sales', dataSourceType: 'mysql', host: '192.168.1.10', name: 'Sales Production DB'},
	{dataSourceId: 'ds-2', dataSourceCode: 'pg_analytics', dataSourceType: 'postgresql', host: '192.168.1.20', name: 'Analytics DW'}
];

export const initialTopics: Topic[] = [
	{
		topicId: 't-1',
		name: 'sales_order_raw',
		type: 'raw',
		kind: 'business',
		dataSourceId: 'ds-1',
		factors: [
			{factorId: 'f-1', name: 'order_id', label: 'Order ID', type: 'text'},
			{factorId: 'f-2', name: 'amount', label: 'Amount', type: 'number'},
			{factorId: 'f-3', name: 'customer_id', label: 'Customer ID', type: 'text'}
		],
		description: 'Raw sales order data from MySQL'
	}
];

export const initialPipelines: Pipeline[] = [
	{
		pipelineId: 'p-1',
		topicId: 't-1',
		name: 'sync_sales_order_to_dw',
		type: 'insert-or-merge',
		enabled: true,
		validated: true
	}
];

export const initialPerceiveScenarios: PerceiveScenario[] = [
	{
		id: 'perceive-1',
		title: 'Order Amount Distribution Drift',
		description: 'Significant rightward shift detected in order amounts over the past 24 hours. Mean rose from 316 to 402, P95 from 1,380 to 1,740. Possible causes include promotional activity or anomalous order influx. Recommend reviewing alert thresholds.',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-30 10:12:08',
		status: 'pending',
		severity: 'critical',
		confidence: 92,
		driftMetrics: [
			{label: 'P50', baseline: 219, current: 258, unit: 'CNY'},
			{label: 'P95', baseline: 1380, current: 1740, unit: 'CNY'},
			{label: 'Mean', baseline: 316, current: 402, unit: 'CNY'}
		],
		proposedChanges: [
			{field: 'amount_alert_threshold', baseline: '1200', current: '1600', impact: 'high'},
			{field: 'drift_detection_window', baseline: '7d', current: '14d', impact: 'medium'},
			{field: 'notification_channel', baseline: 'slack:data-alert', current: 'slack:data-alert + email:oncall', impact: 'low'}
		]
	},
	{
		id: 'perceive-2',
		title: 'Customer ID Format Anomalies',
		description: 'Over the past 6 hours, 1,247 non-standard customer_id records detected (2.3%), far exceeding the 0.1% baseline. Likely caused by upstream data entry rule changes.',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-30 08:45:32',
		status: 'pending',
		severity: 'warning',
		confidence: 87,
		driftMetrics: [
			{label: 'Anomaly Rate', baseline: 0.1, current: 2.3, unit: '%'},
			{label: 'Anomaly Records', baseline: 54, current: 1247, unit: ''},
			{label: 'Affected Fields', baseline: 1, current: 3, unit: ''}
		],
		proposedChanges: [
			{field: 'customer_id_regex', baseline: '^CUST-\\d{8}$', current: '^CUST-\\d{8,12}$', impact: 'high'},
			{field: 'quality_rule_action', baseline: 'reject', current: 'quarantine', impact: 'medium'}
		]
	},
	{
		id: 'perceive-3',
		title: 'New Field Suggestion: payment_method',
		description: 'AI detected a new payment_method field in the source system over the past week (coverage 98.7%). Recommend syncing it to the Topic to improve data completeness.',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-29 22:10:15',
		status: 'approved',
		severity: 'info',
		confidence: 96,
		driftMetrics: [
			{label: 'Field Coverage', baseline: 0, current: 98.7, unit: '%'},
			{label: 'Daily Records', baseline: 0, current: 15234, unit: ''},
			{label: 'Unique Values', baseline: 0, current: 5, unit: ''}
		],
		proposedChanges: [
			{field: 'add_factor', baseline: '—', current: 'payment_method (text)', impact: 'medium'},
			{field: 'pipeline_rebuild', baseline: 'No', current: 'Yes', impact: 'low'}
		]
	},
	{
		id: 'perceive-4',
		title: 'Data Latency Alert Recovered',
		description: 'Sales Production DB sync latency has recovered to <5s. The previous 45s delay caused by network jitter has resolved automatically. Alert has been auto-downgraded.',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-29 18:30:00',
		status: 'rejected',
		severity: 'info',
		confidence: 78,
		driftMetrics: [
			{label: 'Sync Latency', baseline: 2.1, current: 3.8, unit: 's'},
			{label: 'Failure Rate', baseline: 0, current: 0.02, unit: '%'},
			{label: 'Throughput', baseline: 1240, current: 1198, unit: 'rows/s'}
		],
		proposedChanges: [
			{field: 'latency_alert_threshold', baseline: '30s', current: '60s', impact: 'low'}
		]
	}
];

export const initialAgentLogs: AgentLog[] = [
	{id: 'log-1', timestamp: '2026-03-30 10:12:08', action: 'detected', scenarioId: 'perceive-1', content: 'Significant order amount distribution drift detected on sales_order_raw, P95 shifted +26.1%'},
	{id: 'log-2', timestamp: '2026-03-30 10:12:09', action: 'analyzed', scenarioId: 'perceive-1', content: 'Analysis: likely caused by promotional activity or anomalous order influx, confidence 92%'},
	{id: 'log-3', timestamp: '2026-03-30 10:12:10', action: 'suggested', scenarioId: 'perceive-1', content: 'Suggestion: raise alert threshold 1200→1600, extend detection window 7d→14d'},
	{id: 'log-4', timestamp: '2026-03-30 08:45:32', action: 'detected', scenarioId: 'perceive-2', content: 'customer_id format anomaly rate surged from 0.1% to 2.3%'},
	{id: 'log-5', timestamp: '2026-03-30 08:45:33', action: 'analyzed', scenarioId: 'perceive-2', content: 'Correlation: anomalies concentrated in 3 upstream write channels'},
	{id: 'log-6', timestamp: '2026-03-30 08:45:34', action: 'suggested', scenarioId: 'perceive-2', content: 'Suggestion: relax regex matching rules, change quality_rule_action from reject to quarantine'},
	{id: 'log-7', timestamp: '2026-03-29 22:10:15', action: 'detected', scenarioId: 'perceive-3', content: 'New payment_method field detected in source system, coverage 98.7%'},
	{id: 'log-8', timestamp: '2026-03-29 22:10:16', action: 'suggested', scenarioId: 'perceive-3', content: 'Suggestion: sync this field and rebuild pipeline'},
	{id: 'log-9', timestamp: '2026-03-29 18:30:00', action: 'info', scenarioId: 'perceive-4', content: 'Data sync latency recovered, alert auto-downgraded'}
];

export const initialChat = [
	{
		id: 'msg-1',
		role: 'assistant',
		content: 'Hello, I\'m the Watchmen Agent. There are 2 pending perception events awaiting your review.',
		suggestedActions: [
			{label: 'View Pending Events', action: 'VIEW_PENDING'}
		]
	}
];

export const initialWorkflow = [
	{id: 'wf-1', module: 'ingest', title: 'Source connected', description: 'Sales Production DB (MySQL)', status: 'completed'},
	{id: 'wf-2', module: 'model', title: 'Topic defined', description: 'sales_order_raw (Raw Topic)', status: 'completed'},
	{id: 'wf-3', module: 'transform', title: 'Sync Pipeline', description: 'sync_sales_order_to_dw', status: 'completed'},
	{id: 'wf-4', module: 'govern', title: 'Quality Monitoring', description: 'Active — 2 drifts detected', status: 'in_progress'}
];

export const createInitialState = (): AppState => ({
	main: 'perceive',
	chatHistory: initialChat as any,
	activeWorkflow: initialWorkflow as any,
	isChatting: false,
	dataSources: initialDataSources,
	topics: initialTopics,
	pipelines: initialPipelines,
	perceiveScenarios: [...initialPerceiveScenarios],
	selectedScenarioId: 'perceive-1',
	agentLogs: [...initialAgentLogs],
	eventFilter: 'all'
});
