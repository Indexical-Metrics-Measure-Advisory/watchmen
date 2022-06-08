import {DateTime} from '../types';
import {Tuple} from './tuple-types';

export type ObjectiveAnalysisId = string;

export interface ObjectiveAnalysis extends Tuple {
	analysisId: ObjectiveAnalysisId;
	title: string;
	description?: string;
	lastVisitTime: DateTime;
}
