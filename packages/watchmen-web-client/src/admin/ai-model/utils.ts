import {AiModel, LiteLLMProvider} from '@/services/data/tuples/ai-model-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createAiModel = (): AiModel => {
	return {
		modelId: generateUuid(),
		name: '',
		enabled: true,
		provider: LiteLLMProvider.OPENAI,
		apiBase: '',
		apiKey: '',
		apiVersion: '',
		modelName: '',
		customLlmProvider: '',
		timeout: null,
		temperature: null,
		topP: null,
		maxTokens: null,
		safeMode: false,
		dropParams: false,
		telemetry: true,
		generationUrl: '',
		modelToken: '',
		enableMonitor: false,
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};