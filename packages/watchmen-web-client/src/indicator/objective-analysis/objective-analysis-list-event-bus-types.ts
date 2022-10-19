import {TuplePage} from '@/services/data/query/tuple-page';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';

export enum ObjectiveAnalysisListEventTypes {
	SEARCHED = 'searched',
	ASK_SEARCHED = 'ask-searched',

	OBJECTIVE_ANALYSIS_SAVED = 'saved',
	OBJECTIVE_ANALYSIS_DELETED = 'deleted'
}

export interface ObjectiveAnalysisListEventBus {
	fire(type: ObjectiveAnalysisListEventTypes.SEARCHED, page: TuplePage<ObjectiveAnalysis>, searchText: string): this;
	on(type: ObjectiveAnalysisListEventTypes.SEARCHED, listener: (page: TuplePage<ObjectiveAnalysis>, searchText: string) => void): this;
	off(type: ObjectiveAnalysisListEventTypes.SEARCHED, listener: (page: TuplePage<ObjectiveAnalysis>, searchText: string) => void): this;

	fire(type: ObjectiveAnalysisListEventTypes.ASK_SEARCHED, onData: (page?: TuplePage<ObjectiveAnalysis>, searchText?: string) => void): this;
	on(type: ObjectiveAnalysisListEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<ObjectiveAnalysis>, searchText?: string) => void) => void): this;
	off(type: ObjectiveAnalysisListEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<ObjectiveAnalysis>, searchText?: string) => void) => void): this;

	fire(type: ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_SAVED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_SAVED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_SAVED, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_DELETED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_DELETED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_DELETED, listener: (analysis: ObjectiveAnalysis) => void): this;
}