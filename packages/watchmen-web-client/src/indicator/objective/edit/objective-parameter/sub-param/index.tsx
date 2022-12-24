import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactor,
	ObjectiveParameter,
	ObjectiveParameterType
} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {useEffect} from 'react';
import {ParameterFromEditor} from '../param-from';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';
import {SubParameterCondition} from './sub-parameter-condition';
import {SubParameterEditBody} from './sub-parameter-edit-body';
import {SubParameterEditContainer} from './widgets';

export const SubParameterEditor = (props: {
	objective: Objective;
	parent: ComputedObjectiveParameter; parameter: ObjectiveParameter; onDeleted: () => void;
	fixFrom?: boolean; fromLabel?: string;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, parameter, parent, onDeleted, fixFrom = false, fromLabel, factors} = props;

	const {on, off} = useParameterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		return () => {
			off(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	return <SubParameterEditContainer shorten={parameter.kind === ObjectiveParameterType.COMPUTED}>
		<SubParameterCondition objective={objective} parent={parent} parameter={parameter} factors={factors}/>
		<ParameterFromEditor parameter={parameter} fix={fixFrom} label={fromLabel}/>
		<SubParameterEditBody objective={objective}
		                      parent={parent} parameter={parameter} onDeleted={onDeleted}
		                      factors={factors}/>
	</SubParameterEditContainer>;
};