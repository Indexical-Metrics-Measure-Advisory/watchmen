import {Topic, TopicKind, TopicType} from '@/services/data/tuples/topic-types';
import {DwarfButton} from '@/widgets/basic/button';
import {ICON_UPLOAD} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';

export const ImportMetaDataButton = (props: { topic: Topic }) => {
	const {topic} = props;

	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useTopicEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onTopicTypeOrKindChanged = () => {
			forceUpdate();
		};
		on(TopicEventTypes.TOPIC_TYPE_CHANGED, onTopicTypeOrKindChanged);
		on(TopicEventTypes.TOPIC_KIND_CHANGED, onTopicTypeOrKindChanged);
		return () => {
			off(TopicEventTypes.TOPIC_TYPE_CHANGED, onTopicTypeOrKindChanged);
			off(TopicEventTypes.TOPIC_KIND_CHANGED, onTopicTypeOrKindChanged);
		};
	}, [on, off, topic, forceUpdate]);

	if (topic.type !== TopicType.META || topic.kind === TopicKind.SYNONYM) {
		return null;
	}

	const onImportClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			'Existing meta will be truncated and replaced by imported items, are you sure to continue?',
			async () => {
				fireGlobal(EventTypes.HIDE_DIALOG);
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				});
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	return <DwarfButton ink={ButtonInk.PRIMARY} onClick={onImportClicked}>
		<FontAwesomeIcon icon={ICON_UPLOAD}/>
		<span>Import Meta Data</span>
	</DwarfButton>;
};