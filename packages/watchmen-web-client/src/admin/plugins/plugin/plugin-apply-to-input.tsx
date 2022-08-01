import {Plugin, PluginApplyTo, PluginType} from '@/services/data/tuples/plugin-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React, {useEffect} from 'react';
import {usePluginEventBus} from '../plugin-event-bus';
import {PluginEventTypes} from '../plugin-event-bus-types';

const APPLY_TO = {
	[PluginType.STREAMLIT]: [
		{value: PluginApplyTo.ACHIEVEMENT, label: 'Achievement'}
	]
};

export const PluginApplyToInput = (props: { plugin: Plugin }) => {
	const {plugin} = props;

	const {on, off, fire} = usePluginEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onTypeChanged = (aPlugin: Plugin) => {
			if (aPlugin !== plugin) {
				return;
			}

			const options = APPLY_TO[plugin.type];
			if (options == null || options.length === 0) {
				delete plugin.applyTo;
				forceUpdate();
				// eslint-disable-next-line
			} else if (options.some(option => option.value == plugin.applyTo)) {
				// do nothing
			} else {
				delete plugin.applyTo;
				forceUpdate();
			}
		};
		on(PluginEventTypes.PLUGIN_TYPE_CHANGED, onTypeChanged);
		return () => {
			off(PluginEventTypes.PLUGIN_TYPE_CHANGED, onTypeChanged);
		};
	}, [on, off, forceUpdate, plugin]);

	const onApplyToChange = (option: DropdownOption) => {
		plugin.applyTo = option.value as PluginApplyTo;
		fire(PluginEventTypes.PLUGIN_APPLY_TO_CHANGED, plugin);
		forceUpdate();
	};

	const options: Array<DropdownOption> = APPLY_TO[plugin.type] || [];

	return <TuplePropertyDropdown value={plugin.applyTo} options={options} onChange={onApplyToChange}/>;
};