import {Tag} from '@/services/data/tuples/tag-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInputLines} from '@/widgets/tuple-workbench/tuple-editor';
import React, {ChangeEvent} from 'react';
import {useTagEventBus} from '../tag-event-bus';
import {TagEventTypes} from '../tag-event-bus-types';

export const TagDescriptionInput = (props: { tag: Tag }) => {
	const {tag} = props;

	const {fire} = useTagEventBus();
	const forceUpdate = useForceUpdate();

	const onDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		if (tag.description !== event.target.value) {
			tag.description = event.target.value;
			fire(TagEventTypes.TAG_DESCRIPTION_CHANGED, tag);
			forceUpdate();
		}
	};

	return <TuplePropertyInputLines value={tag.description || ''} onChange={onDescriptionChange}/>;
};
