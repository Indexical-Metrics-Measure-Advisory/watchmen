import {Fragment, useEffect} from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {useBreakdownTargetEventBus} from '../breakdown-target/breakdown-target-event-bus';
import {BreakdownTargetEventTypes} from '../breakdown-target/breakdown-target-event-bus-types';

export const ObjectiveValuesHandler = () => {
	const {on, off} = useObjectiveEventBus();
	const {fire: fireBreakdown} = useBreakdownTargetEventBus();
	useEffect(() => {
		const onValuesFetched = () => {
			fireBreakdown(BreakdownTargetEventTypes.ASK_VALUES);
		};
		on(ObjectiveEventTypes.VALUES_FETCHED, onValuesFetched);
		return () => {
			off(ObjectiveEventTypes.VALUES_FETCHED, onValuesFetched);
		};
	}, [on, off, fireBreakdown]);

	return <Fragment/>;
};