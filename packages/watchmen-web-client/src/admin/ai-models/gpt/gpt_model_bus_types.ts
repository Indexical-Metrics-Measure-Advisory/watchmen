import {AIModel} from "@/services/data/tuples/gpt-model-types";


export enum GptModelEventTypes {
    GPT_MODEL_CHANGED = 'gpt-model-changed',
    AI_MODEL_TENANT_CHANGE = 'ai-model-tenant-change'
}

export interface GptEventBus {
    fire(type: GptModelEventTypes.AI_MODEL_TENANT_CHANGE, gpt: AIModel): this;
    on(type: GptModelEventTypes.AI_MODEL_TENANT_CHANGE, listener: (gpt: AIModel) => void): this;
    off(type: GptModelEventTypes.AI_MODEL_TENANT_CHANGE, listener: (gpt: AIModel) => void): this;

}