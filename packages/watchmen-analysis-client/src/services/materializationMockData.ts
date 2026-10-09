import type {
	FactorMappingColumn,
	Materialization,
	MaterializationFlow,
	MaterializationRun,
	MockDimensionOption,
	MockMetricOption
} from '@/model/materialization';

export const mockMetricOptions: MockMetricOption[] = [
	{ id: 'm_premium_total', name: 'total_annual_premium_hkd', label: 'Total Annual Premium' },
	{ id: 'm_policy_count', name: 'policy_count', label: 'Policy Count' },
	{ id: 'm_avg_premium', name: 'avg_premium_per_policy', label: 'Avg Premium per Policy' },
	{ id: 'm_claim_ratio', name: 'claim_ratio', label: 'Claim Ratio' },
	{ id: 'm_commission_ratio', name: 'commission_ratio', label: 'Commission Ratio' },
	{ id: 'm_active_banks', name: 'active_banks_count', label: 'Active Banks' }
];

export const mockDimensionsByMetric: Record<string, MockDimensionOption[]> = {
	default: [
		{ id: 'region', name: 'Region', qualifiedName: 'customer.region' },
		{ id: 'channel', name: 'Channel', qualifiedName: 'sales.channel' },
		{ id: 'segment', name: 'Customer Segment', qualifiedName: 'customer.segment' },
		{ id: 'product_line', name: 'Product Line', qualifiedName: 'product.line' },
		{ id: 'bank', name: 'Bank', qualifiedName: 'channel.bank' }
	],
	total_annual_premium_hkd: [
		{ id: 'region', name: 'Region', qualifiedName: 'customer.region' },
		{ id: 'channel', name: 'Channel', qualifiedName: 'sales.channel' },
		{ id: 'product_line', name: 'Product Line', qualifiedName: 'product.line' }
	],
	policy_count: [
		{ id: 'region', name: 'Region', qualifiedName: 'customer.region' },
		{ id: 'segment', name: 'Customer Segment', qualifiedName: 'customer.segment' },
		{ id: 'bank', name: 'Bank', qualifiedName: 'channel.bank' }
	]
};

export const mockTargetTopics = [
	{ id: 'topic_premium_daily', name: 'premium_daily_agg' },
	{ id: 'topic_policy_monthly', name: 'policy_monthly_agg' },
	{ id: 'topic_claim_ratio', name: 'claim_ratio_agg' }
];

export function getMockDimensions(metricName?: string): MockDimensionOption[] {
	if (metricName && mockDimensionsByMetric[metricName]) {
		return mockDimensionsByMetric[metricName];
	}
	return mockDimensionsByMetric.default;
}

export function buildMockFactorMapping(
	metricName: string,
	timeGrain: string,
	groupBy: string[]
): FactorMappingColumn[] {
	const columns: FactorMappingColumn[] = [
		{
			columnName: 'statDate',
			factorName: 'statDate',
			factorType: 'date',
			role: 'time',
			source: `metric_time__${timeGrain}`
		},
		{
			columnName: 'timeGrain',
			factorName: 'timeGrain',
			factorType: 'text',
			role: 'meta',
			source: timeGrain
		}
	];
	groupBy.forEach((dim) => {
		columns.push({
			columnName: dim,
			factorName: dim,
			factorType: 'text',
			role: 'dimension',
			source: dim
		});
	});
	columns.push({
		columnName: 'metricValue',
		factorName: metricName,
		factorType: 'number',
		role: 'metric',
		source: metricName
	});
	return columns;
}

