// noinspection DuplicatedCode

import {ObjectiveParameterJoint, ObjectiveParameterJointType} from '@/services/data/tuples/objective-types';
import {ICON_ADD} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {createFactorEqualsConstantParameter, createJointParameter} from '../../../param-utils';
import {useJointEventBus} from '../event-bus/joint-event-bus';
import {JointEventTypes} from '../event-bus/joint-event-bus-types';
import {JointOperator, JointOperatorsContainer} from './widgets';

export const JointOperators = (props: { joint: ObjectiveParameterJoint }) => {
	const {joint} = props;

	if (!joint.filters) {
		joint.filters = [];
	}

	const {fire} = useJointEventBus();

	const onAddExpressionClicked = () => {
		const expression = createFactorEqualsConstantParameter();
		joint.filters.push(expression);
		fire(JointEventTypes.SUB_EXPRESSION_ADDED, expression, joint);
	};
	const onAddSubJointClicked = () => {
		const subJoint = createJointParameter(joint.conj === ObjectiveParameterJointType.AND ? ObjectiveParameterJointType.OR : ObjectiveParameterJointType.AND);
		joint.filters.push(subJoint);
		fire(JointEventTypes.SUB_JOINT_ADDED, subJoint, joint);
	};

	return <JointOperatorsContainer>
		<JointOperator onClick={onAddExpressionClicked}>
			<FontAwesomeIcon icon={ICON_ADD}/>
			<span>{Lang.INDICATOR.OBJECTIVE.ADD_SUB_EXPRESSION}</span>
		</JointOperator>
		<JointOperator onClick={onAddSubJointClicked}>
			<FontAwesomeIcon icon={ICON_ADD}/>
			<span>{Lang.INDICATOR.OBJECTIVE.ADD_SUB_JOINT}</span>
		</JointOperator>
	</JointOperatorsContainer>;
};