import {Tag} from '@/services/data/tuples/tag-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInput} from '@/widgets/tuple-workbench/tuple-editor';
import React, {ChangeEvent} from 'react';
import {useTagEventBus} from '../tag-event-bus';
import {TagEventTypes} from '../tag-event-bus-types';

export const TagNameInput = (props: { tag: Tag }) => {
	const {tag} = props;

	const {fire} = useTagEventBus();
	const forceUpdate = useForceUpdate();
	const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (tag.name !== event.target.value) {
			tag.name = event.target.value;
			fire(TagEventTypes.TAG_NAME_CHANGED, tag);
			forceUpdate();
		}
	};

	return <TuplePropertyInput value={tag.name || ''} onChange={onNameChange}/>;
};
