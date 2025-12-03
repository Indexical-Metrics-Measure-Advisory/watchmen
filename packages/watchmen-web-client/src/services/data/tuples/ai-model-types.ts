import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum AiModelProviderType {
	OPENAI = 'openai',
	AZURE_OPENAI = 'azure',
	ALI_QWEN = 'ali-qwen',
	ANTHROPIC = 'anthropic',
	BEDROCK = 'bedrock',
	GEMINI = 'gemini',
	HUGGINGFACE = 'huggingface',
	MISTRAL = 'mistral',
	COHERE = 'cohere',
	TOGETHERAI = 'together_ai',
	GROQ = 'groq',
	OLLAMA = 'ollama',
	DEEPSEEK = 'deepseek',
	OPENROUTER = 'openrouter',
	VERTEX_AI = 'vertex_ai',
	DATABRICKS = 'databricks'
}

export type AiModelId = string;

export interface AiModel extends Tuple, OptimisticLock {
	modelId: AiModelId;
	enable: boolean;
	modelCode: string;
	provider: AiModelProviderType;
	baseUrl: string;
	token: string;
	modelName: string;
	params: any; // For extra params
	tenantId?: TenantId;
}
