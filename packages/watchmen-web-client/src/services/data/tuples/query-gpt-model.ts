import {QueryTuple} from "@/services/data/tuples/tuple-types";
import {AIModel} from "@/services/data/tuples/gpt-model-types";


export interface QueryAIModel extends Pick<AIModel, 'tenantId' | 'modelId'|'llmProvider' | 'modelName' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
    tenantName: string;
}