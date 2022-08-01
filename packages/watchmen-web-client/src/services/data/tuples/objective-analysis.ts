import {findAccount} from '../account';
import {Apis, get, post} from '../apis';
import {
	deleteMockObjectiveAnalysis,
	listMockObjectiveAnalysis,
	saveMockObjectiveAnalysis
} from '../mock/tuples/mock-objective-analysis';
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

export const saveObjectiveAnalysis = async (analysis: ObjectiveAnalysis): Promise<void> => {
	analysis.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockObjectiveAnalysis(analysis);
	} else if (isFakedUuid(analysis)) {
		const data = await post({api: Apis.OBJECTIVE_ANALYSIS_CREATE, data: analysis});
		analysis.analysisId = data.analysisId;
		analysis.tenantId = data.tenantId;
		analysis.version = data.version;
		analysis.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({
			api: Apis.OBJECTIVE_ANALYSIS_SAVE,
			data: analysis
		});
		analysis.tenantId = data.tenantId;
		analysis.version = data.version;
		analysis.lastModifiedAt = data.lastModifiedAt;
	}
};

export const deleteObjectiveAnalysis = async (analysis: ObjectiveAnalysis): Promise<void> => {
	if (isMockService()) {
		return deleteMockObjectiveAnalysis(analysis);
	} else {
		await get({api: Apis.OBJECTIVE_ANALYSIS_DELETE, search: {analysisId: analysis.analysisId}});
	}
};
