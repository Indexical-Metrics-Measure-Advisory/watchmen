import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameter,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {isReferParameter} from '../../../param-utils';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {useFactor} from './use-factor';
import {FactorDropdown, FactorEditContainer} from './widgets';

const RealFactorEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parameter: ReferObjectiveParameter;
}) => {
	const {parameter} = props;

	// const {on, off} = useObjectivesEventBus();
	const {onFactorChange, uuid} = useFactor(parameter);
	// const forceUpdate = useForceUpdate();

	// noinspection JSMismatchedCollectionQueryUpdate
	const factorOptions: Array<DropdownOption> = [];
	const factorValid = true;

	// const factorOptions: Array<DropdownOption> = factors.map(factor => {
	// 	return {
	// 		value: factor.uuid, label: factor.name || (() => {
	// 			return {
	// 				node: <>{Lang.INDICATOR.OBJECTIVE.NONAME_FACTOR}</>,
	// 				label: ''
	// 			};
	// 		})
	// 	};
	// });

	// eslint-disable-next-line
	// const factorValid = isBlank(uuid) || factors.find(f => f.uuid == uuid) != null;
	// if (!factorValid) {
	// 	factorOptions.push({
	// 		value: '', label: () => {
	// 			return {
	// 				node: <IncorrectOptionLabel>{Lang.INDICATOR.OBJECTIVE.INCORRECT_FACTOR}</IncorrectOptionLabel>,
	// 				label: ''
	// 			};
	// 		}
	// 	});
	// }
	// if (factorOptions.length === 0) {
	// 	factorOptions.push({
	// 		value: '', label: () => {
	// 			return {node: <>{Lang.INDICATOR.OBJECTIVE.NO_AVAILABLE_FACTOR}</>, label: ''};
	// 		}
	// 	});
	// }

	return <FactorEditContainer>
		<FactorDropdown value={uuid || ''} options={factorOptions} onChange={onFactorChange}
		                please={Lang.INDICATOR.OBJECTIVE.FACTOR_PLACEHOLDER} valid={factorValid}/>
	</FactorEditContainer>;
};

export const FactorEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parameter: ObjectiveParameter;
}) => {
	const {objective, factor, indicator, parameter} = props;

	useParameterFromChanged();

	if (!isReferParameter(parameter)) {
		return null;
	}

	return <RealFactorEditor objective={objective} factor={factor} indicator={indicator}
	                         parameter={parameter}/>;
};
