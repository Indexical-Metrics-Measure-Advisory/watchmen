import {Plugin} from '@/services/data/tuples/plugin-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInput} from '@/widgets/tuple-workbench/tuple-editor';
import React, {ChangeEvent} from 'react';
import {usePluginEventBus} from '../plugin-event-bus';
import {PluginEventTypes} from '../plugin-event-bus-types';

export const PluginCodeInput = (props: { plugin: Plugin }) => {
	const {plugin} = props;

	const {fire} = usePluginEventBus();
	const forceUpdate = useForceUpdate();
	const onCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (plugin.pluginCode !== event.target.value) {
			plugin.pluginCode = event.target.value;
			fire(PluginEventTypes.PLUGIN_CODE_CHANGED, plugin);
			forceUpdate();
		}
	};

	return <TuplePropertyInput value={plugin.pluginCode || ''} onChange={onCodeChange}/>;
};