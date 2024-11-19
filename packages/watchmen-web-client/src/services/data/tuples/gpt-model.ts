
import {isMockService} from "@/services/data/utils";
import {Apis, get, page, post,} from "@/services/data/apis";
import {AIModel, AIModelId} from "@/services/data/tuples/gpt-model-types";
import {fetchMockGptModel, listMockGptModels} from "@/services/data/mock/tuples/mock_gpt_model";
import {TenantId} from "@/services/data/tuples/tenant-types";
import {TuplePage} from "@/services/data/query/tuple-page";
import {QueryAIModel} from "@/services/data/tuples/query-gpt-model";


export const fetchGPTModel = async (tenantId:TenantId): Promise<AIModel> => {
    if (isMockService()) {
        return await fetchMockGptModel();
    } else {
        return await get({api: Apis.AI_MODEL_LIST_BY_TENANT, search: {tenantId: tenantId}});
    }
};


export const fetchGPTModelById = async (modelId:AIModelId): Promise<AIModel> => {
    if (isMockService()) {
        return await fetchMockGptModel();
    } else {
        return await get({api: Apis.AI_MODEL_GET, search: {modelId: modelId}});
    }
};


export const saveGPTModel = async (gpt_model:AIModel):Promise<AIModel> => {
    if (isMockService()) {
        return await fetchMockGptModel();

    } else {
        return await post({api: Apis.AI_MODEL_SAVE, data: gpt_model});
    }

}

export const listGptModels = async (options: {
    search: string;
    pageNumber?: number;
    pageSize?: number;
}): Promise<TuplePage<QueryAIModel>> => {
    const {search = '', pageNumber = 1, pageSize = 9} = options;

    if (isMockService()) {
        return listMockGptModels(options);
    } else {
        return await page({api: Apis.AI_MODEL_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
    }
};
