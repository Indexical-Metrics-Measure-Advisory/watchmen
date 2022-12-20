import {
	Objective,
	ObjectiveFactor,
	ObjectiveParameter,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {isReferParameter} from '../utils';
import {useFactor} from './use-factor';
import {FactorDropdown, FactorEditContainer} from './widgets';

const RealFactorEditor = (props: {
	objective: Objective; parameter: ReferObjectiveParameter; factors: Array<ObjectiveFactor>;
}) => {
	const {parameter, factors} = props;

	const {onFactorChange, uuid} = useFactor(parameter);

	const factorOptions: Array<DropdownOption> = factors.map(factor => {
		return {value: factor.uuid, label: factor.name};
	});

	const factorValid = true;

	return <FactorEditContainer>
		<FactorDropdown value={uuid || ''} options={factorOptions} onChange={onFactorChange}
		                please={Lang.INDICATOR.OBJECTIVE.FACTOR_PLACEHOLDER} valid={factorValid}/>
	</FactorEditContainer>;
};

export const FactorEditor = (props: {
	objective: Objective; parameter: ObjectiveParameter; factors: Array<ObjectiveFactor>;
}) => {
	const {objective, parameter, factors} = props;

	useParameterFromChanged();

	if (!isReferParameter(parameter)) {
		return null;
	}

	return <RealFactorEditor objective={objective} parameter={parameter} factors={factors}/>;
};
