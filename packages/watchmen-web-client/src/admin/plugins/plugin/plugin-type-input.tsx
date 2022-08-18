import {Plugin, PluginType} from '@/services/data/tuples/plugin-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {usePluginEventBus} from '../plugin-event-bus';
import {PluginEventTypes} from '../plugin-event-bus-types';

export const PluginTypeInput = (props: { plugin: Plugin }) => {
	const {plugin} = props;

	const {fire} = usePluginEventBus();
	const forceUpdate = useForceUpdate();

	const onTypeChange = (option: DropdownOption) => {
		plugin.type = option.value as PluginType;
		fire(PluginEventTypes.PLUGIN_TYPE_CHANGED, plugin);
		forceUpdate();
	};

	const options: Array<DropdownOption> = [
		{value: PluginType.STREAMLIT, label: 'Streamlit'},
		{value: PluginType.JUPYTER, label: 'Jupyter'}
	];

	return <TuplePropertyDropdown value={plugin.type} options={options} onChange={onTypeChange}/>;
};