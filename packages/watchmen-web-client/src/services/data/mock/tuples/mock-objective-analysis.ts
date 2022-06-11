import {ACHIEVEMENT_PREMIUM_ID} from '@/services/data/mock/tuples/mock-data-achievements';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspectiveType} from '../../tuples/objective-analysis-types';
import {generateUuid, isFakedUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';
import {INSPECTION_ORDER_PREMIUM_ID} from './mock-inspection';

export const listMockObjectiveAnalysis = async (): Promise<Array<ObjectiveAnalysis>> => {
	return new Promise<Array<ObjectiveAnalysis>>((resolve) => {
		setTimeout(() => {
			resolve(new Array(100).fill(1).map((_, index) => {
				return {
					analysisId: `${index + 1}`,
					title: `Hello world ${index + 1}`,
					perspectives: [{
						perspectiveId: generateUuid(),
						type: ObjectiveAnalysisPerspectiveType.INSPECTION,
						relationId: INSPECTION_ORDER_PREMIUM_ID
					}, {
						perspectiveId: generateUuid(),
						type: ObjectiveAnalysisPerspectiveType.ACHIEVEMENT,
						relationId: ACHIEVEMENT_PREMIUM_ID
					}],
					lastVisitTime: getCurrentTime(),
					createdAt: getCurrentTime(),
					lastModifiedAt: getCurrentTime()
				};
			}));
		}, 500);
	});
};

let newAnalysisId = 10000;
export const saveMockObjectiveAnalysis = async (analysis: ObjectiveAnalysis): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(analysis)) {
			analysis.analysisId = `${newAnalysisId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const deleteMockObjectiveAnalysis = async (analysis: ObjectiveAnalysis): Promise<void> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 500);
	});
};