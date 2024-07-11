export enum CopilotAnswerItemType {
	OPTION = 'option'
}

export interface CopilotAnswerItem {
	type: CopilotAnswerItemType;
}

export interface CopilotAnswerOption extends CopilotAnswerItem {
	type: CopilotAnswerItemType.OPTION;
	text: string;
	token: string;
	vertical?: boolean;
}

export type CopilotAnswerItemTypes = string | CopilotAnswerItem | CopilotAnswerOption;

export interface CopilotAnswer {
	data: Array<CopilotAnswerItemTypes>;
}

export interface CopilotAnswerWithSession extends CopilotAnswer {
	sessionId?: string;
}

export interface ConnectedSpaceCopilotSession extends CopilotAnswerWithSession {
}

export enum RecommendationType {
	CONNECTED_SPACE = 'connected-space'
}

export interface Recommendation extends CopilotAnswerWithSession {
}