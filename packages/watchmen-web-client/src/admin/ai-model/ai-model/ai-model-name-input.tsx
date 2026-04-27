import {AiModel} from '@/services/data/tuples/ai-model-types';
import {TuplePropertyInput} from '@/widgets/tuple-workbench/tuple-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {ChangeEvent} from 'react';

export const AiModelNameInput = (props: { model: AiModel }) => {
	const {model} = props;
	const forceUpdate = useForceUpdate();
	const {fire: fireTuple} = useTupleEventBus();

	const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
		model.name = event.target.value;
		fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
		forceUpdate();
	};

	return <TuplePropertyInput value={model.name || ''} onChange={onValueChange}/>;
};