import {Apis, get} from '@/services/data/apis';
import {listMockObjectiveAnalysis} from '@/services/data/mock/tuples/mock-objective-analysis';
import {isMockService} from '@/services/data/utils';
import {ObjectiveAnalysis} from './objective-analysis-types';

export const listObjectiveAnalysis = async (): Promise<Array<ObjectiveAnalysis>> => {
	if (isMockService()) {
		return listMockObjectiveAnalysis();
	} else {
		return await get({api: Apis.OBJECTIVE_ANALYSIS_LIST});
	}
};