import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactor} from '@/services/data/tuples/objective-types';
import {isIndicatorFactor} from '@/services/data/tuples/objective-utils';
import {isBlank, noop} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {ConditionalEditor} from './conditional';
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
			// eslint-disable-next-line
		} else if (factor.indicatorId == option.value) {
			// not change, do nothing
			return;
		} else {
			factor.indicatorId = option.value as IndicatorId;
		}
		forceUpdate();
		fire(ObjectivesEventTypes.FACTOR_INDICATOR_CHANGED, objective, factor);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
	};
	const onFilterChanged = () => {
		fire(ObjectivesEventTypes.FACTOR_FILTER_CHANGED, objective, factor);
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
					node:
						<IncorrectOptionLabel>{Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_BUT_INCORRECT}</IncorrectOptionLabel>,
					label: ''
				};
			}
		});
	}
	if (options.length === 0) {
		options.push({
			value: '', label: () => {
				return {node: <>{Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_BUT_NO_AVAILABLE}</>, label: ''};
			}
		});
	}

	// eslint-disable-next-line
	const selectedIndicator = indicators.find(indicator => indicator.indicatorId == factor.indicatorId);

	return <>
		<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.FACTOR_INDICATOR}</FactorItemLabel>
		<IndicatorDropdown value={factor.indicatorId ?? ''} options={options} onChange={onIndicatorChanged}
		                   please={Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_PLACEHOLDER}
		                   valid={indicatorValid}/>
		<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.FACTOR_INDICATOR_FILTER}</FactorItemLabel>
		<ConditionalEditor objective={objective} factor={factor} indicator={selectedIndicator}
		                   onChange={onFilterChanged}/>
	</>;
};