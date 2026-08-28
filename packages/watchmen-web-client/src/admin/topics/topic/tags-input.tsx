import {loadAvailableTopicTags} from '@/services/data/tuples/topic';
import {Topic} from '@/services/data/tuples/topic-types';
import {ICON_CLOSE} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useRef, useState} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {
	TopicTagsChip,
	TopicTagsChipRemove,
	TopicTagsChips,
	TopicTagsContainer,
	TopicTagsInputBox,
	TopicTagsSuggestion
} from './tags-input-widgets';

export const TopicTagsInput = (props: { topic: Topic }) => {
	const {topic} = props;

	const {fire} = useTopicEventBus();
	const {fire: fireGlobal} = useEventBus();
	const forceUpdate = useForceUpdate();
	const [available, setAvailable] = useState<Array<string>>([]);
	const [text, setText] = useState('');
	const [focused, setFocused] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await loadAvailableTopicTags(),
			(tags: Array<string>) => setAvailable(tags || []));
	}, [fireGlobal]);

	useEffect(() => {
		const onMouseDown = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setFocused(false);
			}
		};
		document.addEventListener('mousedown', onMouseDown);
		return () => document.removeEventListener('mousedown', onMouseDown);
	}, []);

	const changeTags = (tags: Array<string>) => {
		topic.tags = tags;
		fire(TopicEventTypes.TOPIC_TAGS_CHANGED, topic);
		forceUpdate();
	};

	const addTag = (tag: string) => {
		const trimmed = tag.trim();
		if (!trimmed) {
			return;
		}
		const tags = topic.tags ?? [];
		if (!tags.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
			changeTags([...tags, trimmed]);
		}
		setText('');
	};

	const removeTag = (tag: string) => {
		changeTags((topic.tags ?? []).filter(x => x !== tag));
	};

	const suggestions = available
		.filter(tag => !(topic.tags ?? []).some(x => x.toLowerCase() === tag.toLowerCase()))
		.filter(tag => !text.trim() || tag.toLowerCase().includes(text.trim().toLowerCase()));

	return <TopicTagsContainer ref={containerRef}>
		<TopicTagsChips>
			{(topic.tags ?? []).map(tag =>
				<TopicTagsChip key={tag}>
					<span>{tag}</span>
					<TopicTagsChipRemove onClick={() => removeTag(tag)}>
						<FontAwesomeIcon icon={ICON_CLOSE}/>
					</TopicTagsChipRemove>
				</TopicTagsChip>)}
			<TopicTagsInputBox value={text}
			                   placeholder="Type to add tag..."
			                   onChange={event => {
				                   setText(event.target.value);
				                   setFocused(true);
			                   }}
			                   onFocus={() => setFocused(true)}
			                   onKeyDown={event => {
				                   if (event.key === 'Enter') {
					                   event.preventDefault();
					                   addTag(text);
				                   }
			                   }}/>
		</TopicTagsChips>
		{focused && suggestions.length > 0
			? <TopicTagsSuggestion>
				{suggestions.map(tag =>
					<span key={tag} onClick={() => addTag(tag)}>{tag}</span>)}
			</TopicTagsSuggestion>
			: null}
	</TopicTagsContainer>;
};
