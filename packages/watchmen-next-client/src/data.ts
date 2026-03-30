import {AppState, MainNavKey, DataSource, Topic, Pipeline} from './types';

export const mainNav: Array<{key: MainNavKey; label: string}> = [
	{key: 'ingest', label: '1. Ingest (采集)'},
	{key: 'transform', label: '2. Transform (转换)'},
	{key: 'model', label: '3. Model (建模)'},
	{key: 'govern', label: '4. Govern (治理)'},
	{key: 'perceive', label: '5. Perceive (感知)'},
	{key: 'feedback', label: '6. Feedback (反馈)'},
	{key: 'settings', label: 'Settings (设置)'}
];

export const initialDataSources: DataSource[] = [
	{dataSourceId: 'ds-1', dataSourceCode: 'mysql_sales', dataSourceType: 'mysql', host: '192.168.1.10', name: 'Sales Production DB'}
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

export const initialChat = [
	{
		id: 'msg-1',
		role: 'assistant',
		content: '你好，我是 Watchmen Copilot。我发现你已经连接了 "Sales Production DB" 数据源。',
		suggestedActions: [
			{label: '从 sales_order_raw 自动生成转换管道', action: 'GENERATE_PIPELINE', payload: {topicId: 't-1'}},
			{label: '检查当前数据质量规则', action: 'CHECK_QUALITY'}
		]
	}
];

export const initialWorkflow = [
	{id: 'wf-1', module: 'ingest', title: 'Source connected', description: 'Sales Production DB (MySQL)', status: 'completed'},
	{id: 'wf-2', module: 'model', title: 'Topic defined', description: 'sales_order_raw (Raw Topic)', status: 'completed'},
	{id: 'wf-3', module: 'transform', title: 'Sync Pipeline', description: 'sync_sales_order_to_dw', status: 'in_progress'},
	{id: 'wf-4', module: 'govern', title: 'Pending Rules', description: 'Waiting for pipeline completion', status: 'pending'}
];

export const createInitialState = (): AppState => ({
	main: 'ingest',
	chatHistory: initialChat as any,
	activeWorkflow: initialWorkflow as any,
	isChatting: false,
	dataSources: initialDataSources,
	topics: initialTopics,
	pipelines: initialPipelines
});
