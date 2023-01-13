import {Objective, ObjectiveFactor, ObjectiveFactorValues} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {createNumberFormat} from '@/widgets/report/chart-utils/number-format';
import React from 'react';
import {FactorItemLabel, TestValue, TestValueContainer} from './widgets';

export const FactorItemTest = (props: {
	objective: Objective; factor: ObjectiveFactor; values?: ObjectiveFactorValues
}) => {
	const {values} = props;

	if (values == null) {
		return null;
	}

	if (values.failed) {
		return <>
			<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.TEST_FACTOR_GET_NONE}</FactorItemLabel>
			<TestValueContainer>
				<TestValue/>
			</TestValueContainer>
		</>;
	}

	const format = createNumberFormat(2, true);
	const asDisplayValue = (options: { value?: number }): string => {
		const {value = 0} = options;
		return format(value);
	};

	return <>
		<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.TEST_FACTOR}</FactorItemLabel>
		<TestValueContainer>
			<TestValue>{asDisplayValue({value: values.currentValue})}</TestValue>
		</TestValueContainer>
	</>;
};