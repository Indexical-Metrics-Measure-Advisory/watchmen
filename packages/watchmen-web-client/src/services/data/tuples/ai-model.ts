import {Apis, del, get, page, post} from '../apis';
import {TuplePage} from '../query/tuple-page';
import {AiModel, AiModelId} from './ai-model-types';

export const listAiModels = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<AiModel>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;
	return await page({api: Apis.AI_MODEL_LIST_BY_NAME, search: {query_name: search}, pageable: {pageNumber, pageSize}});
};

export const fetchAiModel = async (modelId: AiModelId): Promise<AiModel> => {
	return await get({api: Apis.AI_MODEL_GET, search: {model_id: modelId}});
};

export const saveAiModel = async (model: AiModel): Promise<AiModel> => {
	return await post({api: Apis.AI_MODEL_SAVE, data: model});
};

export const loadAllAiModels = async (): Promise<Array<AiModel>> => {
	return await get({api: Apis.AI_MODEL_LOAD_ALL});
};

export const deleteAiModel = async (modelId: AiModelId): Promise<void> => {
	await del({api: Apis.AI_MODEL_DELETE, search: {model_id: modelId}});
};