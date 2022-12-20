import {ConditionalObjectiveParameter, Objective, ObjectiveFactor} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {useEffect} from 'react';
import {useConditionalEventBus} from '../conditional-event-bus';
import {ConditionalEventTypes} from '../conditional-event-bus-types';
import {JointBody} from '../joint-body';
import {JointElements} from '../joint-elements';
import {JointOperators} from '../joint-operators';

export const TopJoint = (props: {
	objective: Objective; conditional: ConditionalObjectiveParameter; factors: Array<ObjectiveFactor>;
}) => {
	// noinspection DuplicatedCode
	const {objective, conditional, factors} = props;

	const {on, off} = useConditionalEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ConditionalEventTypes.TOP_TYPE_CHANGED, forceUpdate);
		return () => {
			off(ConditionalEventTypes.TOP_TYPE_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	if (!conditional.on) {
		return null;
	}

	return <JointBody>
		<JointElements objective={objective} joint={conditional.on} factors={factors}/>
		<JointOperators joint={conditional.on}/>
	</JointBody>;
};