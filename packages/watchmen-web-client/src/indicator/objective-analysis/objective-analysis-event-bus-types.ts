import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {QueryAchievement} from '@/services/data/tuples/query-achievement-types';
import {IndicatorForInspection} from '../inspection/inspection-event-bus-types';

export enum ObjectiveAnalysisEventTypes {
	SHOW_NAVIGATOR = 'show-navigator',
	HIDE_NAVIGATOR = 'hide-navigator',

	CREATED = 'create',
	DELETED = 'deleted',
	RENAMED = 'renamed',

	START_EDIT = 'start-edit',
	DELETE_PERSPECTIVE = 'delete-perspective',
	SAVE = 'save',

	ASK_ACHIEVEMENTS = 'ask-achievements',
	ASK_INDICATORS = 'ask-indicators',
	ASK_INDICATOR = 'ask-indicator'
}

export interface ObjectiveAnalysisEventBus {
	fire(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.CREATED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.CREATED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.CREATED, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.DELETED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.DELETED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.DELETED, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.RENAMED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.RENAMED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.RENAMED, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.START_EDIT, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.START_EDIT, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.START_EDIT, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective): this;
	on(type: ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, listener: (analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective) => void): this;
	off(type: ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, listener: (analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.SAVE, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.SAVE, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.SAVE, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, onData: (achievements: Array<QueryAchievement>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, listener: (onData: (achievements: Array<QueryAchievement>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, listener: (onData: (achievements: Array<QueryAchievement>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_INDICATORS, onData: (indicators: Array<Indicator>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_INDICATORS, listener: (onData: (indicators: Array<Indicator>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_INDICATORS, listener: (onData: (indicators: Array<Indicator>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_INDICATOR, indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void) => void): this;
}
