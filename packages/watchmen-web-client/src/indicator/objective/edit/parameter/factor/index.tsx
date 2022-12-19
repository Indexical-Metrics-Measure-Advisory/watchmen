import {useParameterFromChanged} from '@/indicator/objective/edit/parameter/use-parameter-from-changed';
import {Objective, ObjectiveParameter, ReferObjectiveParameter} from '@/services/data/tuples/objective-types';
import {DropdownOption} from '@/widgets/basic/types';
import React from 'react';
import {isReferParameter} from '../utils';
import {useFactor} from './use-factor';
import {FactorDropdown, FactorEditContainer} from './widgets';

const RealFactorEditor = (props: { objective: Objective; parameter: ReferObjectiveParameter }) => {
	const {parameter} = props;

	const {onFactorChange, uuid} = useFactor(parameter);

	const factorOptions: Array<DropdownOption> = [];

	const factorValid = true;

	return <FactorEditContainer>
		<FactorDropdown value={uuid || ''} options={factorOptions} onChange={onFactorChange}
		                please="Indicator?" valid={factorValid}/>
	</FactorEditContainer>;
};

export const FactorEditor = (props: { objective: Objective; parameter: ObjectiveParameter; }) => {
	const {objective, parameter} = props;

	useParameterFromChanged();

	if (!isReferParameter(parameter)) {
		return null;
	}

	return <RealFactorEditor objective={objective} parameter={parameter}/>;
};
