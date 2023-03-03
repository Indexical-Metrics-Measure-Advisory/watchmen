import {
	Objective,
	ObjectiveFactor,
	ObjectiveParameter,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {isReferParameter} from '@/services/data/tuples/objective-utils';
import {isBlank} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {useEffect} from 'react';
import {useObjectivesEventBus} from '../../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../../objectives-event-bus-types';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {useFactor} from './use-factor';
import {FactorDropdown, FactorEditContainer, IncorrectOptionLabel} from './widgets';

const RealFactorEditor = (props: {
	objective: Objective; parameter: ReferObjectiveParameter; factors: Array<ObjectiveFactor>;
}) => {
	const {parameter, factors} = props;

	const {on, off} = useObjectivesEventBus();
	const {onFactorChange, uuid} = useFactor(parameter);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onFactorNameChanged = () => forceUpdate();
		on(ObjectivesEventTypes.FACTOR_NAME_CHANGED, onFactorNameChanged);
		return () => {
			off(ObjectivesEventTypes.FACTOR_NAME_CHANGED, onFactorNameChanged);
		};
	}, [on, off, forceUpdate]);

	const factorOptions: Array<DropdownOption> = factors.map(factor => {
		return {
			value: factor.uuid, label: factor.name || (() => {
				return {
					node: <>{Lang.INDICATOR.OBJECTIVE.REFER_FACTOR_BUT_NONAME}</>,
					label: ''
				};
			})
		};
	});

	// eslint-disable-next-line
	const factorValid = isBlank(uuid) || factors.find(f => f.uuid == uuid) != null;
	if (!factorValid) {
		factorOptions.push({
			value: uuid || '', label: () => {
				return {
					node: <IncorrectOptionLabel>{Lang.INDICATOR.OBJECTIVE.REFER_FACTOR_BUT_INCORRECT}</IncorrectOptionLabel>,
					label: ''
				};
			}
		});
	}
	if (factorOptions.length === 0) {
		factorOptions.push({
			value: '', label: () => {
				return {node: <>{Lang.INDICATOR.OBJECTIVE.REFER_FACTOR_BUT_NO_AVAILABLE}</>, label: ''};
			}
		});
	}

	return <FactorEditContainer>
		<FactorDropdown value={uuid || ''} options={factorOptions} onChange={onFactorChange}
		                please={Lang.INDICATOR.OBJECTIVE.REFER_FACTOR_PLACEHOLDER} valid={factorValid}/>
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
