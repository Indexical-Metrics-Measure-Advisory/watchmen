import { DataSourceType, HealthStatus, Severity, RuleCategory, MaskingPolicy, Topic, Pipeline, PipelineTriggerType, AgentLogAction } from "../models";

export const formatCount = (n?: number): string => {
	if (n == null) return '—';
	if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
	if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
	return String(n);
};

export const healthBadge = (s: HealthStatus): string => {
	switch (s) {
		case 'healthy': return '<span class="wm-status-dot healthy"></span><span>Healthy</span>';
		case 'warning': return '<span class="wm-status-dot warning"></span><span>Warning</span>';
		case 'error': return '<span class="wm-status-dot error"></span><span>Error</span>';
		default: return '<span class="wm-status-dot unknown"></span><span>Unknown</span>';
	}
};

export const healthLabel = (s?: HealthStatus | string): string => {
	if (!s) return '';
	const map: Record<string, string> = {
		healthy: '<span class="wm-status-dot healthy"></span>Healthy',
		warning: '<span class="wm-status-dot warning"></span>Warning',
		error: '<span class="wm-status-dot error"></span>Error',
	};
	return map[s] || '';
};

export const sourceTypeIcon = (t: DataSourceType): string => {
	const map: Record<DataSourceType, string> = {
		mysql: '🐬',
		postgresql: '🐘',
		mongodb: '🍃',
		oracle: '🔴',
		mssql: '🟦',
		snowflake: '❄️',
		oss: '☁️',
		s3: '🪣',
		adls: '📦',
	};
	return map[t] || '💾';
};

export const topicTypeBadge = (t: Topic['type']): string => {
	const map: Record<string, string> = {
		raw: '<span class="wm-topic-badge raw">RAW</span>',
		meta: '<span class="wm-topic-badge meta">META</span>',
		distinct: '<span class="wm-topic-badge distinct">DISTINCT</span>',
		aggregate: '<span class="wm-topic-badge aggregate">AGGREGATE</span>',
		time: '<span class="wm-topic-badge time">TIME</span>',
		ratio: '<span class="wm-topic-badge ratio">RATIO</span>',
	};
	return map[t] || '';
};

export const pipelineTypeLabel = (t: PipelineTriggerType): string => {
	const map: Record<PipelineTriggerType, string> = {
		'insert': 'INSERT',
		'merge': 'MERGE',
		'insert-or-merge': 'UPSERT',
		'delete': 'DELETE',
	};
	return map[t] || t;
};

export const pipelineStatus = (p: Pipeline): string => {
	if (!p.enabled) return '<span class="wm-pipeline-status disabled">Disabled</span>';
	if (p.healthStatus === 'error') return '<span class="wm-pipeline-status error">Failing</span>';
	if (p.healthStatus === 'warning') return '<span class="wm-pipeline-status warning">Degraded</span>';
	if (!p.validated) return '<span class="wm-pipeline-status warning">Unvalidated</span>';
	return '<span class="wm-pipeline-status healthy">Running</span>';
};

export const severityBadge = (s: Severity): string => {
	const map: Record<Severity, string> = {
		critical: '<span class="wm-severity-pill critical">Critical</span>',
		warning: '<span class="wm-severity-pill warning">Warning</span>',
		info: '<span class="wm-severity-pill info">Info</span>',
	};
	return map[s] || '';
};

export const categoryLabel = (c: RuleCategory): string => {
	const map: Record<RuleCategory, string> = {
		freshness: 'Freshness',
		completeness: 'Completeness',
		validity: 'Validity',
		uniqueness: 'Uniqueness',
		consistency: 'Consistency',
	};
	return map[c] || c;
};

export const passRateClass = (rate?: number): string => {
	if (rate == null) return '';
	if (rate >= 99) return 'pass-high';
	if (rate >= 95) return 'pass-mid';
	return 'pass-low';
};

export const maskingStrategyLabel = (s: MaskingPolicy['strategy']): string => {
	const map: Record<string, string> = {
		sha256: 'SHA-256 Hash',
		partial_mask: 'Partial Mask',
		redact: 'Redact',
		tokenize: 'Tokenize',
	};
	return map[s] || s;
};

export const logIcon = (action: AgentLogAction): { icon: string; cls: string } => {
	const map: Record<AgentLogAction, { icon: string; cls: string }> = {
		detected: { icon: "🔍", cls: "detect" },
		analyzed: { icon: "🧠", cls: "analyze" },
		suggested: { icon: "💡", cls: "suggest" },
		user_action: { icon: "⚡", cls: "action" },
		info: { icon: "ℹ️", cls: "info" },
	};
	return map[action] || { icon: "📋", cls: "info" };
};