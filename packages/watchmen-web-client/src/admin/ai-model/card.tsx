import {AiModel} from '@/services/data/tuples/ai-model-types';
import {StandardTupleCard} from '@/widgets/tuple-workbench/tuple-card';

export const renderCard = (model: AiModel) => {
	return <StandardTupleCard key={model.modelId} tuple={model}
	                          name={() => model.name || ''}
	                          description={() => `${model.provider} - ${model.modelName || ''}`}/>;
};