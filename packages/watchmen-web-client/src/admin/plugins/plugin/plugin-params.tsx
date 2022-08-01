import {Plugin} from '@/services/data/tuples/plugin-types';
import {Button} from '@/widgets/basic/button';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInput, TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, Fragment} from 'react';
import styled from 'styled-components';
import {usePluginEventBus} from '../plugin-event-bus';
import {PluginEventTypes} from '../plugin-event-bus-types';

const ExtraParams = styled.div`
	display               : grid;
	grid-template-columns : calc(100% - 48px) 48px;
	grid-auto-rows        : minmax(var(--grid-tall-row-height), auto);
	grid-row-gap          : calc(var(--margin) / 4);
	align-content         : center;
	> span {
		align-self   : center;
		justify-self : center;
		font-weight  : var(--font-bold);
	}
	> button {
		align-self   : center;
		justify-self : end;
		height       : var(--height);
		width        : var(--height);
	}
`;
export const PluginParams = (props: { plugin: Plugin }) => {
	const {plugin} = props;

	const {fire} = usePluginEventBus();
	const forceUpdate = useForceUpdate();

	const onParamNameChange = (param: string, index: number) => (event: ChangeEvent<HTMLInputElement>) => {
		if (param !== event.target.value) {
			param = event.target.value;
			if (plugin.params == null) {
				plugin.params = [];
			}
			fire(PluginEventTypes.PLUGIN_PARAM_CHANGED, plugin);
			forceUpdate();
			if (index === plugin.params.length) {
				plugin.params = [...plugin.params, param];
			} else {
				plugin.params[index] = param;
			}
		}
	};
	const onParamDelete = (param: string, index: number) => () => {
		plugin.params = (plugin.params || []).filter((_, idx) => idx !== index);
		fire(PluginEventTypes.PLUGIN_PARAM_CHANGED, plugin);
		forceUpdate();
	};

	const params = [...(plugin.params || []), ''];

	return <>
		<TuplePropertyLabel>Parameters:</TuplePropertyLabel>
		<ExtraParams>
			{params.map((param, index) => {
				return <Fragment key={index}>
					<TuplePropertyInput value={param || ''} onChange={onParamNameChange(param, index)}
					                    placeholder={'Parameter name'}/>
					<Button ink={ButtonInk.DANGER} onClick={onParamDelete(param, index)}>
						<FontAwesomeIcon icon={ICON_DELETE}/>
					</Button>
				</Fragment>;
			})}
		</ExtraParams>
	</>;
};