import React, {Fragment, useEffect} from 'react';
import {useParameterEventBus} from '../../parameter-event-bus';
import {ParameterEventTypes} from '../../parameter-event-bus-types';

export const Parameter2ExpressionBridge = (props: { onChange: () => void }) => {
	const {onChange} = props;

	const {on, off} = useParameterEventBus();
	useEffect(() => {
		on(ParameterEventTypes.PARAM_CHANGED, onChange);
		return () => {
			off(ParameterEventTypes.PARAM_CHANGED, onChange);
		};
	}, [on, off, onChange]);

	return <Fragment/>;
};