export const seedMaterializations: Materialization[] = [
	{
		materializationId: 'mat_001',
		name: 'Daily Premium by Region',
		metricId: 'm_premium_total',
		metricName: 'total_annual_premium_hkd',
		metricLabel: 'Total Annual Premium',
		targetTopicId: 'topic_premium_daily',
		targetTopicName: 'premium_daily_agg',
		autoCreateTopic: false,
		timeGrain: 'day',
		groupBy: ['region', 'channel'],
		writeMode: 'MERGE',
		engine: 'AUTO',
		schedule: { enabled: true, frequency: 'day', time: '02:00' },
		factorMapping: buildMockFactorMapping('total_annual_premium_hkd', 'day', ['region', 'channel']),
		enabled: true,
		description: 'Roll up daily premium totals per region and channel.',
		createdAt: '2026-08-01T09:00:00.000Z',
		updatedAt: '2026-09-10T11:20:00.000Z'
	},
	{
		materializationId: 'mat_002',
		name: 'Weekly Policy Count by Segment',
		metricId: 'm_policy_count',
		metricName: 'policy_count',
		metricLabel: 'Policy Count',
		targetTopicId: 'topic_policy_monthly',
		targetTopicName: 'policy_monthly_agg',
		autoCreateTopic: false,
		timeGrain: 'week',
		groupBy: ['segment'],
		writeMode: 'TRUNCATE_INSERT',
		engine: 'AUTO',
		schedule: { enabled: true, frequency: 'week', weekday: 'mon', time: '03:30' },
		factorMapping: buildMockFactorMapping('policy_count', 'week', ['segment']),
		enabled: true,
		createdAt: '2026-08-05T10:00:00.000Z',
		updatedAt: '2026-09-12T08:00:00.000Z'
	},
	{
		materializationId: 'mat_003',
		name: 'Monthly Claim Ratio',
		metricId: 'm_claim_ratio',
		metricName: 'claim_ratio',
		metricLabel: 'Claim Ratio',
		targetTopicId: 'topic_claim_ratio',
		targetTopicName: 'claim_ratio_agg',
		autoCreateTopic: false,
		timeGrain: 'month',
		groupBy: ['region'],
		writeMode: 'MERGE',
		engine: 'STORAGE',
		schedule: { enabled: false, frequency: 'month', dayOfMonth: 1, time: '06:00' },
		factorMapping: buildMockFactorMapping('claim_ratio', 'month', ['region']),
		enabled: false,
		createdAt: '2026-08-12T14:00:00.000Z',
		updatedAt: '2026-09-01T16:45:00.000Z'
	},
	{
		materializationId: 'mat_004',
		name: 'Daily Avg Premium by Product',
		metricId: 'm_avg_premium',
		metricName: 'avg_premium_per_policy',
		metricLabel: 'Avg Premium per Policy',
		autoCreateTopic: true,
		timeGrain: 'day',
		groupBy: ['product_line'],
		writeMode: 'MERGE',
		engine: 'SPARK',
		schedule: { enabled: true, frequency: 'day', time: '01:15' },
		factorMapping: buildMockFactorMapping('avg_premium_per_policy', 'day', ['product_line']),
		enabled: true,
		description: 'Auto-creates a wide topic when first run.',
		createdAt: '2026-09-01T09:30:00.000Z',
		updatedAt: '2026-09-15T09:30:00.000Z'
	},
	{
		materializationId: 'mat_005',
		name: 'Commission Ratio Monthly',
		metricId: 'm_commission_ratio',
		metricName: 'commission_ratio',
		metricLabel: 'Commission Ratio',
		targetTopicId: 'topic_claim_ratio',
		targetTopicName: 'claim_ratio_agg',
		autoCreateTopic: false,
		timeGrain: 'month',
		groupBy: ['channel', 'region'],
		writeMode: 'TRUNCATE_INSERT',
		engine: 'AUTO',
		schedule: { enabled: true, frequency: 'month', dayOfMonth: 5, time: '07:00' },
		factorMapping: buildMockFactorMapping('commission_ratio', 'month', ['channel', 'region']),
		enabled: true,
		createdAt: '2026-09-03T12:00:00.000Z',
		updatedAt: '2026-09-18T12:00:00.000Z'
	},
	{
		materializationId: 'mat_006',
		name: 'Active Banks Daily',
		metricId: 'm_active_banks',
		metricName: 'active_banks_count',
		metricLabel: 'Active Banks',
		autoCreateTopic: true,
		timeGrain: 'day',
		groupBy: ['bank'],
		writeMode: 'MERGE',
		engine: 'AUTO',
		schedule: { enabled: false, frequency: 'day', time: '00:30' },
		factorMapping: buildMockFactorMapping('active_banks_count', 'day', ['bank']),
		enabled: false,
		createdAt: '2026-09-08T15:00:00.000Z',
		updatedAt: '2026-09-20T15:00:00.000Z'
	}
];

