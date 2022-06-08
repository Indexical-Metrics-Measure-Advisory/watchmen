import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {getCurrentTime} from '@/services/data/utils';

export const listMockObjectiveAnalysis = async (): Promise<Array<ObjectiveAnalysis>> => {
	return new Promise<Array<ObjectiveAnalysis>>((resolve) => {
		setTimeout(() => {
			resolve([{
				analysisId: '1',
				title: 'hello worldasdfjhaklsdfhlkashdjflkahsdfkjhaslkdfhlkashjdfklahsjdflkjhalsdfhalkshdflh',
				lastVisitTime: getCurrentTime(),
				createdAt: getCurrentTime(),
				lastModifiedAt: getCurrentTime()
			}, {
				analysisId: '2',
				title: 'hello world',
				lastVisitTime: getCurrentTime(),
				createdAt: getCurrentTime(),
				lastModifiedAt: getCurrentTime()
			}, {
				analysisId: '3',
				title: 'hello world',
				lastVisitTime: getCurrentTime(),
				createdAt: getCurrentTime(),
				lastModifiedAt: getCurrentTime()
			}]);
		}, 500);
	});
};