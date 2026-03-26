import {QueryTopic} from '@/services/data/tuples/query-topic-types';
import {fetchTopic} from '@/services/data/tuples/topic';
import {isTopicProfileAvailable} from '@/services/data/tuples/topic-utils';
import {prettifyDateTimeToMinute} from '@/services/data/tuples/utils';
import {ICON_CREATED_AT, ICON_DELETE, ICON_LAST_MODIFIED_AT, ICON_TOPIC_PROFILE} from '@/widgets/basic/constants';
import {TooltipAlignment} from '@/widgets/basic/types';
import {
	TupleCard,
	TupleCardDescription,
	TupleCardStatistics,
	TupleCardStatisticsItem,
	TupleCardTitle,
	TupleProfileButton
} from '@/widgets/tuple-workbench/tuple-card';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import dayjs from 'dayjs';
import React, {MouseEvent} from 'react';
import styled from 'styled-components';
import {useTopicProfileEventBus} from '../topic-profile/topic-profile-event-bus';
import {TopicProfileEventTypes} from '../topic-profile/topic-profile-event-bus-types';

const TopicCardDeleteButton = styled(TupleProfileButton)`
	&:hover {
		color : var(--danger-color);
	}
`;

const TopicCard = (props: { topic: QueryTopic, canDelete: boolean }) => {
	const {topic, canDelete} = props;

	const {fire} = useTupleEventBus();
	const {fire: fireProfile} = useTopicProfileEventBus();

	const onEditClicked = () => {
		fire(TupleEventTypes.DO_EDIT_TUPLE, topic);
	};
	const onProfileClicked = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		const {topic: topicData} = await fetchTopic(topic.topicId);
		fireProfile(TopicProfileEventTypes.SHOW_PROFILE, topicData, dayjs());
	};
	const onDeleteClicked = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		fire(TupleEventTypes.DO_DELETE_TUPLE, topic);
	};

	return <TupleCard key={topic.topicId} onClick={onEditClicked}>
		<TupleCardTitle>
			<span>{topic.name}</span>
			{isTopicProfileAvailable(topic)
				? <TupleProfileButton tooltip={{label: 'Profile', alignment: TooltipAlignment.CENTER}}
				                      onClick={onProfileClicked}>
					<FontAwesomeIcon icon={ICON_TOPIC_PROFILE}/>
				</TupleProfileButton>
				: null}
			{canDelete
				? <TopicCardDeleteButton tooltip={{label: 'Delete', alignment: TooltipAlignment.CENTER}}
				                       onClick={onDeleteClicked}>
					<FontAwesomeIcon icon={ICON_DELETE}/>
				</TopicCardDeleteButton>
				: null}
		</TupleCardTitle>
		<TupleCardDescription>{topic.description}</TupleCardDescription>
		<TupleCardStatistics>
			<TupleCardStatisticsItem tooltip={{label: 'Created At', alignment: TooltipAlignment.CENTER}}>
				<FontAwesomeIcon icon={ICON_CREATED_AT}/>
				<span>{prettifyDateTimeToMinute(topic.createdAt)}</span>
			</TupleCardStatisticsItem>
			<TupleCardStatisticsItem tooltip={{label: 'Last Modified At', alignment: TooltipAlignment.CENTER}}>
				<FontAwesomeIcon icon={ICON_LAST_MODIFIED_AT}/>
				<span>{prettifyDateTimeToMinute(topic.lastModifiedAt)}</span>
			</TupleCardStatisticsItem>
		</TupleCardStatistics>
	</TupleCard>;
};

export const renderCard = (topic: QueryTopic, canDelete = false) => {
	return <TopicCard topic={topic} canDelete={canDelete}/>;
};
