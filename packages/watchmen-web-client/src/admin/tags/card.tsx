import {QueryTag} from '@/services/data/tuples/query-tag-types';
import {StandardTupleCard} from '@/widgets/tuple-workbench/tuple-card';
import React from 'react';

export const renderCard = (tag: QueryTag) => {
	return <StandardTupleCard key={tag.tagId} tuple={tag}
	                          name={() => tag.name}
	                          description={() => tag.description}/>;
};
