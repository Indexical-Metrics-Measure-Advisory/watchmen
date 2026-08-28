import {Tag} from '@/services/data/tuples/tag-types';
import {TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {TagDescriptionInput} from './tag/tag-description-input';
import {TagNameInput} from './tag/tag-name-input';
import {TagTypeInput} from './tag/tag-type-input';
import {TagEventBusProvider} from './tag-event-bus';

const TagEditor = (props: { tag: Tag }) => {
	const {tag} = props;

	return <TagEventBusProvider>
		<TuplePropertyLabel>Tag Name:</TuplePropertyLabel>
		<TagNameInput tag={tag}/>
		<TuplePropertyLabel>Tag Type:</TuplePropertyLabel>
		<TagTypeInput tag={tag}/>
		<TuplePropertyLabel>Description:</TuplePropertyLabel>
		<TagDescriptionInput tag={tag}/>
	</TagEventBusProvider>;
};

export const renderEditor = (tag: Tag) => {
	return <TagEditor tag={tag}/>;
};
