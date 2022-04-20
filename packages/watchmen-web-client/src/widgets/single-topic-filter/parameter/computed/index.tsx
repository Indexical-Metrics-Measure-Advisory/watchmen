import {Parameter} from '@/services/data/tuples/factor-calculator-types';
import {isComputedParameter} from '@/services/data/tuples/parameter-utils';
import {Topic} from '@/services/data/tuples/topic-types';
import React from 'react';
import styled from 'styled-components';
import {
	useComputedParameterFromChanged,
	useDelegateComputedParameterChildChangedToMe
} from '../../../parameter/computed/use-computed-parameter';
import {ParameterComputeTypeEdit} from '../compute-type';
import {SubParameters} from './sub-parameters';
import {ComputedEditContainer} from './widgets';

const ComputedEdit = (props: {
	topic: Topic;
	parameter: Parameter
}) => {
	const {topic, parameter, ...rest} = props;

	useComputedParameterFromChanged();
	const notifyChangeToParent = useDelegateComputedParameterChildChangedToMe(parameter);

	if (!isComputedParameter(parameter)) {
		return null;
	}

	return <ComputedEditContainer {...rest}>
		<ParameterComputeTypeEdit parameter={parameter}/>
		<SubParameters parameter={parameter} topic={topic} notifyChangeToParent={notifyChangeToParent}/>
	</ComputedEditContainer>;
};

export const ComputedEditor = styled(ComputedEdit)`
	grid-column : span 4;
`;