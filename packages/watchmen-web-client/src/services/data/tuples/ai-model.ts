import {Apis, get, page, post} from '../apis';
import {TuplePage} from '../query/tuple-page';
import {AiModel, AiModelId} from './ai-model-types';

export const listAiModels = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<AiModel>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;
	return await page({api: Apis.AI_MODEL_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
};

export const fetchAiModel = async (modelId: AiModelId): Promise<{ model: AiModel }> => {
	const model = await get({api: Apis.AI_MODEL_GET, search: {modelId}});
	return {model};
};

export const saveAiModel = async (model: AiModel): Promise<void> => {
	if (model.modelId) {
		const data = await post({api: Apis.AI_MODEL_SAVE, data: model});
		model.version = data.version;
		model.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.AI_MODEL_CREATE, data: model});
		model.modelId = data.modelId;
		model.version = data.version;
		model.lastModifiedAt = data.lastModifiedAt;
	}
};
