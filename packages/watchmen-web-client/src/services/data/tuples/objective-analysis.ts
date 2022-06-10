import {Apis, get} from '../apis';
import {listMockObjectiveAnalysis} from '../mock/tuples/mock-objective-analysis';
import {isMockService} from '../utils';
import {ObjectiveAnalysis} from './objective-analysis-types';

export const listObjectiveAnalysis = async (): Promise<Array<ObjectiveAnalysis>> => {
	if (isMockService()) {
		return listMockObjectiveAnalysis();
	} else {
		return await get({api: Apis.OBJECTIVE_ANALYSIS_LIST});
	}
};