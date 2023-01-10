import {
	Objective,
	ObjectiveFactor,
	ObjectiveFormulaOperator,
	ObjectiveParameterType
} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import React, {useEffect} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {ComputedEditor} from '../objective-parameter/compute';
import {useParameterEventBus} from '../objective-parameter/parameter-event-bus';
import {ParameterEventTypes} from '../objective-parameter/parameter-event-bus-types';
import {createFactorParameter} from '../param-utils';
import {isIndicatorFactor} from '../utils';
import {FactorItemLabel} from './widgets';

export const FormulaEditor = (props: { objective: Objective; factor: ObjectiveFactor }) => {
	const {objective, factor} = props;

	const {fire: fireObjective} = useObjectivesEventBus();
	const {on, off} = useParameterEventBus();
	useEffect(() => {
		const onParamChanged = () => fireObjective(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		on(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		return () => {
			off(ParameterEventTypes.PARAM_CHANGED, onParamChanged);
		};
	}, [on, off, fireObjective, objective]);

	if (factor.formula == null) {
		factor.formula = isIndicatorFactor(factor)
			? {
				kind: ObjectiveParameterType.COMPUTED,
				operator: ObjectiveFormulaOperator.NONE,
				parameters: []
			}
			: {
				kind: ObjectiveParameterType.COMPUTED,
				operator: ObjectiveFormulaOperator.ADD,
				parameters: [createFactorParameter(), createFactorParameter()]
			};
	}

	const hasAsIs = isIndicatorFactor(factor);
	const factors = isIndicatorFactor(factor)
		? (objective.factors || []).map(f => {
			return f === factor
				? ({
					...f,
					name: <>{f.name} ({Lang.INDICATOR.OBJECTIVE.FACTOR_REFER_SELF})</> as unknown as string
				})
				: f;
		})
		: (objective.factors || []).filter(f => f !== factor);

	return <>
		<FactorItemLabel>{Lang.INDICATOR.OBJECTIVE.FACTOR_FORMULA}</FactorItemLabel>
		<ComputedEditor objective={objective} parameter={factor.formula!} factors={factors}
		                hasAsIs={hasAsIs}/>
	</>;
};