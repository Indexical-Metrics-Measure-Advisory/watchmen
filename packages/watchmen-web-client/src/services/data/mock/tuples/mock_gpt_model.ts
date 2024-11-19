import {AIModel, GptProviderKind} from "@/services/data/tuples/gpt-model-types";
import {getCurrentTime} from "@/services/data/utils";
import {QueryAIModel} from "@/services/data/tuples/query-gpt-model";
import {TuplePage} from "@/services/data/query/tuple-page";


let newTenantId = "1";

const azureGptModel: AIModel = {
    baseEmbeddingUrl: "",
    embeddingName: "",
    embeddingToken: "",
    embeddingVersion: "",
    embeddingProvider: GptProviderKind.OPENAI,
    enableMonitor: true,
    baseUrl: 'https://www.azure.com',
    modelVersion: '1',
    modelId: '1',
    llmProvider: GptProviderKind.OPENAI,
    tenantId: newTenantId,
    modelName: "gpt",
    modelToken: "dada",
    version: 1,
    createdAt: getCurrentTime(),
    lastModifiedAt: getCurrentTime()
};

export const fetchMockGptModel = async (): Promise<AIModel> => {
    return azureGptModel
};


export const listMockGptModels = async (options: {
    search: string;
    pageNumber?: number;
    pageSize?: number;
}): Promise<TuplePage<QueryAIModel>> => {
    const {pageNumber = 1, pageSize = 9} = options;
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                data: [azureGptModel].map(writer => {
                    return {tenantName: 'X World', ...writer};
                }),
                itemCount: 1,
                pageNumber,
                pageSize,
                pageCount: 1
            });
        }, 1000);
    });
};
