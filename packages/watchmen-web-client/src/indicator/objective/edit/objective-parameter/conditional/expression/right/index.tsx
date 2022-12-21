import {Objective, ObjectiveFactor, ObjectiveParameterExpression} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {ParameterEventBusProvider} from '@/widgets/parameter/parameter-event-bus';
import React, {useEffect} from 'react';
import {useExpressionEventBus} from '../../event-bus/expression-event-bus';
import {ExpressionEventTypes} from '../../event-bus/expression-event-bus-types';
import {ExpressionSide} from '../expression-side';
import {Parameter2ExpressionBridge} from '../parameter-2-expression-bridge';

export const RightPart = (props: {
	objective: Objective; expression: ObjectiveParameterExpression;
	factors: Array<ObjectiveFactor>;
}) => {
	// noinspection DuplicatedCode
	const {objective, expression, factors} = props;

	const {on, off, fire} = useExpressionEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ExpressionEventTypes.OPERATOR_CHANGED, forceUpdate);
		return () => {
			off(ExpressionEventTypes.OPERATOR_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	const onRightParameterChanged = () => {
		fire(ExpressionEventTypes.RIGHT_CHANGED, expression);
	};

	return <ParameterEventBusProvider>
		<Parameter2ExpressionBridge onChange={onRightParameterChanged}/>
		<ExpressionSide objective={objective}
		                expression={expression} parameter={expression.right} leftSide={false}
		                factors={factors}/>
	</ParameterEventBusProvider>;
};
