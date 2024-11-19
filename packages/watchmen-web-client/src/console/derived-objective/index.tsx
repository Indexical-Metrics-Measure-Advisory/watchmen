import {Router} from '@/routes/types';
import {toDerivedObjective} from '@/routes/utils';
import {DerivedObjective, DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {FullWidthPage} from '@/widgets/basic/page';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {DerivedObjectivePage} from './derived-objective';

const ConsoleDerivedObjectiveIndex = () => {
	const {derivedObjectiveId} = useParams<{ derivedObjectiveId: DerivedObjectiveId }>();

	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const {fire, on, off} = useConsoleEventBus();
	const [derivedObjective, setDerivedObjective] = useState<DerivedObjective | null>(null);
	useEffect(() => {
		fire(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, (derivedObjectives: Array<DerivedObjective>) => {
			// eslint-disable-next-line
			const derivedObjective = derivedObjectives.find(derivedObjective => derivedObjective.derivedObjectiveId == derivedObjectiveId);
			if (derivedObjective) {
				setDerivedObjective(derivedObjective);
			} else {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					{Lang.CONSOLE.ERROR.DERIVED_OBJECTIVE_NOT_FOUND}
				</AlertLabel>, () => {
					navigate(Router.CONSOLE, {replace: true});
				});
			}
		});
	}, [fire, fireGlobal, navigate, derivedObjectiveId]);
	useEffect(() => {
		const onDerivedObjectiveRemoved = (derivedObjective: DerivedObjective) => {
			// eslint-disable-next-line
			if (derivedObjective.derivedObjectiveId != derivedObjectiveId) {
				return;
			}

			fire(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, (derivedObjectives: Array<DerivedObjective>) => {
				// eslint-disable-next-line
				const derivedObjective = derivedObjectives.sort((d1, d2) => {
					return d1.name.toLowerCase().localeCompare(d2.name.toLowerCase());
					// eslint-disable-next-line
				}).find(derivedObjective => derivedObjective.derivedObjectiveId != derivedObjectiveId);
				if (derivedObjective) {
					// switch to another one
					navigate(toDerivedObjective(derivedObjective.derivedObjectiveId), {replace: true});
				} else {
					// no derived objective, to home
					navigate(Router.CONSOLE_HOME, {replace: true});
				}
			});
		};
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED, onDerivedObjectiveRemoved);
		return () => {
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED, onDerivedObjectiveRemoved);
		};
	}, [fire, on, off, navigate, derivedObjectiveId]);

	// eslint-disable-next-line
	if (!derivedObjective || derivedObjective.derivedObjectiveId != derivedObjectiveId) {
		return null;
	}

	return <FullWidthPage>
		<DerivedObjectivePage derivedObjective={derivedObjective}/>
	</FullWidthPage>;
};

export default ConsoleDerivedObjectiveIndex;