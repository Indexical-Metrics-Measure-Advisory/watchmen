import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator,
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
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parent: ComputedObjectiveParameter; parameter: ObjectiveParameter; onDeleted: () => void;
}) => {
	const {objective, factor, indicator, parameter, parent, onDeleted} = props;

	const {on, off} = useParameterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		return () => {
			off(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	return <SubParameterEditContainer shorten={parameter.kind === ObjectiveParameterType.COMPUTED}>
		<SubParameterCondition objective={objective} factor={factor} indicator={indicator}
		                       parent={parent} parameter={parameter}/>
		<ParameterFromEditor parameter={parameter}/>
		<SubParameterEditBody objective={objective} factor={factor} indicator={indicator}
		                      parent={parent} parameter={parameter} onDeleted={onDeleted}/>
	</SubParameterEditContainer>;
};