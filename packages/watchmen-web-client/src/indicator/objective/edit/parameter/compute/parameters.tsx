import {ComputedObjectiveParameter, Objective} from '@/services/data/tuples/objective-types';
import React from 'react';
import {v4} from 'uuid';
import {ParameterEventBusProvider} from '../parameter-event-bus';
import {SubParameterEditor} from '../sub-param';
import {SubParameterAdd} from '../sub-param/sub-parameter-add';
import {HierarchicalEventBridge} from './hierarchical-event-bridge';
import {useSubParameterChanged} from './use-computed-parameter';
import {ParametersContainer} from './widgets';

export const Parameters = (props: {
	objective: Objective;
	parameter: ComputedObjectiveParameter;
	notifyChangeToParent: () => void;
}) => {
	const {objective, parameter, notifyChangeToParent} = props;

	const {onDeleted, onAdded} = useSubParameterChanged(parameter);

	return <ParametersContainer>
		{parameter.parameters.map(param => {
			return <ParameterEventBusProvider key={v4()}>
				<HierarchicalEventBridge notifyChangeToParent={notifyChangeToParent}/>
				<SubParameterEditor objective={objective} parameter={param} parent={parameter}
				                    onDeleted={onDeleted(param)}/>
			</ParameterEventBusProvider>;
		})}
		<SubParameterAdd parent={parameter} onAdded={onAdded()}/>
	</ParametersContainer>;
};
