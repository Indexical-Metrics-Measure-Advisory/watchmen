import {IncorrectOptionLabel} from '@/admin/pipelines/pipeline/body/action/write-to-external/widgets';
import {
	Objective,
	ObjectiveFactor,
	ObjectiveParameter,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {isBlank} from '@/services/utils';
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
		return {
			value: factor.uuid, label: factor.name || (() => {
				return {
					node: <>{Lang.INDICATOR.OBJECTIVE.NONAME_FACTOR}</>,
					label: ''
				};
			})
		};
	});

	// eslint-disable-next-line
	const factorValid = isBlank(uuid) || factors.find(f => f.uuid == uuid) != null;
	if (!factorValid) {
		factorOptions.push({
			value: '', label: () => {
				return {
					node: <IncorrectOptionLabel>{Lang.INDICATOR.OBJECTIVE.INCORRECT_FACTOR}</IncorrectOptionLabel>,
					label: ''
				};
			}
		});
	}
	if (factorOptions.length === 0) {
		factorOptions.push({
			value: '', label: () => {
				return {node: <>{Lang.INDICATOR.OBJECTIVE.NO_AVAILABLE_FACTOR}</>, label: ''};
			}
		});
	}

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
