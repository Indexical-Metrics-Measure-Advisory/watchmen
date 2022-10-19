import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {
	deleteMockObjectiveAnalysis,
	fetchMockObjectiveAnalysis,
	findMockObjectiveAnalysisPage,
	listMockObjectiveAnalysis,
	saveMockObjectiveAnalysis
} from '../mock/tuples/mock-objective-analysis';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {ObjectiveAnalysis, ObjectiveAnalysisId} from './objective-analysis-types';
import {isFakedUuid} from './utils';

export const listObjectiveAnalysis = async (): Promise<Array<ObjectiveAnalysis>> => {
	if (isMockService()) {
		return listMockObjectiveAnalysis();
	} else {
		return await get({api: Apis.OBJECTIVE_ANALYSIS_LIST});
	}
};

export const findObjectiveAnalysisPage = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<ObjectiveAnalysis>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return findMockObjectiveAnalysisPage(options);
	} else {
		return await page({
			api: Apis.OBJECTIVE_ANALYSIS_LIST_BY_NAME,
			search: {search},
			pageable: {pageNumber, pageSize}
		});
	}
};

export const fetchObjectiveAnalysis = async (analysisId: ObjectiveAnalysisId): Promise<ObjectiveAnalysis> => {
	if (isMockService()) {
		return fetchMockObjectiveAnalysis(analysisId);
	} else {
		return await get({api: Apis.OBJECTIVE_ANALYSIS_GET, search: {analysisId: analysisId}});
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
