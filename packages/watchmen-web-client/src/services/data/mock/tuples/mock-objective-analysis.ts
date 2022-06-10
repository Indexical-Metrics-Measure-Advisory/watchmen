import {ObjectiveAnalysis} from '../../tuples/objective-analysis-types';
import {getCurrentTime} from '../../utils';

export const listMockObjectiveAnalysis = async (): Promise<Array<ObjectiveAnalysis>> => {
	return new Promise<Array<ObjectiveAnalysis>>((resolve) => {
		setTimeout(() => {
			resolve(new Array(100).fill(1).map((_, index) => {
				return {
					analysisId: `${index + 1}`,
					title: `Hello world ${index + 1}`,
					lastVisitTime: getCurrentTime(),
					createdAt: getCurrentTime(),
					lastModifiedAt: getCurrentTime()
				};
			}));
			// resolve([{
			// 	analysisId: '1',
			// 	title: 'hello worldasdfjhaklsdfhlkashdjflkahsdfkjhaslkdfhlkashjdfklahsjdflkjhalsdfhalkshdflh',
			// 	lastVisitTime: getCurrentTime(),
			// 	createdAt: getCurrentTime(),
			// 	lastModifiedAt: getCurrentTime()
			// }, {
			// 	analysisId: '2',
			// 	title: 'hello world',
			// 	lastVisitTime: getCurrentTime(),
			// 	createdAt: getCurrentTime(),
			// 	lastModifiedAt: getCurrentTime()
			// }, {
			// 	analysisId: '3',
			// 	title: 'hello world',
			// 	lastVisitTime: getCurrentTime(),
			// 	createdAt: getCurrentTime(),
			// 	lastModifiedAt: getCurrentTime()
			// }]);
		}, 500);
	});
};