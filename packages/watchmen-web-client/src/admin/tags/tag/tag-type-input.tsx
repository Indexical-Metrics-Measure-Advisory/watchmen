import {Tag, TagType} from '@/services/data/tuples/tag-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {useTagEventBus} from '../tag-event-bus';
import {TagEventTypes} from '../tag-event-bus-types';

const TagTypeOptions: Array<DropdownOption> = [
	{value: TagType.TOPIC, label: 'Topic'},
	{value: TagType.SUBJECT, label: 'Subject'},
	{value: TagType.INDICATOR, label: 'Indicator'}
];

export const TagTypeInput = (props: { tag: Tag }) => {
	const {tag} = props;

	const {fire} = useTagEventBus();
	const forceUpdate = useForceUpdate();
	const onTypeChange = (option: DropdownOption) => {
		if (tag.type !== option.value) {
			tag.type = option.value as TagType;
			fire(TagEventTypes.TAG_TYPE_CHANGED, tag);
			forceUpdate();
		}
	};

	return <TuplePropertyDropdown value={tag.type} options={TagTypeOptions} onChange={onTypeChange}/>;
};
