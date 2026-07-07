import {AnyFactorType, DeclaredVariables, Parameter, ValueTypes, VariableParameter} from '@/services/data/tuples/factor-calculator-types';
import {computeParameterTypes} from '@/services/data/tuples/factor-calculator-utils';
import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {isVariableParameter} from '@/services/data/tuples/parameter-utils';
import {Topic} from '@/services/data/tuples/topic-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useParameterEventBus} from '@/widgets/parameter/parameter-event-bus';
import {ParameterEventTypes} from '@/widgets/parameter/parameter-event-bus-types';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useVariablesEventBus} from '../../variables/variables-event-bus';
import {VariablesEventTypes} from '../../variables/variables-event-bus-types';
import {FactorDropdown, VariableDropdown, VariableEditContainer} from './widgets';

const RealVariableEditor = (props: {
	parameter: VariableParameter;
	topics: Array<Topic>;
	expectedTypes: ValueTypes;
}) => {
	const {parameter, topics, expectedTypes} = props;

	const forceUpdate = useForceUpdate();
	const {on: onVariables, off: offVariables, fire: fireVariables} = useVariablesEventBus();
	const [declaredVariables, setDeclaredVariables] = useState<DeclaredVariables>([]);
	const [selectedVariableTopic, setSelectedVariableTopic] = useState<Topic | undefined>(undefined);
	const [valid, setValid] = useState<boolean>(true);

	const refreshVariables = useCallback(() => {
		fireVariables(VariablesEventTypes.ASK_VARIABLES, (variables: DeclaredVariables) => {
			setDeclaredVariables(variables);
			const currentVar = variables.find(v => v.name === parameter.variableName);
			const objectType = currentVar?.types.find(t => t.type === FactorType.OBJECT && t.topic && !t.array);
			setSelectedVariableTopic(objectType?.topic);
			computeValid(variables);
			forceUpdate();
		});
	}, [fireVariables, parameter.variableName, expectedTypes]);

	// ask variables from VariablesHelper
	useEffect(() => {
		refreshVariables();
	}, [refreshVariables]);

	// re-compute validity when upstream variables changed
	useEffect(() => {
		const onVariableChanged = () => refreshVariables();
		onVariables(VariablesEventTypes.VARIABLE_CHANGED, onVariableChanged);
		return () => {
			offVariables(VariablesEventTypes.VARIABLE_CHANGED, onVariableChanged);
		};
	}, [onVariables, offVariables, refreshVariables]);

	const computeValid = (vars: DeclaredVariables) => {
		if (!parameter.variableName) {
			setValid(false);
			return;
		}
		const found = vars.find(v => v.name === parameter.variableName);
		if (!found) {
			setValid(false);
			return;
		}
		const types = computeParameterTypes(parameter, topics, vars);
		const isValid = expectedTypes.some(t => t === AnyFactorType.ANY)
			|| types.some(t => t.type !== AnyFactorType.ERROR && expectedTypes.some(e => e === t.type || e === AnyFactorType.ANY));
		isValid ? setValid(true) : setValid(false);
	};

	const onVariableChange = ({value}: DropdownOption) => {
		const selected = value as string;
		if (parameter.variableName === selected) {
			return;
		}
		parameter.variableName = selected;
		parameter.factorName = '';
		const newVar = declaredVariables.find(v => v.name === selected);
		const objectType = newVar?.types.find(t => t.type === FactorType.OBJECT && t.topic && !t.array);
		setSelectedVariableTopic(objectType?.topic);
		computeValid(declaredVariables);
		forceUpdate();
	};

	const onFactorChange = ({value}: DropdownOption) => {
		const factor = value as Factor;
		parameter.factorName = factor.name;
		computeValid(declaredVariables);
		forceUpdate();
	};

	const selectedFactor = selectedVariableTopic
		? (selectedVariableTopic.factors || []).find((f: Factor) => f.name === parameter.factorName)
		: undefined;

	const variableOptions = declaredVariables.map(v => ({
		value: v.name,
		label: v.name,
		key: v.name
	}));

	const currentVar = declaredVariables.find(v => v.name === parameter.variableName);
	const hasFactorDropdown = currentVar?.types.some(t => t.type === FactorType.OBJECT && t.topic && !t.array) ?? false;

	const factorOptions = useMemo(() => {
		if (!selectedVariableTopic) {
			return [];
		}
		return (selectedVariableTopic.factors || [])
			.map((f: Factor) => ({
				value: f,
				label: f.label || f.name,
				key: f.factorId
			}));
	}, [selectedVariableTopic]);

	const variableValid = parameter.variableName.length > 0
		&& declaredVariables.some(v => v.name === parameter.variableName);
	const factorValid = hasFactorDropdown
		? (selectedFactor != null)
		: true;

	return <VariableEditContainer>
		<VariableDropdown value={parameter.variableName || null} options={variableOptions}
		                  onChange={onVariableChange}
		                  please="Variable?"
		                  valid={variableValid && valid}/>
		{hasFactorDropdown && (
			<FactorDropdown value={selectedFactor || null} options={factorOptions}
			                onChange={onFactorChange}
			                please="Factor?"
			                valid={factorValid && valid}/>
		)}
	</VariableEditContainer>;
};

export const VariableEditor = (props: {
	parameter: Parameter;
	topics: Array<Topic>;
	expectedTypes: ValueTypes;
}) => {
	const {parameter, topics, expectedTypes} = props;

	const {on, off} = useParameterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		return () => {
			off(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	if (!isVariableParameter(parameter)) {
		return null;
	}

	return <RealVariableEditor parameter={parameter} topics={topics} expectedTypes={expectedTypes}/>;
};
