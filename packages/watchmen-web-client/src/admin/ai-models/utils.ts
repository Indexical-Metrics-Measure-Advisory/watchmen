import {AIModel, GptProviderKind} from "@/services/data/tuples/gpt-model-types";
import {generateUuid} from "@/services/data/tuples/utils";
import {getCurrentTime} from "@/services/data/utils";
import {HoldByTuple} from "@/widgets/tuple-workbench/tuple-event-bus-types";
import {QueryTenantForHolder} from "@/services/data/tuples/query-tenant-types";

export const createGptModel = () :AIModel  =>{
    return  {
        modelId: generateUuid(),
        modelName: '',
        llmProvider: GptProviderKind.OPENAI,
        baseUrl: '',
        enableMonitor: false,
        modelVersion: '',
        modelToken: '',
        createdAt: getCurrentTime(),
        lastModifiedAt: getCurrentTime(),
        embeddingToken: '',
        embeddingVersion: '',
        embeddingProvider:GptProviderKind.OPENAI,
        baseEmbeddingUrl:'',
        embeddingName: '',
        version: 1,
        tenantId: '0'
    }
}

export interface HoldByAIModel extends HoldByTuple {
    tenants?: Array<QueryTenantForHolder>;
}