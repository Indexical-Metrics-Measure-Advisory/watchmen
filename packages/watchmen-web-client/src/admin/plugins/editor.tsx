import {Plugin} from '@/services/data/tuples/plugin-types';
import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';
import {TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {PluginEventBusProvider} from './plugin-event-bus';
import {PluginApplyToInput} from './plugin/plugin-apply-to-input';
import {PluginCodeInput} from './plugin/plugin-code-input';
import {PluginNameInput} from './plugin/plugin-name-input';
import {PluginParams} from './plugin/plugin-params';
import {PluginTenantInput} from './plugin/plugin-tenant-input';
import {PluginTypeInput} from './plugin/plugin-type-input';
import {HoldByPlugin} from './types';

const PluginEditor = (props: { plugin: Plugin; tenants: Array<QueryTenantForHolder>; }) => {
	const {plugin, tenants} = props;

	return <PluginEventBusProvider>
		<TuplePropertyLabel>Code:</TuplePropertyLabel>
		<PluginCodeInput plugin={plugin}/>
		<TuplePropertyLabel>Type:</TuplePropertyLabel>
		<PluginTypeInput plugin={plugin}/>
		<TuplePropertyLabel>Apply To:</TuplePropertyLabel>
		<PluginApplyToInput plugin={plugin}/>
		<TuplePropertyLabel>Name:</TuplePropertyLabel>
		<PluginNameInput plugin={plugin}/>
		<TuplePropertyLabel>Data Zone:</TuplePropertyLabel>
		<PluginTenantInput plugin={plugin} tenants={tenants}/>
		<PluginParams plugin={plugin}/>
	</PluginEventBusProvider>;
};

export const renderEditor = (plugin: Plugin, codes?: HoldByPlugin) => {
	const tenants: Array<QueryTenantForHolder> = (codes?.tenants || []);
	return <PluginEditor plugin={plugin} tenants={tenants}/>;
};
