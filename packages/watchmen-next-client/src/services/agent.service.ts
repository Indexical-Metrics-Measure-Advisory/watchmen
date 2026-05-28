import { AgentLog } from "../models";

export const getAgentLogStats = (logs: AgentLog[]) => {
	return {
		total: logs.length,
		detected: logs.filter(l => l.action === 'detected').length,
		analyzed: logs.filter(l => l.action === 'analyzed').length,
		actions: logs.filter(l => l.action === 'user_action').length,
	};
};

export const getSortedLogs = (logs: AgentLog[]) => {
	return [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};