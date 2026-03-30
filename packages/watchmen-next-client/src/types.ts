export type MainNavKey =
	| 'overview'
	| 'sources'
	| 'topics'
	| 'perception'
	| 'rules'
	| 'incidents'
	| 'actions'
	| 'settings';

export type PerceptionView = 'overview' | 'structural' | 'statistical' | 'behavior' | 'semantic';
export type DecisionType = 'accept' | 'reject' | 'investigate';

export type PendingChange = {
	id: string;
	title: string;
	severity: 'high' | 'medium' | 'low';
	type: 'Schema Change' | 'Distribution Drift' | 'New Field' | 'Semantic Drift';
	target: string;
};

export type DecisionRecord = {
	changeId: string;
	decision: DecisionType;
	at: string;
};

export type NavItem = {key: MainNavKey; label: string};

export type Incident = {
	id: string;
	type: string;
	impact: string;
	affected: string[];
	rootCause: string;
	suggestedActions: string[];
};

export type ActionItem = {
	trigger: string;
	actions: string[];
};

export type AppState = {
	main: MainNavKey;
	perception: PerceptionView;
	decisions: Array<DecisionRecord>;
};
