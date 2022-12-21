// noinspection DuplicatedCode

import {ObjectiveParameterJoint, ObjectiveParameterJointType} from '@/services/data/tuples/objective-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useState} from 'react';
import {useJointEventBus} from '../event-bus/joint-event-bus';
import {JointEventTypes} from '../event-bus/joint-event-bus-types';
import {JointTypeButton, JointTypeContainer, JointTypeOption} from './widgets';

const OptionsLabel: Record<ObjectiveParameterJointType, string> = {
	[ObjectiveParameterJointType.AND]: 'And',
	[ObjectiveParameterJointType.OR]: 'Or'
};

const defendJoint = (joint: ObjectiveParameterJoint) => {
	if (!joint.conj) {
		joint.conj = ObjectiveParameterJointType.AND;
	}
	if (!joint.filters) {
		joint.filters = [];
	}
};

export const JointType = (props: { joint: ObjectiveParameterJoint }) => {
	const {joint} = props;

	const [expanded, setExpanded] = useState(false);

	defendJoint(joint);
	const {conj: conjunction} = joint;

	const {fire} = useJointEventBus();
	const onExpandedClicked = () => setExpanded(true);
	const onBlur = () => setExpanded(false);
	const onJointTypeClicked = (newConj: ObjectiveParameterJointType) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (newConj === conjunction) {
			if (!expanded) {
				setExpanded(true);
			}
		} else {
			joint.conj = newConj;
			fire(JointEventTypes.JOINT_TYPE_CHANGED, joint);
			setExpanded(false);
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setExpanded(!expanded);
	};
	const candidates = [ObjectiveParameterJointType.AND, ObjectiveParameterJointType.OR];

	return <JointTypeContainer tabIndex={0} onClick={onExpandedClicked} onBlur={onBlur}>
		<JointTypeOption active={true} expanded={expanded}
		                 onClick={onJointTypeClicked(conjunction)}>
			{OptionsLabel[conjunction]}
		</JointTypeOption>
		{candidates.map(candidate => {
			return <JointTypeOption active={false} expanded={expanded}
			                        onClick={onJointTypeClicked(candidate)}
			                        key={candidate}>
				{OptionsLabel[candidate]}
			</JointTypeOption>;
		})}
		<JointTypeButton data-expanded={expanded} onClick={onIconClicked}>
			<FontAwesomeIcon icon={expanded ? ICON_COLLAPSE_CONTENT : ICON_EDIT}/>
		</JointTypeButton>
	</JointTypeContainer>;
};