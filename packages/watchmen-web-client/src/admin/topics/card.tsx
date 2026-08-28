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
import React, {MouseEvent} from 'react';
import styled from 'styled-components';
import {useTopicProfileEventBus} from '../topic-profile/topic-profile-event-bus';
import {TopicProfileEventTypes} from '../topic-profile/topic-profile-event-bus-types';

const TopicCardDeleteButton = styled(TupleProfileButton)`
	&:hover {
		color : var(--danger-color);
	}
`;

const TopicCardTags = styled.div.attrs({'data-widget': 'topic-card-tags'})`
	display   : flex;
	flex-wrap : wrap;
	gap       : calc(var(--margin) / 5);
	> span {
		display       : flex;
		align-items   : center;
		height        : 1.4em;
		padding       : 0 calc(var(--margin) / 4);
		border        : var(--border);
		border-radius : calc(var(--border-radius) / 2);
		font-size     : 0.85em;
		font-variant  : petite-caps;
		white-space   : nowrap;
		opacity       : 0.85;
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
		fireProfile(TopicProfileEventTypes.SHOW_PROFILE, topicData);
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
		{(topic.tags ?? []).length !== 0
			? <TopicCardTags>
				{(topic.tags ?? []).map(tag => <span key={tag}>{tag}</span>)}
			</TopicCardTags>
			: null}
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
