export enum CopilotEventTypes {
	NEW_SESSION = 'new-session',
	CURRENT_SESSION = 'current-session',
	REPLACE_SESSION = 'replace-session'
}

export interface CopilotEventBus {
	fire(type: CopilotEventTypes.NEW_SESSION, newSessionId: string): this;

	on(type: CopilotEventTypes.NEW_SESSION, listener: (newSessionId: string) => void): this;

	off(type: CopilotEventTypes.NEW_SESSION, listener: (newSessionId: string) => void): this;

	fire(type: CopilotEventTypes.CURRENT_SESSION, onReply: (sessionId?: string) => void): this;

	on(type: CopilotEventTypes.CURRENT_SESSION, listener: (onReply: (sessionId?: string) => void) => void): this;

	off(type: CopilotEventTypes.CURRENT_SESSION, listener: (onReply: (sessionId?: string) => void) => void): this;

	fire(type: CopilotEventTypes.REPLACE_SESSION, newSessionId: string): this;

	on(type: CopilotEventTypes.REPLACE_SESSION, listener: (newSessionId: string) => void): this;

	off(type: CopilotEventTypes.REPLACE_SESSION, listener: (newSessionId: string) => void): this;
}
