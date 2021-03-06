import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {Topic, TopicKind, TopicType} from '@/services/data/tuples/topic-types';
import {isNotRawTopic, isRawTopic} from '@/services/data/tuples/topic-utils';
import {generateUuid, removeFakeIdPrefix} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {againstSnakeCaseName} from '@/services/utils';

export const createTopic = (): Topic => {
	return {
		topicId: generateUuid(),
		name: '',
		kind: TopicKind.BUSINESS,
		type: TopicType.DISTINCT,
		factors: [],
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};

export const createFactor = (topic: Topic, ignoreType: boolean = false): Factor => {
	// make sure factor id is unique, because it is not a tuple
	// will not be replaced by backend
	const factorIds = topic.factors.map(factor => factor.factorId);
	let newFactorId = generateUuid();
	while (factorIds.includes(newFactorId)) {
		newFactorId = generateUuid();
	}

	return {
		factorId: removeFakeIdPrefix(newFactorId), name: '', label: '',
		...(ignoreType ? {} : {type: FactorType.TEXT})
	} as Factor;
};

const isSubFactorCanBeFlatten = (topic: Topic, parentFactorName: string): boolean => {
	const parentFactor = (topic.factors || []).find(factor => factor.name === parentFactorName);
	if (!parentFactor) {
		return true;
	} else if (parentFactor.type === FactorType.ARRAY) {
		return false;
	} else if (!parentFactorName.includes('.')) {
		return true;
	} else {
		const [, ...names] = parentFactorName.split('.').reverse();
		return isSubFactorCanBeFlatten(topic, names.reverse().join('.'));
	}
};

export const isFactorCanBeFlatten = (topic: Topic, factor: Factor): boolean => {
	if (isNotRawTopic(topic)) {
		return false;
	}

	if (!factor.name.includes('.')) {
		return true;
	}
	if (factor.type === FactorType.OBJECT || factor.type === FactorType.ARRAY) {
		return false;
	}

	const name = factor.name || '';
	if (!name) {
		return true;
	}

	const [, ...names] = name.split('.').reverse();
	return isSubFactorCanBeFlatten(topic, names.reverse().join('.'));
};

export const isTopicNameInvalid = (name: string) => againstSnakeCaseName(name, false);
export const isTopicNameTooLong = (name: string) => name.trim().length > 55;

export const isFactorNameInvalid = (name: string) => againstSnakeCaseName(name, true);
export const isFactorNameTooLong = (topic: Topic, factor: Factor) => {
	if (isRawTopic(topic)) {
		return factor.flatten && factor.name.trim().length > 60;
	} else {
		return factor.name.trim().length > 60;
	}
};
