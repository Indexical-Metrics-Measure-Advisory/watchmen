export type MainNavKey =
	| 'ingest'
	| 'transform'
	| 'model'
	| 'govern'
	| 'perceive'
	| 'feedback'
	| 'settings';

export type ChatMessage = {
	id: string;
	role: 'system' | 'user' | 'assistant';
	content: string;
	suggestedActions?: Array<{label: string, action: string, payload?: any}>;
};

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type WorkflowTask = {
	id: string;
	module: MainNavKey;
	title: string;
	description: string;
	status: TaskStatus;
	requiresUserConfirmation?: boolean;
};

// --- Watchmen Business Models ---

export type DataSourceType = 'mysql' | 'oracle' | 'mongodb' | 'mssql' | 'postgresql' | 'snowflake' | 'oss' | 's3' | 'adls';

export type DataSource = {
	dataSourceId: string;
	dataSourceCode: string;
	dataSourceType: DataSourceType;
	host?: string;
	port?: string;
	username?: string;
	name: string;
	url?: string;
};

export type TopicKind = 'system' | 'business' | 'synonym';
export type TopicType = 'raw' | 'meta' | 'distinct' | 'aggregate' | 'time' | 'ratio';

export type Factor = {
	factorId: string;
	name: string;
	label?: string;
	type: string;
};

export type Topic = {
	topicId: string;
	name: string;
	type: TopicType;
	kind: TopicKind;
	dataSourceId?: string;
	factors: Factor[];
	description?: string;
};

export type PipelineTriggerType = 'insert' | 'merge' | 'insert-or-merge' | 'delete';

export type Pipeline = {
	pipelineId: string;
	topicId: string; // source topic
	name: string;
	type: PipelineTriggerType;
	enabled: boolean;
	validated: boolean;
};

export type AppState = {
	main: MainNavKey;
	chatHistory: Array<ChatMessage>;
	activeWorkflow: Array<WorkflowTask>;
	isChatting: boolean;
	// Business Data
	dataSources: DataSource[];
	topics: Topic[];
	pipelines: Pipeline[];
};
