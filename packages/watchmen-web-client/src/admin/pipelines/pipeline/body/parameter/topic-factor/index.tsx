import {Parameter, TopicFactorParameter, ValueTypes} from '@/services/data/tuples/factor-calculator-types';
import {
	findSelectedFactor,
	findSelectedTopic,
	isFactorTypeCompatibleWith
} from '@/services/data/tuples/factor-calculator-utils';
import {Factor} from '@/services/data/tuples/factor-types';
import {isTopicFactorParameter} from '@/services/data/tuples/parameter-utils';
import {Topic} from '@/services/data/tuples/topic-types';
import {isSynonymTopic} from '@/services/data/tuples/topic-utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useParameterEventBus} from '@/widgets/parameter/parameter-event-bus';
import {ParameterEventTypes} from '@/widgets/parameter/parameter-event-bus-types';
import {useTopicFactor} from '@/widgets/parameter/topic-factor/use-topic-factor';
import {buildFactorOptions, buildTopicOptions} from '@/widgets/tuples';
import React, {useEffect} from 'react';
import {FactorDropdown, IncorrectOptionLabel, TopicDropdown, TopicFactorEditContainer} from './widgets';

const RealTopicFactorEditor = (props: {
	parameter: TopicFactorParameter;
	topics: Array<Topic>;
	expectedTypes: ValueTypes;
	synonymAllowed: boolean;
}) => {
	const {parameter, topics, expectedTypes, synonymAllowed} = props;

	const {onTopicChange, onFactorChange, topicId, factorId} = useTopicFactor(parameter);

	const {selected: selectedTopic, extra: extraTopic} = findSelectedTopic(topics, topicId);
	const {selected: selectedFactor, extra: extraFactor} = findSelectedFactor(selectedTopic, factorId);

	const isTopicValid = (topic: Topic) => {
		return !(topic === extraTopic || (!synonymAllowed && isSynonymTopic(topic)));
	};
	const isFactorValid = (factor: Factor) => {
		return selectedTopic !== extraTopic
			&& (synonymAllowed || selectedTopic == null || !isSynonymTopic(selectedTopic))
			&& factor !== extraFactor
			&& isFactorTypeCompatibleWith({
				factorType: factor.type,
				expectedTypes,
				reasons: () => {
					// don't need reason here, ignore it
				}
			});
	};

	const topicOptions = buildTopicOptions({
		topics, extraTopic, toExtraNode: (topic: Topic) => {
			return <IncorrectOptionLabel>{topic.name}</IncorrectOptionLabel>;
		}
	}).map(({value, label, key}) => {
		if (synonymAllowed || !isSynonymTopic(value)) {
			return {value, label, key};
		} else {
			return {
				value,
				key,
				label: () => ({node: <IncorrectOptionLabel>{value.name}</IncorrectOptionLabel>, label: value.name})
			};
		}
	});
	const factorOptions = buildFactorOptions({
		topic: selectedTopic, extraFactor,
		isValid: isFactorValid,
		toExtraNode: (factor: Factor) => {
			return <IncorrectOptionLabel>{factor.label || factor.name}</IncorrectOptionLabel>;
		}
	});

	const topicValid = !selectedTopic || isTopicValid(selectedTopic);
	const factorValid = !selectedFactor || isFactorValid(selectedFactor);

	return <TopicFactorEditContainer>
		<TopicDropdown value={selectedTopic} options={topicOptions} onChange={onTopicChange}
		               please="Topic?"
		               valid={topicValid}/>
		<FactorDropdown value={selectedFactor} options={factorOptions} onChange={onFactorChange}
		                please="Factor?"
		                valid={factorValid}/>
	</TopicFactorEditContainer>;
};

export const TopicFactorEditor = (props: {
	parameter: Parameter;
	topics: Array<Topic>;
	expectedTypes: ValueTypes;
	synonymAllowed?: boolean;
}) => {
	const {parameter, topics, expectedTypes, synonymAllowed = true} = props;

	const {on, off} = useParameterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		return () => {
			off(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	if (!isTopicFactorParameter(parameter)) {
		return null;
	}

	return <RealTopicFactorEditor parameter={parameter} topics={topics} expectedTypes={expectedTypes}
	                              synonymAllowed={synonymAllowed}/>;
};
