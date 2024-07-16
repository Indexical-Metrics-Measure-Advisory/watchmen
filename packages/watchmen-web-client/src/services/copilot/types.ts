export enum CopilotAnswerItemType {
	OPTION = 'option', MARKDOWN = 'markdown', SVG = 'svg'
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

export interface CopilotAnswerMarkdown extends CopilotAnswerItem {
	type: CopilotAnswerItemType.MARKDOWN;
	content: string;
}

export interface CopilotAnswerSVG extends CopilotAnswerItem {
	type: CopilotAnswerItemType.SVG;
	content: string;
}

export type CopilotAnswerItemTypes = string | CopilotAnswerItem
	| CopilotAnswerOption
	| CopilotAnswerMarkdown
	| CopilotAnswerSVG;

export interface CopilotAnswer {
	data: Array<CopilotAnswerItemTypes>;
}

export interface CopilotAnswerWithSession extends CopilotAnswer {
	sessionId?: string;
}

export interface OngoingCopilotAnswer extends CopilotAnswerWithSession {
	/** a token to retrieve answer from server side again */
	token?: string;
}

export enum RecommendationType {
	CONNECTED_SPACE = 'connected-space'
}
