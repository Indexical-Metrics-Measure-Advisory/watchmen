import {useConsoleEventBus} from '@/console/console-event-bus';
import {ConsoleEventTypes} from '@/console/console-event-bus-types';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {Fragment, useEffect} from 'react';

export const SimulateConsole = (props: { derivedObjectives: Array<DerivedObjective> }) => {
	const {derivedObjectives} = props;

	const {on, off, fire} = useConsoleEventBus();
	useEffect(() => {
		const onAskDerivedObjectives = (onData: (derivedObjectives: Array<DerivedObjective>) => void) => {
			onData(derivedObjectives);
		};
		on(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, onAskDerivedObjectives);
		return () => {
			off(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, onAskDerivedObjectives);
		};
	}, [on, off, fire, derivedObjectives]);

	return <Fragment/>;
};