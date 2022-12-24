import {
	ObjectiveParameterExpression,
	ObjectiveParameterExpressionOperator
} from '@/services/data/tuples/objective-types';
import {ICON_EDIT} from '@/widgets/basic/constants';
import {useCollapseFixedThing} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useRef, useState} from 'react';
import {useExpressionEventBus} from '../../event-bus/expression-event-bus';
import {ExpressionEventTypes} from '../../event-bus/expression-event-bus-types';
import {
	EXPRESSION_OPERATOR_DROPDOWN_HEIGHT,
	ExpressionOperatorContainer,
	ExpressionOperatorDropdown,
	ExpressionOperatorIcon,
	ExpressionOperatorLabel,
	ExpressionOperatorOption
} from './widgets';

const AvailableOperators = [
	ObjectiveParameterExpressionOperator.EMPTY,
	ObjectiveParameterExpressionOperator.NOT_EMPTY,
	ObjectiveParameterExpressionOperator.EQUALS,
	ObjectiveParameterExpressionOperator.NOT_EQUALS,
	ObjectiveParameterExpressionOperator.LESS,
	ObjectiveParameterExpressionOperator.LESS_EQUALS,
	ObjectiveParameterExpressionOperator.MORE,
	ObjectiveParameterExpressionOperator.MORE_EQUALS
];

interface DropdownState {
	visible: boolean;
	top?: number;
	bottom?: number;
	left: number;
}

export const ExpressionOperator = (props: { expression: ObjectiveParameterExpression }) => {
	const {expression} = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const {fire} = useExpressionEventBus();
	const [state, setState] = useState<DropdownState>({visible: false, top: 0, left: 0});
	useCollapseFixedThing({
		containerRef,
		visible: state.visible,
		hide: () => setState({visible: false, top: 0, left: 0})
	});

	const onStartClicked = () => {
		if (!containerRef.current) {
			return;
		}

		const {top, left, height} = containerRef.current.getBoundingClientRect();
		if (top + height + 4 + EXPRESSION_OPERATOR_DROPDOWN_HEIGHT > window.innerHeight) {
			// at top
			setState({visible: true, bottom: window.innerHeight - top + 4, left});
		} else {
			setState({visible: true, top: top + height + 4, left});
		}
	};
	const onOperatorClick = (operator: ObjectiveParameterExpressionOperator) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();

		if (expression.operator === operator) {
			return;
		} else {
			expression.operator = operator;
			fire(ExpressionEventTypes.OPERATOR_CHANGED, expression);
			setState({visible: false, top: 0, left: 0});
		}
	};

	const FilterExpressionOperatorLabels: Record<ObjectiveParameterExpressionOperator, string> = {
		[ObjectiveParameterExpressionOperator.EMPTY]: Lang.PARAMETER.EXPRESSION_OPERATOR.EMPTY,
		[ObjectiveParameterExpressionOperator.NOT_EMPTY]: Lang.PARAMETER.EXPRESSION_OPERATOR.NOT_EMPTY,
		[ObjectiveParameterExpressionOperator.EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.EQUALS,
		[ObjectiveParameterExpressionOperator.NOT_EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.NOT_EQUALS,
		[ObjectiveParameterExpressionOperator.LESS]: Lang.PARAMETER.EXPRESSION_OPERATOR.LESS,
		[ObjectiveParameterExpressionOperator.LESS_EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.LESS_EQUALS,
		[ObjectiveParameterExpressionOperator.MORE]: Lang.PARAMETER.EXPRESSION_OPERATOR.MORE,
		[ObjectiveParameterExpressionOperator.MORE_EQUALS]: Lang.PARAMETER.EXPRESSION_OPERATOR.MORE_EQUALS,
		[ObjectiveParameterExpressionOperator.IN]: Lang.PARAMETER.EXPRESSION_OPERATOR.IN,
		[ObjectiveParameterExpressionOperator.NOT_IN]: Lang.PARAMETER.EXPRESSION_OPERATOR.NOT_IN
	};

	return <ExpressionOperatorContainer onClick={onStartClicked} ref={containerRef}>
		<ExpressionOperatorLabel>{FilterExpressionOperatorLabels[expression.operator]}</ExpressionOperatorLabel>
		<ExpressionOperatorIcon>
			<FontAwesomeIcon icon={ICON_EDIT}/>
		</ExpressionOperatorIcon>
		<ExpressionOperatorDropdown {...state}>
			{AvailableOperators.map(operator => {
				return <ExpressionOperatorOption selected={operator === expression.operator}
				                                 onClick={onOperatorClick(operator)}
				                                 key={operator}>
					{FilterExpressionOperatorLabels[operator]}
				</ExpressionOperatorOption>;
			})}
		</ExpressionOperatorDropdown>
	</ExpressionOperatorContainer>;
};