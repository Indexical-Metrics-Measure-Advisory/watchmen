import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {prettifyDateTimeToMinute} from '@/services/data/tuples/utils';
import {ICON_CREATED_AT, ICON_LAST_MODIFIED_AT} from '@/widgets/basic/constants';
import {TooltipAlignment} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {
	TupleCard,
	TupleCardDescription,
	TupleCardStatistics,
	TupleCardStatisticsItem,
	TupleCardTitle
} from '@/widgets/tuple-workbench/tuple-card';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';

const ObjectiveCard = (props: { objective: QueryObjective }) => {
	const {objective} = props;

	const {fire} = useTupleEventBus();

	const onEditClicked = () => {
		fire(TupleEventTypes.DO_EDIT_TUPLE, objective);
	};

	return <TupleCard key={objective.objectiveId} onClick={onEditClicked}>
		<TupleCardTitle>
			<span>{objective.name}</span>
		</TupleCardTitle>
		<TupleCardDescription>{objective.description}</TupleCardDescription>
		<TupleCardStatistics>
			<TupleCardStatisticsItem
				tooltip={{label: Lang.INDICATOR.OBJECTIVE.CREATE_AT, alignment: TooltipAlignment.CENTER}}>
				<FontAwesomeIcon icon={ICON_CREATED_AT}/>
				<span>{prettifyDateTimeToMinute(objective.createdAt)}</span>
			</TupleCardStatisticsItem>
			<TupleCardStatisticsItem
				tooltip={{
					label: Lang.INDICATOR.OBJECTIVE.LAST_MODIFIED_AT,
					alignment: TooltipAlignment.CENTER
				}}>
				<FontAwesomeIcon icon={ICON_LAST_MODIFIED_AT}/>
				<span>{prettifyDateTimeToMinute(objective.lastModifiedAt)}</span>
			</TupleCardStatisticsItem>
		</TupleCardStatistics>
	</TupleCard>;
};

export const renderCard = (objective: QueryObjective) => {
	return <ObjectiveCard objective={objective}/>;
};