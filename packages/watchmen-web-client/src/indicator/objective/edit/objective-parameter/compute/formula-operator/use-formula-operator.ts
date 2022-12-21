import {ComputedObjectiveParameter, ObjectiveFormulaOperator} from '@/services/data/tuples/objective-types';
import {useCollapseFixedThing} from '@/widgets/basic/utils';
import {MouseEvent, useRef, useState} from 'react';
import {defendFormulaParameter} from '../../utils';
import {FORMULA_OPERATOR_DROPDOWN_HEIGHT} from './widgets';

export interface FormulaOperatorDropdownState {
	visible: boolean;
	top?: number;
	bottom?: number;
	left: number;
}

export const useFormulaOperator = (parameter: ComputedObjectiveParameter) => {
	// noinspection TypeScriptValidateTypes
	const containerRef = useRef<HTMLDivElement>(null);
	const [dropdownState, setDropdownState] = useState<FormulaOperatorDropdownState>({visible: false, top: 0, left: 0});
	useCollapseFixedThing({
		containerRef,
		visible: dropdownState.visible,
		hide: () => setDropdownState({visible: false, top: 0, left: 0})
	});

	const onOperatorClicked = () => {
		if (!containerRef.current) {
			return;
		}

		const {top, left, height} = containerRef.current.getBoundingClientRect();
		if (top + height + 4 + FORMULA_OPERATOR_DROPDOWN_HEIGHT > window.innerHeight) {
			// at top
			setDropdownState({visible: true, bottom: window.innerHeight - top + 4, left});
		} else {
			setDropdownState({visible: true, top: top + height + 4, left});
		}
	};
	const onOperatorSelected = (operator: ObjectiveFormulaOperator) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();

		if (parameter.operator === operator) {
			return;
		} else {
			parameter.operator = operator;
			defendFormulaParameter(parameter);
			setDropdownState({visible: false, top: 0, left: 0});
		}
	};

	return {containerRef, dropdownState, onOperatorClicked, onOperatorSelected};
};