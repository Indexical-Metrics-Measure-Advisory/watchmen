import {Objective} from '@/services/data/tuples/objective-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {Fragment, useEffect} from 'react';
// noinspection ES6PreferShortImport
import {useConsanguinityEventBus} from '../consanguinity-event-bus';
// noinspection ES6PreferShortImport
import {ConsanguinityEventTypes} from '../consanguinity-event-bus-types';
import {SingleObjectiveConsanguinityDiagram} from './diagram';

export const SingleObjectiveConsanguinity = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useConsanguinityEventBus();
	useEffect(() => {
		const onAskSingleObjective = (objective: Objective) => {
			fireGlobal(EventTypes.SHOW_DIALOG, <SingleObjectiveConsanguinityDiagram objective={objective}/>, {
				marginTop: '5vh',
				marginLeft: '5%',
				width: '90%',
				height: '90vh',
				padding: 0,
				border: 'none',
				borderRadius: 'calc(var(--margin) / 2)',
				backgroundColor: 'var(--consanguinity-container-bg-color)'
			});
		};
		on(ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, onAskSingleObjective);
		return () => {
			off(ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, onAskSingleObjective);
		};
	}, [fireGlobal, on, off]);
	return <Fragment/>;
};