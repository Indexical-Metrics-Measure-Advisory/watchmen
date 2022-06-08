export enum ObjectiveAnalysisEventTypes {
	SHOW_NAVIGATOR = 'show-navigator'
	// OBJECTIVE_ANALYSIS_PICKED = 'achievement-picked',
}

export interface ObjectiveAnalysisEventBus {
	fire(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;
}