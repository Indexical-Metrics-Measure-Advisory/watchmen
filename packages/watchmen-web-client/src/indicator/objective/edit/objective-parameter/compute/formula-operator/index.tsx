import {ComputedObjectiveParameter, Objective, ObjectiveFormulaOperator} from '@/services/data/tuples/objective-types';
import {ICON_EDIT} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent} from 'react';
import {useParameterEventBus} from '../../parameter-event-bus';
import {ParameterEventTypes} from '../../parameter-event-bus-types';
import {useFormulaOperator} from './use-formula-operator';
import {
	FormulaOperatorContainer,
	FormulaOperatorDropdown,
	FormulaOperatorIcon,
	FormulaOperatorLabel,
	FormulaOperatorOption
} from './widgets';

const AvailableOperators = [
	ObjectiveFormulaOperator.NONE,
	ObjectiveFormulaOperator.ADD, ObjectiveFormulaOperator.SUBTRACT,
	ObjectiveFormulaOperator.MULTIPLY, ObjectiveFormulaOperator.DIVIDE,
	ObjectiveFormulaOperator.ROUND, ObjectiveFormulaOperator.FLOOR, ObjectiveFormulaOperator.CEIL,
	ObjectiveFormulaOperator.ABS,
	ObjectiveFormulaOperator.MAX, ObjectiveFormulaOperator.MIN,
	ObjectiveFormulaOperator.INTERPOLATE,
	ObjectiveFormulaOperator.CASE_THEN
];

export const FormulaOperatorEditor = (props: {
	objective: Objective; parameter: ComputedObjectiveParameter; hasAsIs: boolean;
}) => {
	const {parameter, hasAsIs} = props;

	const {fire} = useParameterEventBus();

	const {containerRef, dropdownState, onOperatorClicked, onOperatorSelected} = useFormulaOperator(parameter);
	const onClicked = (operator: ObjectiveFormulaOperator) => (event: MouseEvent<HTMLDivElement>) => {
		onOperatorSelected(operator)(event);
		fire(ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, parameter);
	};

	const ObjectiveFormulaOperatorLabels: Record<ObjectiveFormulaOperator, string> = {
		[ObjectiveFormulaOperator.NONE]: Lang.PARAMETER.COMPUTE_TYPE.NONE,
		[ObjectiveFormulaOperator.ADD]: Lang.PARAMETER.COMPUTE_TYPE.ADD,
		[ObjectiveFormulaOperator.SUBTRACT]: Lang.PARAMETER.COMPUTE_TYPE.SUBTRACT,
		[ObjectiveFormulaOperator.MULTIPLY]: Lang.PARAMETER.COMPUTE_TYPE.MULTIPLY,
		[ObjectiveFormulaOperator.DIVIDE]: Lang.PARAMETER.COMPUTE_TYPE.DIVIDE,
		[ObjectiveFormulaOperator.MODULUS]: Lang.PARAMETER.COMPUTE_TYPE.MODULUS,
		[ObjectiveFormulaOperator.YEAR_OF]: Lang.PARAMETER.COMPUTE_TYPE.YEAR_OF,
		[ObjectiveFormulaOperator.HALF_YEAR_OF]: Lang.PARAMETER.COMPUTE_TYPE.HALF_YEAR_OF,
		[ObjectiveFormulaOperator.QUARTER_OF]: Lang.PARAMETER.COMPUTE_TYPE.QUARTER_OF,
		[ObjectiveFormulaOperator.MONTH_OF]: Lang.PARAMETER.COMPUTE_TYPE.MONTH_OF,
		[ObjectiveFormulaOperator.WEEK_OF_YEAR]: Lang.PARAMETER.COMPUTE_TYPE.WEEK_OF_YEAR,
		[ObjectiveFormulaOperator.WEEK_OF_MONTH]: Lang.PARAMETER.COMPUTE_TYPE.WEEK_OF_MONTH,
		[ObjectiveFormulaOperator.DAY_OF_MONTH]: Lang.PARAMETER.COMPUTE_TYPE.DAY_OF_MONTH,
		[ObjectiveFormulaOperator.DAY_OF_WEEK]: Lang.PARAMETER.COMPUTE_TYPE.DAY_OF_WEEK,
		[ObjectiveFormulaOperator.ROUND]: Lang.PARAMETER.COMPUTE_TYPE.ROUND,
		[ObjectiveFormulaOperator.FLOOR]: Lang.PARAMETER.COMPUTE_TYPE.FLOOR,
		[ObjectiveFormulaOperator.CEIL]: Lang.PARAMETER.COMPUTE_TYPE.CEIL,
		[ObjectiveFormulaOperator.ABS]: Lang.PARAMETER.COMPUTE_TYPE.ABS,
		[ObjectiveFormulaOperator.MAX]: Lang.PARAMETER.COMPUTE_TYPE.MAX,
		[ObjectiveFormulaOperator.MIN]: Lang.PARAMETER.COMPUTE_TYPE.MIN,
		[ObjectiveFormulaOperator.INTERPOLATE]: Lang.PARAMETER.COMPUTE_TYPE.INTERPOLATE,
		[ObjectiveFormulaOperator.CASE_THEN]: Lang.PARAMETER.COMPUTE_TYPE.CASE_THEN
	};
	const availableOperators = AvailableOperators.filter(op => {
		return op === ObjectiveFormulaOperator.NONE ? hasAsIs : true;
	});

	return <FormulaOperatorContainer onClick={onOperatorClicked} ref={containerRef}>
		<FormulaOperatorLabel>{ObjectiveFormulaOperatorLabels[parameter.operator]}</FormulaOperatorLabel>
		<FormulaOperatorIcon>
			<FontAwesomeIcon icon={ICON_EDIT}/>
		</FormulaOperatorIcon>
		<FormulaOperatorDropdown {...dropdownState}>
			{availableOperators.map(operator => {
				return <FormulaOperatorOption selected={operator === parameter.operator}
				                              onClick={onClicked(operator as ObjectiveFormulaOperator)}
				                              key={operator}>
					{ObjectiveFormulaOperatorLabels[operator as ObjectiveFormulaOperator]}
				</FormulaOperatorOption>;
			})}
		</FormulaOperatorDropdown>
	</FormulaOperatorContainer>;
};