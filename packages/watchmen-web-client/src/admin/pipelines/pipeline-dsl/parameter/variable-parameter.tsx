import {Parameter} from '@/services/data/tuples/factor-calculator-types';
import {isVariableParameter} from '@/services/data/tuples/parameter-utils';
import {Topic} from '@/services/data/tuples/topic-types';
import React from 'react';
import {PropName, PropValue} from '../dsl-widgets';

export const VariableParameterLine = (props: {
	parameter: Parameter;
	topicsMap: Map<string, Topic>;
	inList?: boolean;
	indent: number;
}) => {
	const {parameter, inList = false, indent} = props;

	if (!isVariableParameter(parameter)) {
		return null;
	}

	const variableName = parameter.variableName || '';
	const factorName = parameter.factorName || '';

	const displayValue = factorName
		? `${variableName}.${factorName}`
		: variableName;

	return <>
		{!inList && <PropName indent={indent}>variable-name</PropName>}
		<PropValue>{displayValue}</PropValue>
	</>;
};
