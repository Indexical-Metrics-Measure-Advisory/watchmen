import {AiModel} from '@/services/data/tuples/ai-model-types';
import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';
import {TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import {HoldByTuple} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {AiModelCodeInput} from './ai-model/ai-model-code-input';
import {AiModelInput} from './ai-model/ai-model-input';
import {AiModelProviderInput} from './ai-model/ai-model-provider-input';
import {AiModelTenantInput} from './ai-model/ai-model-tenant-input';
import {HoldByAiModel} from './types';

const AiModelEditor = (props: { model: AiModel; tenants: Array<QueryTenantForHolder>; }) => {
	const {model, tenants} = props;

	return <>
		<TuplePropertyLabel>Model Code:</TuplePropertyLabel>
		<AiModelCodeInput model={model}/>
		<TuplePropertyLabel>Provider:</TuplePropertyLabel>
		<AiModelProviderInput model={model}/>
		<TuplePropertyLabel>Data Zone:</TuplePropertyLabel>
		<AiModelTenantInput model={model} tenants={tenants}/>
		<TuplePropertyLabel>Model Name:</TuplePropertyLabel>
		<AiModelInput model={model} propName="modelName"/>
		<TuplePropertyLabel>Base URL:</TuplePropertyLabel>
		<AiModelInput model={model} propName="baseUrl"/>
		<TuplePropertyLabel>Token:</TuplePropertyLabel>
		<AiModelInput model={model} propName="token" placeholder="API Key or Token"/>
	</>;
};

export const renderEditor = (model: AiModel, codes?: HoldByTuple) => {
	const tenants: Array<QueryTenantForHolder> = (codes as unknown as HoldByAiModel)?.tenants || [];
	return <AiModelEditor model={model} tenants={tenants}/>;
};
