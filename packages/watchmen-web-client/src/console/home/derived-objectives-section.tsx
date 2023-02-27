import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ICON_ADD} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useRef, useState} from 'react';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {useDerivedObjective} from '../widgets/use-derived-objective';
import {DerivedObjectiveCard} from './derived-objective-card';
import {SortType, ViewType} from './types';
import {useMaxHeight} from './use-max-height';
import {
	HeaderButton,
	HomeSection,
	HomeSectionBody,
	HomeSectionHeader,
	HomeSectionHeaderOperators,
	HomeSectionTitle,
	NoRecentUse
} from './widgets';

export const DerivedObjectivesSection = () => {
	const {fire} = useConsoleEventBus();
	const bodyRef = useRef<HTMLDivElement>(null);
	const [sortType] = useState<SortType>(SortType.BY_VISIT_TIME);
	const [viewType] = useState<ViewType>(ViewType.ALL);
	const [derivedObjectives, setDerivedObjectives] = useState<Array<DerivedObjective>>([]);
	useEffect(() => {
		fire(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, (newDerivedObjectives) => {
			if (newDerivedObjectives !== derivedObjectives) {
				setDerivedObjectives(newDerivedObjectives);
			}
		});
	}, [fire, derivedObjectives]);
	const maxHeight = useMaxHeight(bodyRef);

	const onDerivedObjectiveClicked = useDerivedObjective();

	const sortedDerivedObjectives: Array<DerivedObjective> = (() => {
		if (sortType === SortType.BY_VISIT_TIME) {
			return [...derivedObjectives.sort((cs1, cs2) => {
				return (cs2.lastVisitTime || '').localeCompare(cs1.lastVisitTime || '');
			})];
		} else {
			return [];
		}
	})();
	if (sortedDerivedObjectives.length > 3) {
		sortedDerivedObjectives.length = 3;
	}

	return <HomeSection>
		<HomeSectionHeader>
			<HomeSectionTitle>{Lang.CONSOLE.HOME.DERIVED_OBJECTIVE_TITLE}</HomeSectionTitle>
			<HomeSectionHeaderOperators>
				<HeaderButton ink={ButtonInk.PRIMARY} onClick={onDerivedObjectiveClicked}>
					<FontAwesomeIcon icon={ICON_ADD}/>
					<span>{Lang.CONSOLE.HOME.CREATE_DERIVED_OBJECTIVE_BUTTON}</span>
				</HeaderButton>
			</HomeSectionHeaderOperators>
		</HomeSectionHeader>
		<HomeSectionBody collapse={viewType !== ViewType.ALL} maxHeight={maxHeight} ref={bodyRef}>
			{sortedDerivedObjectives.length === 0
				? <NoRecentUse>{Lang.CONSOLE.HOME.NO_RECENT}</NoRecentUse>
				: sortedDerivedObjectives.map(derivedObjective => {
					return <DerivedObjectiveCard derivedObjective={derivedObjective}
					                             key={derivedObjective.derivedObjectiveId}/>;
				})}
		</HomeSectionBody>
	</HomeSection>;
};