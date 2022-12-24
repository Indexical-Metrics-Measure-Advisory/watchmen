// noinspection DuplicatedCode

import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	ConstantObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameterExpression,
	ObjectiveParameterExpressionOperator,
	ObjectiveParameterType,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {ParameterEventBusProvider} from '../../parameter/parameter-event-bus';
import {useExpressionEventBus} from '../event-bus/expression-event-bus';
import {ExpressionEventTypes} from '../event-bus/expression-event-bus-types';
import {RemoveMeButton} from '../widgets';
import {ExpressionSide} from './expression-side';
import {ExpressionOperator} from './operator';
import {Parameter2ExpressionBridge} from './parameter-2-expression-bridge';
import {RightPart} from './right';
import {ExpressionContainer, ExpressionHeader, ExpressionLeadLabel} from './widgets';

const defendExpression = (expression: ObjectiveParameterExpression) => {
	if (!expression.left) {
		expression.left = {kind: ObjectiveParameterType.REFER, uuid: ''} as ReferObjectiveParameter;
	}
	if (!expression.operator) {
		expression.operator = ObjectiveParameterExpressionOperator.EQUALS;
	}
	if (!expression.right) {
		expression.right = {kind: ObjectiveParameterType.CONSTANT, value: ''} as ConstantObjectiveParameter;
	}
};

export const Expression = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	expression: ObjectiveParameterExpression; removeMe: () => void;
}) => {
	const {objective, factor, indicator, expression, removeMe} = props;

	const {fire} = useExpressionEventBus();

	defendExpression(expression);
	const onLeftParameterChanged = () => {
		fire(ExpressionEventTypes.LEFT_CHANGED, expression);
	};

	return <ExpressionContainer>
		<ExpressionHeader>
			<ExpressionLeadLabel>{Lang.INDICATOR.OBJECTIVE.EXPRESSION}</ExpressionLeadLabel>
			<RemoveMeButton onClick={removeMe}>
				<FontAwesomeIcon icon={ICON_DELETE}/>
			</RemoveMeButton>
		</ExpressionHeader>
		<ParameterEventBusProvider>
			<Parameter2ExpressionBridge onChange={onLeftParameterChanged}/>
			<ExpressionSide objective={objective} factor={factor} indicator={indicator}
			                expression={expression} parameter={expression.left} leftSide={true}/>
		</ParameterEventBusProvider>
		<ExpressionOperator expression={expression}/>
		<RightPart objective={objective} factor={factor} indicator={indicator} expression={expression}/>
	</ExpressionContainer>;
};