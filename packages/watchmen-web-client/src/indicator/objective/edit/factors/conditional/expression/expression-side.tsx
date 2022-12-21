import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameter,
	ObjectiveParameterExpression
} from '@/services/data/tuples/objective-types';
import React from 'react';
import {ComputedEditor} from '../../parameter/compute';
import {ConstantEditor} from '../../parameter/constant';
import {FactorEditor} from '../../parameter/factor';
import {ParameterFromEditor} from '../../parameter/param-from';
import {ExpressionSideContainer} from './widgets';

export const ExpressionSide = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	expression: ObjectiveParameterExpression; parameter: ObjectiveParameter; leftSide: boolean;
}) => {
	const {objective, factor, indicator, parameter} = props;

	return <ExpressionSideContainer>
		<ParameterFromEditor parameter={parameter}/>
		<FactorEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
		<ConstantEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
		<ComputedEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
	</ExpressionSideContainer>;
};