export type AgentLogAction = "detected" | "analyzed" | "suggested" | "user_action" | "info";

export type AgentLog = {
	id: string;
	timestamp: string;
	action: AgentLogAction;
	scenarioId?: string;
	content: string;
};

export type ChatMessage = {
	id: string;
	role: "system" | "user" | "assistant";
	content: string;
	suggestedActions?: Array<{ label: string; action: string; payload?: any }>;
};