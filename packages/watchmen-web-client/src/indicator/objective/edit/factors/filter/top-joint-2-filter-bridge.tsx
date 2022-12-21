import {ObjectiveFactor} from '@/services/data/tuples/objective-types';
import React, {Fragment, useEffect} from 'react';
import {useJointEventBus} from './event-bus/joint-event-bus';
import {JointEventTypes} from './event-bus/joint-event-bus-types';
import {useFilterEventBus} from './filter-event-bus';
import {FilterEventTypes} from './filter-event-bus-types';

export const TopJoint2FilterBridge = (props: { factor: ObjectiveFactor }) => {
	const {factor} = props;

	const {fire: fireConditional} = useFilterEventBus();
	const {on, off} = useJointEventBus();
	useEffect(() => {
		const onContentChange = () => fireConditional(FilterEventTypes.CONTENT_CHANGED, factor);
		on(JointEventTypes.SUB_JOINT_ADDED, onContentChange);
		on(JointEventTypes.SUB_JOINT_REMOVED, onContentChange);
		on(JointEventTypes.SUB_EXPRESSION_ADDED, onContentChange);
		on(JointEventTypes.SUB_EXPRESSION_REMOVED, onContentChange);
		on(JointEventTypes.EXPRESSION_CONTENT_CHANGED, onContentChange);
		return () => {
			off(JointEventTypes.SUB_JOINT_ADDED, onContentChange);
			off(JointEventTypes.SUB_JOINT_REMOVED, onContentChange);
			off(JointEventTypes.SUB_EXPRESSION_ADDED, onContentChange);
			off(JointEventTypes.SUB_EXPRESSION_REMOVED, onContentChange);
			off(JointEventTypes.EXPRESSION_CONTENT_CHANGED, onContentChange);
		};
	}, [fireConditional, on, off, factor]);

	return <Fragment/>;
};