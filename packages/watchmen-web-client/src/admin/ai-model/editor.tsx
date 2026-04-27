import {AiModel} from '@/services/data/tuples/ai-model-types';
import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';
import {TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import {HoldByTuple} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {AiModelNameInput} from './ai-model/ai-model-name-input';
import {AiModelInput} from './ai-model/ai-model-input';
import {AiModelProviderInput} from './ai-model/ai-model-provider-input';
import {AiModelTenantInput} from './ai-model/ai-model-tenant-input';
import {HoldByAiModel} from './types';

const AiModelEditor = (props: { model: AiModel; tenants: Array<QueryTenantForHolder>; }) => {
	const {model, tenants} = props;

	return <>
		<TuplePropertyLabel>Name:</TuplePropertyLabel>
		<AiModelNameInput model={model}/>
		<TuplePropertyLabel>Provider:</TuplePropertyLabel>
		<AiModelProviderInput model={model}/>
		<TuplePropertyLabel>Tenant:</TuplePropertyLabel>
		<AiModelTenantInput model={model} tenants={tenants}/>
		<TuplePropertyLabel>Model Name:</TuplePropertyLabel>
		<AiModelInput model={model} propName="modelName"/>
		<TuplePropertyLabel>API Base:</TuplePropertyLabel>
		<AiModelInput model={model} propName="apiBase" placeholder="https://api.openai.com/v1"/>
		<TuplePropertyLabel>API Key:</TuplePropertyLabel>
		<AiModelInput model={model} propName="apiKey" placeholder="API Key"/>
		<TuplePropertyLabel>API Version:</TuplePropertyLabel>
		<AiModelInput model={model} propName="apiVersion" placeholder="e.g. 2023-05-15"/>
		<TuplePropertyLabel>Custom LLM Provider:</TuplePropertyLabel>
		<AiModelInput model={model} propName="customLlmProvider"/>
		<TuplePropertyLabel>Timeout:</TuplePropertyLabel>
		<AiModelInput model={model} propName="timeout" placeholder="Request timeout in seconds"/>
		<TuplePropertyLabel>Temperature:</TuplePropertyLabel>
		<AiModelInput model={model} propName="temperature" placeholder="0-2"/>
		<TuplePropertyLabel>Top P:</TuplePropertyLabel>
		<AiModelInput model={model} propName="topP" placeholder="0-1"/>
		<TuplePropertyLabel>Max Tokens:</TuplePropertyLabel>
		<AiModelInput model={model} propName="maxTokens" placeholder="Maximum tokens to generate"/>
		<TuplePropertyLabel>Generation URL:</TuplePropertyLabel>
		<AiModelInput model={model} propName="generationUrl"/>
		<TuplePropertyLabel>Model Token:</TuplePropertyLabel>
		<AiModelInput model={model} propName="modelToken"/>
	</>;
};

export const renderEditor = (model: AiModel, codes?: HoldByTuple) => {
	const tenants: Array<QueryTenantForHolder> = (codes as unknown as HoldByAiModel)?.tenants || [];
	return <AiModelEditor model={model} tenants={tenants}/>;
};