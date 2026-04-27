import {AiModel, LiteLLMProvider} from '@/services/data/tuples/ai-model-types';
import {DropdownOption} from '@/widgets/basic/types';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React from 'react';

export const AiModelProviderInput = (props: { model: AiModel }) => {
	const {model} = props;
	const forceUpdate = useForceUpdate();
	const {fire: fireTuple} = useTupleEventBus();

	const onValueChange = (option: DropdownOption) => {
		model.provider = option.value as LiteLLMProvider;
		fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
		forceUpdate();
	};

	const options = [
		{value: LiteLLMProvider.OPENAI, label: 'OpenAI'},
		{value: LiteLLMProvider.AZURE, label: 'Azure'},
		{value: LiteLLMProvider.ANTHROPIC, label: 'Anthropic'},
		{value: LiteLLMProvider.OLLAMA, label: 'Ollama'},
		{value: LiteLLMProvider.DASHSCOPE, label: 'DashScope'},
		{value: LiteLLMProvider.ZHIPU, label: 'Zhipu'},
		{value: LiteLLMProvider.SPARK, label: 'Spark'},
		{value: LiteLLMProvider.DEEPSEEK, label: 'DeepSeek'},
		{value: LiteLLMProvider.MINIMAX, label: 'MiniMax'},
		{value: LiteLLMProvider.TONGYI, label: 'Tongyi'},
		{value: LiteLLMProvider.CUSTOM, label: 'Custom'}
	];

	return <TuplePropertyDropdown value={model.provider} options={options} onChange={onValueChange}/>;
};