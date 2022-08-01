import {AchievementId} from './achievement-types';
import {InspectionId} from './inspection-types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export type ObjectiveAnalysisId = string;

export enum ObjectiveAnalysisPerspectiveType {
	INSPECTION = 'inspection',
	ACHIEVEMENT = 'achievement'
}

export interface ObjectiveAnalysisPerspective {
	perspectiveId: string;
	description?: string;
	type: ObjectiveAnalysisPerspectiveType;
	relationId?: InspectionId | AchievementId;
}

export interface ObjectiveAnalysis extends Tuple, OptimisticLock {
	analysisId: ObjectiveAnalysisId;
	title: string;
	description?: string;
	perspectives: Array<ObjectiveAnalysisPerspective>;
	tenantId?: TenantId;
}
