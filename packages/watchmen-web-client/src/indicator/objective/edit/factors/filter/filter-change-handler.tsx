import React, {Fragment, useEffect} from 'react';
import {useFilterEventBus} from './filter-event-bus';
import {FilterEventTypes} from './filter-event-bus-types';

export const FilterChangeHandler = (props: { onChange: () => void; }) => {
	const {onChange} = props;

	const {on, off} = useFilterEventBus();
	useEffect(() => {
		on(FilterEventTypes.TOP_TYPE_CHANGED, onChange);
		on(FilterEventTypes.CONTENT_CHANGED, onChange);
		return () => {
			off(FilterEventTypes.TOP_TYPE_CHANGED, onChange);
			off(FilterEventTypes.CONTENT_CHANGED, onChange);
		};
	}, [on, off, onChange]);

	return <Fragment/>;
};