import {
	Objective,
	ObjectiveFactor,
	ObjectiveParameterCondition,
	ObjectiveParameterJoint
} from '@/services/data/tuples/objective-types';
import {isExpressionParameter, isJointParameter} from '@/services/data/tuples/objective-utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {useEffect} from 'react';
import {v4} from 'uuid';
import {Condition} from '../condition';
import {useJointEventBus} from '../event-bus/joint-event-bus';
import {JointEventTypes} from '../event-bus/joint-event-bus-types';
import {JointElementsContainer} from './widgets';

export const JointElements = (props: {
	objective: Objective; joint: ObjectiveParameterJoint; factors: Array<ObjectiveFactor>;
}) => {
	// noinspection DuplicatedCode
	const {objective, joint, factors} = props;

	if (!joint.filters) {
		joint.filters = [];
	}

	// noinspection DuplicatedCode
	const {on, off, fire} = useJointEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(JointEventTypes.SUB_EXPRESSION_ADDED, forceUpdate);
		on(JointEventTypes.SUB_JOINT_ADDED, forceUpdate);
		on(JointEventTypes.SUB_EXPRESSION_REMOVED, forceUpdate);
		on(JointEventTypes.SUB_JOINT_REMOVED, forceUpdate);
		return () => {
			off(JointEventTypes.SUB_EXPRESSION_ADDED, forceUpdate);
			off(JointEventTypes.SUB_JOINT_ADDED, forceUpdate);
			off(JointEventTypes.SUB_EXPRESSION_REMOVED, forceUpdate);
			off(JointEventTypes.SUB_JOINT_REMOVED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	if (joint.filters.length === 0) {
		return null;
	}

	const onConditionRemove = (condition: ObjectiveParameterCondition) => () => {
		const index = joint.filters.findIndex(filter => filter === condition);
		if (index !== -1) {
			joint.filters.splice(index, 1);
			if (isJointParameter(condition)) {
				fire(JointEventTypes.SUB_JOINT_REMOVED, condition, joint);
			} else if (isExpressionParameter(condition)) {
				fire(JointEventTypes.SUB_EXPRESSION_REMOVED, condition, joint);
			}
		}
	};
	const onConditionChange = (condition: ObjectiveParameterCondition) => () => {
		fire(JointEventTypes.EXPRESSION_CONTENT_CHANGED, condition, joint);
	};

	return <JointElementsContainer>
		{joint.filters.map(filter => {
			return <Condition objective={objective} condition={filter}
			                  removeMe={onConditionRemove(filter)} onChange={onConditionChange(filter)}
			                  factors={factors}
			                  key={v4()}/>;
		})}
	</JointElementsContainer>;
};