import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';

export enum ObjectiveAnalysisEventTypes {
	SHOW_NAVIGATOR = 'show-navigator',
	HIDE_NAVIGATOR = 'hide-navigator',

	CREATED = 'create',
	DELETED = 'deleted',

	START_EDIT = 'start-edit',

}

export interface ObjectiveAnalysisEventBus {
	fire(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.CREATED, objectiveAnalysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.CREATED, listener: (objectiveAnalysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.CREATED, listener: (objectiveAnalysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.DELETED, objectiveAnalysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.DELETED, listener: (objectiveAnalysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.DELETED, listener: (objectiveAnalysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.START_EDIT, objectiveAnalysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.START_EDIT, listener: (objectiveAnalysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.START_EDIT, listener: (objectiveAnalysis: ObjectiveAnalysis) => void): this;
}