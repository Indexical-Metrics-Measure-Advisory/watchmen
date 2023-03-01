import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveVariable} from '@/services/data/tuples/objective-types';
import {useEffect, useState} from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {VariablesContainer} from './widgets';

export const Variables = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	const {on, off} = useObjectiveEventBus();
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const onSwitchVariablesVisible = (switchTo: boolean) => {
			setVisible(switchTo);
		};
		on(ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, onSwitchVariablesVisible);
		return () => {
			off(ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, onSwitchVariablesVisible);
		};
	}, [on, off]);

	const {definition: objective} = derivedObjective;
	const variables: Array<ObjectiveVariable> = objective.variables || [];

	return <VariablesContainer data-visible={visible}>

	</VariablesContainer>;
};