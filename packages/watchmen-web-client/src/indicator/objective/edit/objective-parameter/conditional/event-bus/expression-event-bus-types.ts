import {ObjectiveParameterExpression} from '@/services/data/tuples/objective-types';

export enum ExpressionEventTypes {
	LEFT_CHANGED = 'left-changed',
	OPERATOR_CHANGED = 'operator-changed',
	RIGHT_CHANGED = 'right-changed'
}

export interface ExpressionEventBus {
	fire(type: ExpressionEventTypes.LEFT_CHANGED, expression: ObjectiveParameterExpression): this;
	on(type: ExpressionEventTypes.LEFT_CHANGED, listener: (expression: ObjectiveParameterExpression) => void): this;
	off(type: ExpressionEventTypes.LEFT_CHANGED, listener: (expression: ObjectiveParameterExpression) => void): this;

	fire(type: ExpressionEventTypes.OPERATOR_CHANGED, expression: ObjectiveParameterExpression): this;
	on(type: ExpressionEventTypes.OPERATOR_CHANGED, listener: (expression: ObjectiveParameterExpression) => void): this;
	off(type: ExpressionEventTypes.OPERATOR_CHANGED, listener: (expression: ObjectiveParameterExpression) => void): this;

	fire(type: ExpressionEventTypes.RIGHT_CHANGED, expression: ObjectiveParameterExpression): this;
	on(type: ExpressionEventTypes.RIGHT_CHANGED, listener: (expression: ObjectiveParameterExpression) => void): this;
	off(type: ExpressionEventTypes.RIGHT_CHANGED, listener: (expression: ObjectiveParameterExpression) => void): this;
}