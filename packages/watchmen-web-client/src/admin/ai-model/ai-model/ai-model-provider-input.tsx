import {AiModel, AiModelProviderType} from '@/services/data/tuples/ai-model-types';
import {DropdownOption} from '@/widgets/basic/types';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import React from 'react';

export const AiModelProviderInput = (props: { model: AiModel }) => {
	const {model} = props;
	const forceUpdate = useForceUpdate();

	const onValueChange = (option: DropdownOption) => {
		model.provider = option.value as AiModelProviderType;
		forceUpdate();
	};

	const options = [
		{value: AiModelProviderType.OPENAI, label: 'OpenAI'},
		{value: AiModelProviderType.AZURE_OPENAI, label: 'Azure OpenAI'},
		{value: AiModelProviderType.ANTHROPIC, label: 'Anthropic'},
		{value: AiModelProviderType.BEDROCK, label: 'AWS Bedrock'},
		{value: AiModelProviderType.GEMINI, label: 'Google Gemini'},
		{value: AiModelProviderType.VERTEX_AI, label: 'Google Vertex AI'},
		{value: AiModelProviderType.HUGGINGFACE, label: 'Hugging Face'},
		{value: AiModelProviderType.MISTRAL, label: 'Mistral AI'},
		{value: AiModelProviderType.COHERE, label: 'Cohere'},
		{value: AiModelProviderType.TOGETHERAI, label: 'Together AI'},
		{value: AiModelProviderType.GROQ, label: 'Groq'},
		{value: AiModelProviderType.OLLAMA, label: 'Ollama'},
		{value: AiModelProviderType.DEEPSEEK, label: 'DeepSeek'},
		{value: AiModelProviderType.OPENROUTER, label: 'OpenRouter'},
		{value: AiModelProviderType.DATABRICKS, label: 'Databricks'},
		{value: AiModelProviderType.ALI_QWEN, label: 'Ali Qwen'}
	];

	return <TuplePropertyDropdown value={model.provider} options={options} onChange={onValueChange}/>;
};
