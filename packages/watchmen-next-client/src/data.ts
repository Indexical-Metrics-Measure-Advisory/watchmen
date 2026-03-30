import {ActionItem, AppState, Incident, NavItem, PendingChange} from './types';

export const mainNav: Array<NavItem> = [
	{key: 'overview', label: 'Overview'},
	{key: 'sources', label: 'Sources'},
	{key: 'topics', label: 'Topics / Tables'},
	{key: 'perception', label: 'Perception'},
	{key: 'rules', label: 'Rules & Semantics'},
	{key: 'incidents', label: 'Incidents'},
	{key: 'actions', label: 'Actions'},
	{key: 'settings', label: 'Settings'}
];

export const pendingChanges: Array<PendingChange> = [
	{id: 'c1', title: 'Schema Change', type: 'Schema Change', target: 'policy_raw', severity: 'high'},
	{id: 'c2', title: 'Premium Distribution Drift', type: 'Distribution Drift', target: 'premium', severity: 'high'},
	{id: 'c3', title: 'New Field: currency', type: 'New Field', target: 'policy_raw', severity: 'medium'},
	{id: 'c4', title: 'premium 语义疑似变化', type: 'Semantic Drift', target: 'Policy', severity: 'high'}
];

export const incidentData: Array<Incident> = [
	{
		id: '#1024',
		type: 'Schema Drift',
		impact: 'High',
		affected: ['policy table', 'premium metric'],
		rootCause: 'Upstream API changed',
		suggestedActions: ['Update schema', 'Fix mapping']
	},
	{
		id: '#1025',
		type: 'Statistical Drift',
		impact: 'Medium',
		affected: ['premium null ratio', 'p95'],
		rootCause: 'Batch job missing value fill',
		suggestedActions: ['Run backfill', 'Enable null-guard rule']
	}
];

export const actionsData: Array<ActionItem> = [
	{trigger: 'Schema Change Detected', actions: ['Notify Slack', 'Create Jira']},
	{trigger: 'Semantic Drift Confirmed', actions: ['Trigger impact analysis', 'Update semantic definition']},
	{trigger: 'Ingestion Drop > 30%', actions: ['Run backfill', 'Block pipeline']}
];

export const createInitialState = (): AppState => ({
	main: 'perception',
	perception: 'overview',
	decisions: []
});
