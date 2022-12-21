import {ConditionalObjectiveParameter, Objective, ObjectiveFactor} from '@/services/data/tuples/objective-types';
import React from 'react';
import {Conditional2ParentBridge} from './conditional-2-parent-bridge';
import {ConditionalEventBusProvider} from './conditional-event-bus';
import {JointEventBusProvider} from './event-bus/joint-event-bus';
import {TopFold} from './top-fold';
import {TopJoint} from './top-joint';
import {TopJoint2ConditionalBridge} from './top-joint-2-conditional-bridge';
import {TopType} from './top-type';
import {ConditionalContainer, ConditionalHeader} from './widgets';

export const ConditionalEditor = (props: {
	objective: Objective;
	conditional: ConditionalObjectiveParameter; onChange: () => void;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, conditional, onChange, factors} = props;

	return <ConditionalEventBusProvider>
		<Conditional2ParentBridge onChange={onChange}/>
		<JointEventBusProvider>
			<TopJoint2ConditionalBridge conditional={conditional}/>
			<ConditionalContainer>
				<ConditionalHeader>
					<TopType conditional={conditional}/>
					<TopFold conditional={conditional}/>
				</ConditionalHeader>
				<TopJoint objective={objective} conditional={conditional} factors={factors}/>
			</ConditionalContainer>
		</JointEventBusProvider>
	</ConditionalEventBusProvider>;
};