import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';

export enum ObjectiveAnalysisEventTypes {
	SHOW_NAVIGATOR = 'show-navigator',
	HIDE_NAVIGATOR = 'hide-navigator',

	ASK_LIST = 'ask-list'
}

export interface ObjectiveAnalysisEventBus {
	fire(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_LIST, onData: (data: Array<ObjectiveAnalysis>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_LIST, listener: (onData: (data: Array<ObjectiveAnalysis>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_LIST, listener: (onData: (data: Array<ObjectiveAnalysis>) => void) => void): this;
}