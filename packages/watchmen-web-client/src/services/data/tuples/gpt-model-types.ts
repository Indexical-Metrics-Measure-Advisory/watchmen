import {OptimisticLock, Tuple} from "@/services/data/tuples/tuple-types";

export type AIModelId = string;

export enum GptProviderKind {
    OPENAI = 'OPENAI',
    Azure = 'Azure',
    Ollama = 'Ollama'
}

export enum ModelType {
    Chat = 'Chat',
    LLM = 'llm',
    Embedding = 'Embedding'
}


export interface AIModel extends Tuple, OptimisticLock {
    modelId: AIModelId,
    enableMonitor: boolean,
    llmProvider: GptProviderKind,
    baseUrl: string,
    modelName: string,
    modelVersion: string,
    modelToken: string,
    embeddingProvider: GptProviderKind,
    baseEmbeddingUrl: string,
    embeddingName: string,
    embeddingVersion: string,
    embeddingToken: string,
    version: number,
    tenantId: string
}


