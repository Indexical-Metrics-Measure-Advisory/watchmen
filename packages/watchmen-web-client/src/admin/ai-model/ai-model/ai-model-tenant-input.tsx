import {AiModel} from '@/services/data/tuples/ai-model-types';
import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';

export const AiModelTenantInput = (props: { model: AiModel, tenants: Array<QueryTenantForHolder> }) => {
	const {model, tenants} = props;
	const forceUpdate = useForceUpdate();

	const onTenantChange = (option: DropdownOption) => {
		model.tenantId = option.value as string;
		forceUpdate();
	};

	const options: Array<DropdownOption> = tenants.map(candidate => {
		return {value: candidate.tenantId, label: candidate.name};
	});

	return <TuplePropertyDropdown value={model.tenantId} options={options} onChange={onTenantChange}/>;
};