export const seedRuns: MaterializationRun[] = [
	{
		runId: 'run_1006',
		materializationId: 'mat_001',
		materializationName: 'Daily Premium by Region',
		metricName: 'total_annual_premium_hkd',
		status: 'SUCCESS',
		triggerType: 'cron',
		engine: 'AUTO',
		windowStart: '2026-09-22',
		windowEnd: '2026-09-22',
		rowCount: 48,
		durationMs: 4210,
		sqlPreview: "SELECT CAST(t.metric_time AS DATE) AS statDate, c.region, SUM(m.total_annual_premium_hkd) AS metric_value\nFROM f_premium_fact t\nJOIN dim_customer c ON t.customer_id = c.customer_id\nWHERE t.metric_time >= '2026-09-22' AND t.metric_time < '2026-09-23'\nGROUP BY 1, 2",
		startedAt: '2026-09-23T02:00:03.000Z',
		finishedAt: '2026-09-23T02:00:07.210Z'
	},
	{
		runId: 'run_1005',
		materializationId: 'mat_004',
		materializationName: 'Daily Avg Premium by Product',
		metricName: 'avg_premium_per_policy',
		status: 'FAILED',
		triggerType: 'cron',
		engine: 'SPARK',
		windowStart: '2026-09-22',
		windowEnd: '2026-09-22',
		rowCount: 0,
		durationMs: 1830,
		errorMessage: 'Dimension drift: column product_line not found in semantic model after schema change (expected product_line, found product).',
		sqlPreview: "SELECT CAST(t.metric_time AS DATE) AS statDate, p.product_line,\n  SUM(t.premium_amount) / NULLIF(SUM(t.policy_count), 0) AS metric_value\nFROM f_premium_fact t\nJOIN dim_product p ON t.product_id = p.product_id\nWHERE t.metric_time >= '2026-09-22' AND t.metric_time < '2026-09-23'\nGROUP BY 1, 2",
		startedAt: '2026-09-23T01:15:00.000Z',
		finishedAt: '2026-09-23T01:15:01.830Z'
	},
	{
		runId: 'run_1004',
		materializationId: 'mat_002',
		materializationName: 'Weekly Policy Count by Segment',
		metricName: 'policy_count',
		status: 'SUCCESS',
		triggerType: 'cron',
		engine: 'AUTO',
		windowStart: '2026-09-14',
		windowEnd: '2026-09-20',
		rowCount: 5,
		durationMs: 2650,
		sqlPreview: "SELECT DATE_TRUNC('week', t.metric_time) AS statDate, c.segment,\n  COUNT(DISTINCT t.policy_id) AS metric_value\nFROM f_policy_fact t\nJOIN dim_customer c ON t.customer_id = c.customer_id\nWHERE t.metric_time >= '2026-09-14' AND t.metric_time < '2026-09-21'\nGROUP BY 1, 2",
		startedAt: '2026-09-21T03:30:01.000Z',
		finishedAt: '2026-09-21T03:30:03.650Z'
	},
	{
		runId: 'run_1003',
		materializationId: 'mat_001',
		materializationName: 'Daily Premium by Region',
		metricName: 'total_annual_premium_hkd',
		status: 'SUCCESS',
		triggerType: 'manual',
		engine: 'AUTO',
		windowStart: '2026-09-21',
		windowEnd: '2026-09-21',
		rowCount: 48,
		durationMs: 3980,
		startedAt: '2026-09-22T10:12:00.000Z',
		finishedAt: '2026-09-22T10:12:03.980Z'
	},
	{
		runId: 'run_1002',
		materializationId: 'mat_005',
		materializationName: 'Commission Ratio Monthly',
		metricName: 'commission_ratio',
		status: 'SUCCESS',
		triggerType: 'flow',
		flowId: 'flow_001',
		flowName: 'Monthly Close Pipeline',
		engine: 'AUTO',
		windowStart: '2026-08-01',
		windowEnd: '2026-08-31',
		rowCount: 12,
		durationMs: 7420,
		startedAt: '2026-09-05T07:00:00.000Z',
		finishedAt: '2026-09-05T07:00:07.420Z'
	},
	{
		runId: 'run_1001',
		materializationId: 'mat_003',
		materializationName: 'Monthly Claim Ratio',
		metricName: 'claim_ratio',
		status: 'FAILED',
		triggerType: 'manual',
		engine: 'STORAGE',
		windowStart: '2026-08-01',
		windowEnd: '2026-08-31',
		rowCount: 0,
		durationMs: 512,
		errorMessage: 'Target topic claim_ratio_agg has no writable data source configured (datasource is read-only).',
		startedAt: '2026-09-10T16:00:00.000Z',
		finishedAt: '2026-09-10T16:00:00.512Z'
	},
	{
		runId: 'run_1000',
		materializationId: 'mat_004',
		materializationName: 'Daily Avg Premium by Product',
		metricName: 'avg_premium_per_policy',
		status: 'SUCCESS',
		triggerType: 'cron',
		engine: 'SPARK',
		windowStart: '2026-09-21',
		windowEnd: '2026-09-21',
		rowCount: 8,
		durationMs: 5120,
		startedAt: '2026-09-22T01:15:00.000Z',
		finishedAt: '2026-09-22T01:15:05.120Z'
	},
	{
		runId: 'run_0999',
		materializationId: 'mat_002',
		materializationName: 'Weekly Policy Count by Segment',
		metricName: 'policy_count',
		status: 'SUCCESS',
		triggerType: 'cron',
		engine: 'AUTO',
		windowStart: '2026-09-07',
		windowEnd: '2026-09-13',
		rowCount: 5,
		durationMs: 2410,
		startedAt: '2026-09-14T03:30:01.000Z',
		finishedAt: '2026-09-14T03:30:03.410Z'
	}
];

