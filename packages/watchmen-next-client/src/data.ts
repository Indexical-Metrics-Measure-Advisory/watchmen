import {AppState, MainNavKey, DataSource, Topic, Pipeline, PerceiveScenario, AgentLog} from './types';

export const mainNav: Array<{key: MainNavKey; label: string; icon: string}> = [
	{key: 'perceive', label: '感知', icon: '◎'},
	{key: 'ingest', label: '采集', icon: '⬡'},
	{key: 'transform', label: '转换', icon: '⟳'},
	{key: 'model', label: '建模', icon: '◫'},
	{key: 'govern', label: '治理', icon: '⛨'},
	{key: 'feedback', label: '反馈', icon: '↺'},
	{key: 'settings', label: '设置', icon: '⚙'}
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
		title: '订单金额分布漂移',
		description: '系统检测到近 24 小时订单金额分布明显右移，均值从 316 涨至 402，P95 从 1380 涨至 1740。可能存在促销活动或异常订单涌入，建议确认阈值与告警等级。',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-30 10:12:08',
		status: 'pending',
		severity: 'critical',
		confidence: 92,
		driftMetrics: [
			{label: 'P50', baseline: 219, current: 258, unit: 'CNY'},
			{label: 'P95', baseline: 1380, current: 1740, unit: 'CNY'},
			{label: '均值', baseline: 316, current: 402, unit: 'CNY'}
		],
		proposedChanges: [
			{field: 'amount_alert_threshold', baseline: '1200', current: '1600', impact: 'high'},
			{field: 'drift_detection_window', baseline: '7d', current: '14d', impact: 'medium'},
			{field: 'notification_channel', baseline: 'slack:data-alert', current: 'slack:data-alert + email:oncall', impact: 'low'}
		]
	},
	{
		id: 'perceive-2',
		title: '客户ID格式异常增多',
		description: '过去 6 小时内 customer_id 字段出现 1,247 条非标准格式记录（占比 2.3%），远超基线 0.1%。可能为上游系统数据录入规则变更。',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-30 08:45:32',
		status: 'pending',
		severity: 'warning',
		confidence: 87,
		driftMetrics: [
			{label: '异常比例', baseline: 0.1, current: 2.3, unit: '%'},
			{label: '异常记录数', baseline: 54, current: 1247, unit: '条'},
			{label: '影响字段数', baseline: 1, current: 3, unit: '个'}
		],
		proposedChanges: [
			{field: 'customer_id_regex', baseline: '^CUST-\\d{8}$', current: '^CUST-\\d{8,12}$', impact: 'high'},
			{field: 'quality_rule_action', baseline: 'reject', current: 'quarantine', impact: 'medium'}
		]
	},
	{
		id: 'perceive-3',
		title: '新增字段建议：payment_method',
		description: 'AI 分析发现源系统近一周新增 payment_method 字段（覆盖率 98.7%），建议同步采集至 Topic 以提升数据完整性。',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-29 22:10:15',
		status: 'approved',
		severity: 'info',
		confidence: 96,
		driftMetrics: [
			{label: '字段覆盖率', baseline: 0, current: 98.7, unit: '%'},
			{label: '日数据量', baseline: 0, current: 15234, unit: '条'},
			{label: '唯一值数', baseline: 0, current: 5, unit: '个'}
		],
		proposedChanges: [
			{field: 'add_factor', baseline: '—', current: 'payment_method (text)', impact: 'medium'},
			{field: 'pipeline_rebuild', baseline: '否', current: '是', impact: 'low'}
		]
	},
	{
		id: 'perceive-4',
		title: '数据延迟告警恢复',
		description: 'Sales Production DB 数据同步延迟已恢复至 <5s，之前因网络抖动导致的 45s 延迟已自行消除。自动告警已降级。',
		topicName: 'sales_order_raw',
		detectedAt: '2026-03-29 18:30:00',
		status: 'rejected',
		severity: 'info',
		confidence: 78,
		driftMetrics: [
			{label: '同步延迟', baseline: 2.1, current: 3.8, unit: 's'},
			{label: '失败率', baseline: 0, current: 0.02, unit: '%'},
			{label: '吞吐量', baseline: 1240, current: 1198, unit: '条/s'}
		],
		proposedChanges: [
			{field: 'latency_alert_threshold', baseline: '30s', current: '60s', impact: 'low'}
		]
	}
];

export const initialAgentLogs: AgentLog[] = [
	{id: 'log-1', timestamp: '2026-03-30 10:12:08', action: 'detected', scenarioId: 'perceive-1', content: '检测到 sales_order_raw 订单金额分布显著漂移，P95 偏移 +26.1%'},
	{id: 'log-2', timestamp: '2026-03-30 10:12:09', action: 'analyzed', scenarioId: 'perceive-1', content: '分析可能原因：促销活动或异常订单涌入，置信度 92%'},
	{id: 'log-3', timestamp: '2026-03-30 10:12:10', action: 'suggested', scenarioId: 'perceive-1', content: '建议：提升告警阈值 1200→1600，扩大检测窗口 7d→14d'},
	{id: 'log-4', timestamp: '2026-03-30 08:45:32', action: 'detected', scenarioId: 'perceive-2', content: '检测到 customer_id 格式异常比例从 0.1% 飙升至 2.3%'},
	{id: 'log-5', timestamp: '2026-03-30 08:45:33', action: 'analyzed', scenarioId: 'perceive-2', content: '关联分析：异常集中在 3 个上游写入通道'},
	{id: 'log-6', timestamp: '2026-03-30 08:45:34', action: 'suggested', scenarioId: 'perceive-2', content: '建议：放宽正则匹配规则，将 quality_rule_action 从 reject 改为 quarantine'},
	{id: 'log-7', timestamp: '2026-03-29 22:10:15', action: 'detected', scenarioId: 'perceive-3', content: '发现源系统新增 payment_method 字段，覆盖率 98.7%'},
	{id: 'log-8', timestamp: '2026-03-29 22:10:16', action: 'suggested', scenarioId: 'perceive-3', content: '建议同步采集该字段并重建 Pipeline'},
	{id: 'log-9', timestamp: '2026-03-29 18:30:00', action: 'info', scenarioId: 'perceive-4', content: '数据同步延迟已恢复，告警自动降级'}
];

export const initialChat = [
	{
		id: 'msg-1',
		role: 'assistant',
		content: '你好，我是 Watchmen Agent。当前有 2 个待确认的感知事件，请查看并处理。',
		suggestedActions: [
			{label: '查看待确认事件', action: 'VIEW_PENDING'}
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
