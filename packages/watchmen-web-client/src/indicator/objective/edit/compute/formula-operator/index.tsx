import {ComputedObjectiveParameter, Objective, ObjectiveFormulaOperator} from '@/services/data/tuples/objective-types';
import {ICON_EDIT} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent} from 'react';
import {useSave} from '../../use-save';
import {useFormulaOperator} from './use-formula-operator';
import {
	FormulaOperatorContainer,
	FormulaOperatorDropdown,
	FormulaOperatorIcon,
	FormulaOperatorLabel,
	FormulaOperatorOption
} from './widgets';

export const FormulaOperatorEditor = (props: { objective: Objective; parameter: ComputedObjectiveParameter }) => {
	const {objective, parameter} = props;

	const save = useSave();

	const {
		containerRef, dropdownState, onOperatorClicked, onOperatorSelected
	} = useFormulaOperator(parameter);
	const onClicked = (operator: ObjectiveFormulaOperator) => (event: MouseEvent<HTMLDivElement>) => {
		onOperatorSelected(operator)(event);
		save(objective);
	};

	const ObjectiveFormulaOperatorLabels: Record<ObjectiveFormulaOperator, string> = {
		[ObjectiveFormulaOperator.NONE]: '',
		[ObjectiveFormulaOperator.ADD]: Lang.PARAMETER.COMPUTE_TYPE.ADD,
		[ObjectiveFormulaOperator.SUBTRACT]: Lang.PARAMETER.COMPUTE_TYPE.SUBTRACT,
		[ObjectiveFormulaOperator.MULTIPLY]: Lang.PARAMETER.COMPUTE_TYPE.MULTIPLY,
		[ObjectiveFormulaOperator.DIVIDE]: Lang.PARAMETER.COMPUTE_TYPE.DIVIDE,
		[ObjectiveFormulaOperator.ROUND]: Lang.PARAMETER.COMPUTE_TYPE.ROUND,
		[ObjectiveFormulaOperator.FLOOR]: Lang.PARAMETER.COMPUTE_TYPE.FLOOR,
		[ObjectiveFormulaOperator.CEIL]: Lang.PARAMETER.COMPUTE_TYPE.CEIL,
		[ObjectiveFormulaOperator.ABS]: Lang.PARAMETER.COMPUTE_TYPE.ABS,
		[ObjectiveFormulaOperator.MAX]: Lang.PARAMETER.COMPUTE_TYPE.MAX,
		[ObjectiveFormulaOperator.MIN]: Lang.PARAMETER.COMPUTE_TYPE.MIN,
		[ObjectiveFormulaOperator.INTERPOLATE]: Lang.PARAMETER.COMPUTE_TYPE.INTERPOLATE,
		[ObjectiveFormulaOperator.CASE_THEN]: Lang.PARAMETER.COMPUTE_TYPE.CASE_THEN
	};
	const availableOperators = Object.values(ObjectiveFormulaOperator).filter(op => op != ObjectiveFormulaOperator.NONE);

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