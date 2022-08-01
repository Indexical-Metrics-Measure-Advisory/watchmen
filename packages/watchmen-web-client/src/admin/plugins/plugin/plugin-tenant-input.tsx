import {Plugin} from '@/services/data/tuples/plugin-types';
import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {usePluginEventBus} from '../plugin-event-bus';
import {PluginEventTypes} from '../plugin-event-bus-types';

export const PluginTenantInput = (props: { plugin: Plugin, tenants: Array<QueryTenantForHolder> }) => {
	const {plugin, tenants} = props;

	const {fire} = usePluginEventBus();
	const forceUpdate = useForceUpdate();

	const onTenantChange = (option: DropdownOption) => {
		plugin.tenantId = option.value as string;
		fire(PluginEventTypes.PLUGIN_TENANT_CHANGED, plugin);
		forceUpdate();
	};

	const options: Array<DropdownOption> = tenants.map(candidate => {
		return {value: candidate.tenantId, label: candidate.name};
	});

	return <TuplePropertyDropdown value={plugin.tenantId} options={options} onChange={onTenantChange}/>;
};