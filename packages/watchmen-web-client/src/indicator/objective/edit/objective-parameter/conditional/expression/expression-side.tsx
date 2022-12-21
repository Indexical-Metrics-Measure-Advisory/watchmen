import {
	Objective,
	ObjectiveFactor,
	ObjectiveParameter,
	ObjectiveParameterExpression
} from '@/services/data/tuples/objective-types';
import React from 'react';
import {ComputedEditor} from '../../compute';
import {ConstantEditor} from '../../constant';
import {FactorEditor} from '../../factor';
import {ParameterFromEditor} from '../../param-from';
import {ExpressionSideContainer} from './widgets';

export const ExpressionSide = (props: {
	objective: Objective;
	expression: ObjectiveParameterExpression; parameter: ObjectiveParameter; leftSide: boolean;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, parameter, factors} = props;

	return <ExpressionSideContainer>
		<ParameterFromEditor parameter={parameter}/>
		<FactorEditor objective={objective} parameter={parameter} factors={factors}/>
		<ConstantEditor objective={objective} parameter={parameter}/>
		<ComputedEditor objective={objective} parameter={parameter} factors={factors}/>
	</ExpressionSideContainer>;
};