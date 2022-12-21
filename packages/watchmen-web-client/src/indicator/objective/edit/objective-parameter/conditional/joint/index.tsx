import {Objective, ObjectiveFactor, ObjectiveParameterJoint} from '@/services/data/tuples/objective-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {JointBody} from '../joint-body';
import {JointElements} from '../joint-elements';
import {JointFold} from '../joint-fold';
import {JointOperators} from '../joint-operators';
import {JointType} from '../joint-type';
import {RemoveMeButton} from '../widgets';
import {JointContainer, JointHeader} from './widgets';

export const Joint = (props: {
	objective: Objective; joint: ObjectiveParameterJoint; removeMe: () => void;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, joint, removeMe, factors} = props;

	return <JointContainer>
		<JointHeader>
			<JointType joint={joint}/>
			<JointFold/>
			<RemoveMeButton onClick={removeMe}>
				<FontAwesomeIcon icon={ICON_DELETE}/>
			</RemoveMeButton>
		</JointHeader>
		<JointBody>
			<JointElements objective={objective} joint={joint} factors={factors}/>
			<JointOperators joint={joint}/>
		</JointBody>
	</JointContainer>;
};