export const seedFlows: MaterializationFlow[] = [
	{
		flowId: 'flow_001',
		name: 'Monthly Close Pipeline',
		materializationIds: ['mat_001', 'mat_005', 'mat_003'],
		schedule: { enabled: true, frequency: 'month', dayOfMonth: 5, time: '07:00' },
		enabled: true,
		description: 'Chain premium aggregation into commission and claim ratio jobs for monthly close.',
		createdAt: '2026-08-20T10:00:00.000Z',
		updatedAt: '2026-09-05T10:00:00.000Z'
	}
];

export const seedFlowGraphs: Record<string, { nodes: { id: string; materializationId: string; label: string; metricName: string; targetTopicName?: string; status?: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' }[]; edges: { id: string; source: string; target: string; edgeKind: 'data' | 'manual' | 'metricRef'; label?: string }[] }> = {
	flow_001: {
		nodes: [
			{
				id: 'mat_001',
				materializationId: 'mat_001',
				label: 'Daily Premium by Region',
				metricName: 'total_annual_premium_hkd',
				targetTopicName: 'premium_daily_agg',
				status: 'SUCCESS'
			},
			{
				id: 'mat_005',
				materializationId: 'mat_005',
				label: 'Commission Ratio Monthly',
				metricName: 'commission_ratio',
				targetTopicName: 'claim_ratio_agg',
				status: 'SUCCESS'
			},
			{
				id: 'mat_003',
				materializationId: 'mat_003',
				label: 'Monthly Claim Ratio',
				metricName: 'claim_ratio',
				targetTopicName: 'claim_ratio_agg',
				status: 'FAILED'
			}
		],
		edges: [
			{ id: 'e-1', source: 'mat_001', target: 'mat_005', edgeKind: 'data', label: 'premium_daily_agg' },
			{ id: 'e-2', source: 'mat_005', target: 'mat_003', edgeKind: 'metricRef', label: 'commission_ratio → claim_ratio' }
		]
	}
};
