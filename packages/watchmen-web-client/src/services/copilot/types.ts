export enum CopilotAnswerType {
	TEXT = 'text',
	TEXT_WITH_OPTIONS = 'text-with-options'
}

export interface CopilotAnswer {
	type: CopilotAnswerType;
}

export interface CopilotAnswerAtNewSession {
	sessionId?: string;
}

export interface CopilotTextAnswer extends CopilotAnswer {
	type: CopilotAnswerType.TEXT;
	text: string;
}

export interface CopilotAnswerOption {
	text: string;
	token: string;
	vertical?: boolean;
}

export interface CopilotTextWithOptionsAnswer extends CopilotAnswer {
	type: CopilotAnswerType.TEXT_WITH_OPTIONS;
	text: Array<string | CopilotAnswerOption>;
}

export interface ConnectedSpaceCopilotSession extends CopilotTextWithOptionsAnswer, CopilotAnswerAtNewSession {
}
