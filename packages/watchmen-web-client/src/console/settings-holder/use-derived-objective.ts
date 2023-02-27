import {DerivedObjective, DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {Dispatch, SetStateAction, useEffect} from 'react';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {HoldSettings} from './types';

export const useDerivedObjective = (options: {
	setHoldSettings: Dispatch<SetStateAction<HoldSettings>>
}) => {
	const {setHoldSettings} = options;
	const {on, off, fire} = useConsoleEventBus();
	useEffect(() => {
		const onDerivedObjectiveCreated = (derivedObjective: DerivedObjective) => {
			// refresh is unnecessary
			setHoldSettings(holdSettings => ({
				...holdSettings,
				derivedObjectives: [...holdSettings.derivedObjectives, derivedObjective]
			}));
		};
		const onDerivedObjectiveRemoved = (derivedObjective: DerivedObjective) => {
			setHoldSettings(holdSettings => ({
				...holdSettings,
				derivedObjectives: holdSettings.derivedObjectives.filter(exists => exists !== derivedObjective),
				// eslint-disable-next-line
				favorite: {
					...holdSettings.favorite,
					// eslint-disable-next-line
					derivedObjectiveIds: holdSettings.favorite.derivedObjectiveIds.filter(id => id != derivedObjective.derivedObjectiveId)
				}
			}));
		};
		const onDerivedObjectiveAddedIntoFavorite = (derivedObjectiveId: DerivedObjectiveId) => {
			setHoldSettings(holdSettings => ({
				...holdSettings,
				favorite: {
					...holdSettings.favorite,
					derivedObjectiveIds: Array.from(new Set<string>([...holdSettings.favorite.derivedObjectiveIds, derivedObjectiveId]))
				}
			}));
		};
		const onDerivedObjectiveRemovedFromFavorite = (derivedObjectiveId: DerivedObjectiveId) => {
			setHoldSettings(holdSettings => ({
				...holdSettings,
				favorite: {
					...holdSettings.favorite,
					// eslint-disable-next-line
					derivedObjectiveIds: holdSettings.favorite.derivedObjectiveIds.filter(id => id != derivedObjectiveId)
				}
			}));
		};

		on(ConsoleEventTypes.DERIVED_OBJECTIVE_CREATED, onDerivedObjectiveCreated);
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED, onDerivedObjectiveRemoved);
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_ADDED_INTO_FAVORITE, onDerivedObjectiveAddedIntoFavorite);
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, onDerivedObjectiveRemovedFromFavorite);
		return () => {
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_CREATED, onDerivedObjectiveCreated);
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED, onDerivedObjectiveRemoved);
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_ADDED_INTO_FAVORITE, onDerivedObjectiveAddedIntoFavorite);
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, onDerivedObjectiveRemovedFromFavorite);
		};
	}, [on, off, fire, setHoldSettings]);
};