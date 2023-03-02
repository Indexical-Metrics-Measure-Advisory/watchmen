import {Objective, ObjectiveVariable} from '@/services/data/tuples/objective-types';
import {isBucketVariable, isRangeVariable, isValueVariable} from '@/services/data/tuples/objective-utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {BucketVariableEditor} from './bucket-variable-editor';
import {RangeVariableEditor} from './range-variable-editor';
import {ValueVariableEditor} from './value-variable-editor';
import {VariableName} from './widgets';

export const Variable = (props: {
	objective: Objective; variable: ObjectiveVariable; index: number;
}) => {
	const {objective, variable} = props;

	return <>
		<VariableName>{variable.name || Lang.CONSOLE.DERIVED_OBJECTIVE.UNKNOWN_VARIABLE_NAME}:</VariableName>
		{isValueVariable(variable) ? <ValueVariableEditor objective={objective} variable={variable}/> : null}
		{isRangeVariable(variable) ? <RangeVariableEditor objective={objective} variable={variable}/> : null}
		{isBucketVariable(variable) ? <BucketVariableEditor objective={objective} variable={variable}/> : null}
	</>;
};
