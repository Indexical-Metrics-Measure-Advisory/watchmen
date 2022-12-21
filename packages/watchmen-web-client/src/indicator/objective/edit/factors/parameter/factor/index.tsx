import {Indicator, IndicatorBaseOn} from '@/services/data/tuples/indicator-types';
import {
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameter,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {Tuple} from '@/services/data/tuples/tuple-types';
import {isTopic} from '@/services/data/tuples/utils';
import {isBlank} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../../../objectives-event-bus-types';
import {isReferParameter} from '../../../param-utils';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {useFactor} from './use-factor';
import {FactorDropdown, FactorEditContainer, IncorrectOptionLabel} from './widgets';

const RealFactorEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parameter: ReferObjectiveParameter;
}) => {
	const {indicator, parameter} = props;

	const {fire} = useObjectivesEventBus();
	const [topicOrSubject, setTopicOrSubject] = useState<Topic | SubjectForIndicator | null>(null);
	const {onFactorChange, uuid} = useFactor(parameter);
	useEffect(() => {
		if (indicator.baseOn === IndicatorBaseOn.TOPIC) {
			fire(ObjectivesEventTypes.ASK_TOPIC, indicator.topicOrSubjectId, (topic?: Topic) => {
				setTopicOrSubject(topic ?? null);
			});
		} else {
			fire(ObjectivesEventTypes.ASK_SUBJECT, indicator.topicOrSubjectId, (subject?: SubjectForIndicator) => {
				setTopicOrSubject(subject ?? null);
			});
		}
	}, [fire, indicator]);

	// noinspection JSMismatchedCollectionQueryUpdate
	const factorOptions: Array<DropdownOption> = (topicOrSubject == null
		? []
		: (isTopic(topicOrSubject as Tuple)
			? ((topicOrSubject as Topic).factors || []).map(factor => {
				return {value: factor.factorId, label: factor.label || factor.name || ''};
			})
			: ((topicOrSubject as SubjectForIndicator).dataset?.columns || []).map(column => {
				return {value: column.columnId, label: column.alias || ''};
			})))
		.sort((f1: DropdownOption, f2: DropdownOption) => {
			return (f1.label as string).toLowerCase().localeCompare((f2.label as string).toLowerCase());
		});

	// eslint-disable-next-line
	const factorValid = isBlank(uuid) || factorOptions.find(f => f.value == uuid) != null;
	if (!factorValid) {
		factorOptions.push({
			value: uuid || '', label: () => {
				return {
					node:
						<IncorrectOptionLabel>{Lang.INDICATOR.OBJECTIVE.INCORRECT_FACTOR_FILTER_FACTOR_OR_COLUMN}</IncorrectOptionLabel>,
					label: ''
				};
			}
		});
	}
	if (factorOptions.length === 0) {
		factorOptions.push({
			value: '', label: () => {
				return {node: <>{Lang.INDICATOR.OBJECTIVE.NO_AVAILABLE_FACTOR_FILTER_FACTOR_OR_COLUMN}</>, label: ''};
			}
		});
	}

	const please = indicator.baseOn === IndicatorBaseOn.TOPIC
		? Lang.INDICATOR.OBJECTIVE.FACTOR_FILTER_TOPIC_PLACEHOLDER
		: Lang.INDICATOR.OBJECTIVE.FACTOR_FILTER_SUBJECT_PLACEHOLDER;

	return <FactorEditContainer>
		<FactorDropdown value={uuid || ''} options={factorOptions} onChange={onFactorChange}
		                please={please} valid={factorValid}/>
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
