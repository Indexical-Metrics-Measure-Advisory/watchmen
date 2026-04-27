import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum LiteLLMProvider {
	OPENAI = 'openai',
	AZURE = 'azure',
	ANTHROPIC = 'anthropic',
	OLLAMA = 'ollama',
	DASHSCOPE = 'dashscope',
	ZHIPU = 'zhipu',
	SPARK = 'spark',
	DEEPSEEK = 'deepseek',
	MINIMAX = 'minimax',
	TONGYI = 'tongyi',
	CUSTOM = 'custom'
}

export type AiModelId = string;

export interface AiModel extends Tuple, OptimisticLock {
	modelId: AiModelId;
	name: string | null;
	enabled: boolean | null;
	provider: LiteLLMProvider;
	apiBase: string | null;
	apiKey: string | null;
	apiVersion: string | null;
	modelName: string | null;
	customLlmProvider: string | null;
	timeout: number | null;
	temperature: number | null;
	topP: number | null;
	maxTokens: number | null;
	safeMode: boolean | null;
	dropParams: boolean | null;
	telemetry: boolean | null;
	generationUrl: string | null;
	modelToken: string | null;
	enableMonitor: boolean | null;
	tenantId?: TenantId;
}