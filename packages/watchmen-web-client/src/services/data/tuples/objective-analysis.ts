import {findAccount} from '../account';
import {Apis, get, post} from '../apis';
import {listMockObjectiveAnalysis, saveMockObjectiveAnalysis} from '../mock/tuples/mock-objective-analysis';
import {isMockService} from '../utils';
import {ObjectiveAnalysis} from './objective-analysis-types';
import {isFakedUuid} from './utils';

export const listObjectiveAnalysis = async (): Promise<Array<ObjectiveAnalysis>> => {
	if (isMockService()) {
		return listMockObjectiveAnalysis();
	} else {
		return await get({api: Apis.OBJECTIVE_ANALYSIS_LIST});
	}
};

export const saveObjectiveAnalysis = async (objectiveAnalysis: ObjectiveAnalysis): Promise<void> => {
	objectiveAnalysis.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockObjectiveAnalysis(objectiveAnalysis);
	} else if (isFakedUuid(objectiveAnalysis)) {
		const data = await post({api: Apis.OBJECTIVE_ANALYSIS_CREATE, data: objectiveAnalysis});
		objectiveAnalysis.analysisId = data.analysisId;
		objectiveAnalysis.tenantId = data.tenantId;
		objectiveAnalysis.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({
			api: Apis.OBJECTIVE_ANALYSIS_SAVE,
			data: objectiveAnalysis
		});
		objectiveAnalysis.tenantId = data.tenantId;
		objectiveAnalysis.lastModifiedAt = data.lastModifiedAt;
	}
};