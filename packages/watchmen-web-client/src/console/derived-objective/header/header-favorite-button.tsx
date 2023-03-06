import {saveFavorite} from '@/services/data/console/favorite';
import {Favorite} from '@/services/data/console/favorite-types';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ICON_FAVORITE} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {useConsoleEventBus} from '../../console-event-bus';
import {ConsoleEventTypes} from '../../console-event-bus-types';

const FavoriteIcon = styled(FontAwesomeIcon).attrs<{ 'data-favorite': boolean }>(({'data-favorite': favorite}) => {
	return {
		style: {color: favorite ? 'var(--warn-color)' : (void 0)}
	};
})`
	transition : color 300ms ease-in-out;
`;

export const HeaderFavoriteButton = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useConsoleEventBus();
	const [favorite, setFavorite] = useState(false);
	useEffect(() => {
		fire(ConsoleEventTypes.ASK_FAVORITE, ({derivedObjectiveIds}: Favorite) => {
			// eslint-disable-next-line
			const found = (derivedObjectiveIds ?? []).find(derivedObjectiveId => derivedObjectiveId == derivedObjective.derivedObjectiveId);
			if (found) {
				setFavorite(true);
			} else if (!found) {
				setFavorite(false);
			}
		});
	}, [fire, derivedObjective]);
	useEffect(() => {
		const onDerivedObjectiveAddedIntoFavorite = (addedDerivedObjectiveId: string) => {
			// eslint-disable-next-line
			if (addedDerivedObjectiveId == derivedObjective.derivedObjectiveId) {
				setFavorite(true);
			}
		};
		const onDerivedObjectiveRemovedFromFavorite = (removedDerivedObjectiveId: string) => {
			// eslint-disable-next-line
			if (removedDerivedObjectiveId == derivedObjective.derivedObjectiveId) {
				setFavorite(false);
			}
		};

		on(ConsoleEventTypes.DERIVED_OBJECTIVE_ADDED_INTO_FAVORITE, onDerivedObjectiveAddedIntoFavorite);
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, onDerivedObjectiveRemovedFromFavorite);
		return () => {
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_ADDED_INTO_FAVORITE, onDerivedObjectiveAddedIntoFavorite);
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, onDerivedObjectiveRemovedFromFavorite);
		};
	}, [on, off, derivedObjective]);

	const onAddIntoFavoriteClicked = () => {
		fire(ConsoleEventTypes.ASK_FAVORITE, (favorite: Favorite) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await saveFavorite({
					...favorite,
					derivedObjectiveIds: Array.from(new Set([...favorite.derivedObjectiveIds, derivedObjective.derivedObjectiveId]))
				}),
				() => fire(ConsoleEventTypes.DERIVED_OBJECTIVE_ADDED_INTO_FAVORITE, derivedObjective.derivedObjectiveId));
		});
	};
	const onRemoveFromFavoriteClicked = () => {
		fire(ConsoleEventTypes.ASK_FAVORITE, (favorite: Favorite) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await saveFavorite({
					...favorite,
					// eslint-disable-next-line
					derivedObjectiveIds: favorite.derivedObjectiveIds.filter(derivedObjectiveId => derivedObjectiveId != derivedObjective.derivedObjectiveId)
				}),
				() => fire(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, derivedObjective.derivedObjectiveId));
		});
	};

	return <PageHeaderButton
		tooltip={favorite ? Lang.CONSOLE.DERIVED_OBJECTIVE.REMOVE_FROM_FAVORITE : Lang.CONSOLE.DERIVED_OBJECTIVE.ADD_INTO_FAVORITE}
		onClick={favorite ? onRemoveFromFavoriteClicked : onAddIntoFavoriteClicked}>
		<FavoriteIcon icon={ICON_FAVORITE} data-favorite={favorite}/>
	</PageHeaderButton>;
};