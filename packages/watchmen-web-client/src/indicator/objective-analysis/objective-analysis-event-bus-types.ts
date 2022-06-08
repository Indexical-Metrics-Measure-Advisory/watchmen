export enum ObjectiveAnalysisEventTypes {
	SHOW_NAVIGATOR = 'show-navigator',
	HIDE_NAVIGATOR = 'hide-navigator',
}

export interface ObjectiveAnalysisEventBus {
	fire(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;
}