import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactor} from '@/services/data/tuples/objective-types';
import {isBlank, noop} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {isIndicatorFactor} from '../utils';
import {FactorFilter} from './filter';
import {FactorItemLabel, IncorrectOptionLabel, IndicatorDropdown} from './widgets';

export const FactorIndicator = (props: { objective: Objective; factor: ObjectiveFactor; indicators: Array<Indicator>; }) => {
	const {objective, factor, indicators} = props;

	const {fire} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();

	if (!isIndicatorFactor(factor)) {
		return null;
	}

	const onIndicatorChanged = (option: DropdownOption) => {
		if (isBlank(option.value)) {
			factor.indicatorId = '';
		} else {
			factor.indicatorId = option.value as IndicatorId;
		}
		forceUpdate();
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
	};

	const options: Array<DropdownOption> = (indicators || []).map(indicator => {
		return {value: indicator.indicatorId, label: indicator.name};
	});
	// eslint-disable-next-line
	const indicatorValid = isBlank(factor.indicatorId) || indicators.find(indicator => indicator.indicatorId == factor.indicatorId) != null;
	if (!indicatorValid) {
		options.push({
			value: '', label: () => {
				return {
					node: <IncorrectOptionLabel>{Lang.INDICATOR.OBJECTIVE.INCORRECT_INDICATOR}</IncorrectOptionLabel>,
					label: ''
				};
			}
		});
	}
	if (options.length === 0) {
		options.push({
			value: '', label: () => {
				return {node: <>{Lang.INDICATOR.OBJECTIVE.NO_AVAILABLE_INDICATOR}</>, label: ''};
			}
		});
	}

	// eslint-disable-next-line
	const selectedIndicator = indicators.find(indicator => indicator.indicatorId == factor.indicatorId);

	return <>
		<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.FACTOR_INDICATOR}</FactorItemLabel>
		<IndicatorDropdown value={factor.indicatorId ?? ''} options={options} onChange={onIndicatorChanged}
		                   please={Lang.INDICATOR.OBJECTIVE.INDICATOR_PLACEHOLDER}
		                   valid={indicatorValid}/>
		<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.FACTOR_INDICATOR_FILTER}</FactorItemLabel>
		<FactorFilter objective={objective} factor={factor} indicator={selectedIndicator}/>
	</>;
};