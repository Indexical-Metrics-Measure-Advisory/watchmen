import {AiModel, AiModelProviderType} from '@/services/data/tuples/ai-model-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createAiModel = (): AiModel => {
	return {
		modelId: generateUuid(),
		enable: true,
		modelCode: '',
		provider: AiModelProviderType.OPENAI,
		baseUrl: '',
		token: '',
		modelName: '',
		params: {},
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
