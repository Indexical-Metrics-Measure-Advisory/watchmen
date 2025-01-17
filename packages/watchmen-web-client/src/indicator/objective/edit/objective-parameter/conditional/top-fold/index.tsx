import {ConditionalObjectiveParameter} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {useEffect} from 'react';
import {useConditionalEventBus} from '../conditional-event-bus';
import {ConditionalEventTypes} from '../conditional-event-bus-types';
import {JointFold} from '../joint-fold';

export const TopFold = (props: { conditional: ConditionalObjectiveParameter }) => {
	// noinspection DuplicatedCode
	const {conditional} = props;

	const {on, off} = useConditionalEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ConditionalEventTypes.TOP_TYPE_CHANGED, forceUpdate);
		return () => {
			off(ConditionalEventTypes.TOP_TYPE_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	if (!conditional.on) {
		return null;
	}

	return <JointFold/>;
};