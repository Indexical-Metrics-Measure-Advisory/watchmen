import {Objective, ObjectiveFactor} from '@/services/data/tuples/objective-types';
import {isBlank} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {isIndicatorFactor} from '../utils';
import {FactorItemLabel, TestValue, TestValueContainer} from './widgets';

enum TestStatus {
	NOT_ON_INDICATOR,
	INDICATOR_NOT_READY,
	READY_TO_TEST,
	VALUE_RETRIEVED
}

interface TestState {
	status: TestStatus;
	valueBeforeFormula?: number;
	valueAfterFormula?: number;
}

export const FactorItemTest = (props: {
	objective: Objective; factor: ObjectiveFactor;
}) => {
	const {objective, factor} = props;

	const {on, off} = useObjectivesEventBus();
	const [state, setState] = useState<TestState>(() => {
		if (isIndicatorFactor(factor)) {
			if (isBlank(factor.indicatorId)) {
				return {status: TestStatus.INDICATOR_NOT_READY};
			} else {
				return {status: TestStatus.READY_TO_TEST};
			}
		} else {
			return {status: TestStatus.NOT_ON_INDICATOR};
		}
	});
	useEffect(() => {
		const onFactorIndicatorChanged = (an_objective: Objective, a_factor: ObjectiveFactor) => {
			if (an_objective !== objective || a_factor !== factor) {
				return;
			}
			if (isIndicatorFactor(factor)) {
				if (isBlank(factor.indicatorId)) {
					setState({status: TestStatus.INDICATOR_NOT_READY});
				} else {
					setState({status: TestStatus.READY_TO_TEST});
				}
			} else {
				setState({status: TestStatus.NOT_ON_INDICATOR});
			}
		};
		on(ObjectivesEventTypes.FACTOR_INDICATOR_CHANGED, onFactorIndicatorChanged);
		return () => {
			off(ObjectivesEventTypes.FACTOR_INDICATOR_CHANGED, onFactorIndicatorChanged);
		};
	}, [on, off, objective, factor]);

	if (!isIndicatorFactor(factor)) {
		return null;
	}

	if (state.status === TestStatus.INDICATOR_NOT_READY) {
		return <>
			<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.TEST_FACTOR}</FactorItemLabel>
			<TestValueContainer>
				<TestValue>{Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_BUT_NOT_READY}</TestValue>
			</TestValueContainer>
		</>;
	}

	// const onTestValueClicked = () => {
	// 	if (isBlank(objective.tenantId)) {
	// 		objective.tenantId = findAccount()?.tenantId;
	// 	}
	// 	fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
	// 		return await askObjectiveFactorValue(objective, factor);
	// 	}, ({value}) => {
	// 		setState({status: TestStatus.VALUE_RETRIEVED, value});
	// 	});
	// };

	if (state.status === TestStatus.VALUE_RETRIEVED && state.valueBeforeFormula != null) {
		const v = new Intl.NumberFormat(undefined, {useGrouping: true}).format(state.valueBeforeFormula);
		return <>
			<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.TEST_FACTOR}</FactorItemLabel>
			<TestValueContainer>
				<TestValue>{v}</TestValue>
			</TestValueContainer>
		</>;
	} else if (state.status === TestStatus.VALUE_RETRIEVED && state.valueBeforeFormula == null) {
		return <>
			<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.TEST_FACTOR}</FactorItemLabel>
			<TestValueContainer>
				<TestValue>{Lang.INDICATOR.OBJECTIVE.TEST_FACTOR_GET_NONE}</TestValue>
			</TestValueContainer>
		</>;
	}

	return <>
		<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.TEST_FACTOR}</FactorItemLabel>
		<TestValueContainer>
			<TestValue/>
		</TestValueContainer>
	</>;
};