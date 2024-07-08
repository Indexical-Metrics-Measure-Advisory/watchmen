import {QueryStory} from '@/services/data/tuples/query-story-types';
import {ICON_CREATED_AT, ICON_LAST_MODIFIED_AT} from '@/widgets/basic/constants';
import {TooltipAlignment} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {
	TupleCard,
	TupleCardStatistics,
	TupleCardStatisticsItem,
	TupleCardTitle
} from '@/widgets/tuple-workbench/tuple-card';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';

const StoryCard = (props: { queryStory: QueryStory }) => {
	const {queryStory} = props;

	const {fire} = useTupleEventBus();

	const onEditClicked = () => {
		fire(TupleEventTypes.DO_EDIT_TUPLE, queryStory);
	};

	return <TupleCard key={queryStory.storyId} onClick={onEditClicked}>
		<TupleCardTitle>
			<span>{queryStory.name}</span>
		</TupleCardTitle>
		<TupleCardStatistics>
			<TupleCardStatisticsItem
				tooltip={{label: Lang.INDICATOR.CONVERGENCE.CREATE_AT, alignment: TooltipAlignment.CENTER}}>
				<FontAwesomeIcon icon={ICON_CREATED_AT}/>
				<span>Edit</span>
			</TupleCardStatisticsItem>
			<TupleCardStatisticsItem
				tooltip={{
					label: Lang.INDICATOR.CONVERGENCE.LAST_MODIFIED_AT,
					alignment: TooltipAlignment.CENTER
				}}>
				<FontAwesomeIcon icon={ICON_LAST_MODIFIED_AT}/>
				<span>View</span>
			</TupleCardStatisticsItem>
		</TupleCardStatistics>
	</TupleCard>;
};

export const renderCard = (queryStory: QueryStory) => {
	return <StoryCard queryStory={queryStory}/>;
};