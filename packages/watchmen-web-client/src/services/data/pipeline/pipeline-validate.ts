import {
	AnyFactorType,
	DeclaredVariable,
	DeclaredVariables,
	Parameter,
	ParameterCondition,
	ParameterExpressionOperator,
	ParameterInvalidReasonsLabels,
	ParameterJoint,
	TopicFactorParameter
} from '../tuples/factor-calculator-types';
import {FactorId, FactorIndexGroup} from '../tuples/factor-types';
import {
	isComputedParameter,
	isConstantParameter,
	isExpressionParameter,
	isJointParameter,
	isTopicFactorParameter
} from '../tuples/parameter-utils';
import {FindBy, PipelineStageUnitAction} from '../tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {
	isAlarmAction,
	isCopyToMemoryAction,
	isDeleteTopicAction,
	isInsertRowAction,
	isMergeRowAction,
	isReadFactorAction,
	isReadFactorsAction,
	isReadTopicAction,
	isWriteFactorAction,
	isWriteToExternalAction
} from '../tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-utils';
import {Pipeline} from '../tuples/pipeline-types';
import {buildVariable, isJointValid4Pipeline, isParameterValid4Pipeline} from '../tuples/pipeline-validation-utils';
import {Topic, TopicId} from '../tuples/topic-types';
import {isSynonymTopic} from '../tuples/topic-utils';
import {isNotNull} from '../utils';

export interface PipelineValidateResult {
	pipeline: Pipeline;
	pass: boolean;
	messages: Array<string>;
	missIndexed: Array<string>;
}

const isConditionCanBeComputedInMemory = (condition: ParameterCondition, topic: Topic): boolean => {
	if (isJointParameter(condition)) {
		return condition.filters.every(condition => isConditionCanBeComputedInMemory(condition, topic));
	} else if (isExpressionParameter(condition)) {
		const {left, right} = condition;
		if (left && !isParameterCanBeComputedInMemory(left, topic)) {
			return false;
		}
		return !right || isParameterCanBeComputedInMemory(right, topic);
	} else {
		// never occurs
		return true;
	}
};
const isParameterCanBeComputedInMemory = (parameter: Parameter, topic: Topic): boolean => {
	if (isConstantParameter(parameter)) {
		return true;
	} else if (isComputedParameter(parameter)) {
		return parameter.parameters.every(sub => {
			let can = isParameterCanBeComputedInMemory(sub, topic);
			if (!can) {
				return false;
			}
			if (sub.on) {
				return sub.on.filters.every(condition => isConditionCanBeComputedInMemory(condition, topic));
			} else {
				return true;
			}
		});
	} else if (isTopicFactorParameter(parameter)) {
		// eslint-disable-next-line
		return parameter.topicId != topic.topicId;
	} else {
		return true;
	}
};

const countIndex = (one: TopicFactorParameter, another: Parameter, topic: Topic, usedIndexGroups: Record<FactorIndexGroup, Array<FactorId>>) => {
	if (isParameterCanBeComputedInMemory(another, topic)) {
		// eslint-disable-next-line
		const factor = topic.factors.find(factor => factor.factorId == one.factorId);
		if (factor?.indexGroup) {
			let group = usedIndexGroups[factor.indexGroup];
			if (!group) {
				usedIndexGroups[factor.indexGroup] = [factor.factorId];
			} else {
				group.push(factor.factorId);
			}
		}
	}
};
// assume action already pass validation
const isIndexUsed = (action: FindBy, topic: Topic): boolean => {
	const {by} = action;

	const unique = false;//!isReadFactorsAction(action) && !isReadRowsAction(action) && !isExistsAction(action) && !isDeleteRowsAction(action);

	const definedIndexes: Record<FactorIndexGroup, Array<FactorId>> = topic.factors.reduce((indexes, factor) => {
		if (factor.indexGroup) {
			const group = indexes[factor.indexGroup];
			if (!group) {
				indexes[factor.indexGroup] = [factor.factorId];
			} else {
				group.push(factor.factorId);
			}
		}
		return indexes;
	}, {} as Record<FactorIndexGroup, Array<FactorId>>);
	const usedIndexGroups: Record<FactorIndexGroup, Array<FactorId>> = {} as Record<FactorIndexGroup, Array<FactorId>>;
	(by.filters || []).forEach(condition => {
		if (!isExpressionParameter(condition)) {
			return;
		}

		if (condition.operator !== ParameterExpressionOperator.EQUALS) {
			return;
		}

		const {left, right} = condition;
		// eslint-disable-next-line
		if (isTopicFactorParameter(left) && left.topicId == topic.topicId) {
			countIndex(left, right, topic, usedIndexGroups);
			// eslint-disable-next-line
		} else if (isTopicFactorParameter(right) && right.topicId == topic.topicId) {
			countIndex(right, left, topic, usedIndexGroups);
		}
	});

	if (Object.keys(usedIndexGroups).length === 0) {
		return false;
	}

	const usefulIndexGroups: Array<FactorIndexGroup> = (unique ? Object.keys(usedIndexGroups).filter(indexGroup => {
		return indexGroup.startsWith('u-');
	}) : Object.keys(usedIndexGroups)) as Array<FactorIndexGroup>;

	// compare useful with defined
	return usefulIndexGroups.some(indexGroup => {
		const used = [...new Set(usedIndexGroups[indexGroup] || [])];
		const defined = definedIndexes[indexGroup];
		return used.length === defined.length;
	});
};

const validateWriteTargetTopic = (options: {
	topics: Array<Topic>;
	topicId: TopicId;
	messages: Array<string>;
	stageIndex: number;
	unitIndex: number;
	actionIndex: number;
}) => {
	const {topics, topicId, messages, stageIndex, unitIndex, actionIndex} = options;

	// eslint-disable-next-line
	const topic = topics.find(topic => topic.topicId == topicId);
	if (!topic) {
		messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] target topic is incorrect.`);
	} else if (isSynonymTopic(topic)) {
		messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] target topic cannot be synonym.`);
	}
	return topic;
};
const checkReadBy = (options: {
	by: ParameterJoint;
	topic?: Topic;
	triggerTopic?: Topic;
	variables: Array<DeclaredVariable>;
	messages: Array<string>;
	stageIndex: number;
	unitIndex: number;
	actionIndex: number;
	actionType: 'read' | 'merge' | 'delete'
}) => {
	const {
		by, topic, triggerTopic, variables,
		messages, stageIndex, unitIndex, actionIndex, actionType
	} = options;

	if (!by || by.filters.length === 0) {
		messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] ${actionType} by is not given yet.`);
	} else if (!isJointValid4Pipeline({
		joint: by,
		allTopics: [topic, triggerTopic].filter(isNotNull) as Array<Topic>,
		triggerTopic,
		variables,
		reasons: (reason) => {
			messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] ${actionType} by is incorrect caused by ${ParameterInvalidReasonsLabels[reason]}.`);
		}
	})) {
		// do nothing, reason already be added by passed function
	}
};
export const validatePipeline = (pipeline: Pipeline, topics: Array<Topic>): PipelineValidateResult => {
	const messages: Array<string> = [];
	const {name, type, topicId, conditional, on, stages} = pipeline;
	if (!name || name.trim().length === 0) {
		messages.push('Pipeline name is not given yet.');
	}

	if (type == null) {
		messages.push('Pipeline trigger type is not given yet.');
	}

	// eslint-disable-next-line
	const triggerTopic = topics.find(topic => topic.topicId == topicId);
	if (!triggerTopic) {
		messages.push('Pipeline source topic is mismatched.');
	}

	const variables: DeclaredVariables = [];
	const missIndexed: Array<string> = [];

	if (conditional) {
		if (!on || on.filters.length === 0) {
			messages.push('Pipeline prerequisite is not given yet.');
		} else if (!isJointValid4Pipeline({
			joint: on,
			allTopics: triggerTopic ? [triggerTopic] : [],
			triggerTopic,
			variables,
			reasons: (reason) => {
				messages.push(`Pipeline prerequisite is incorrect caused by ${ParameterInvalidReasonsLabels[reason]}.`);
			}
		})) {
			// do nothing, reason already be added by passed function
		}
	}

	/**
	 * try to build variable and push into given variables.
	 * return true when successful, return false when cannot find the correct type or build failure
	 */
	const tryToBuildVariable = (options: {
		action: PipelineStageUnitAction;
		variables: DeclaredVariables;
		topics: Array<Topic>;
		triggerTopic?: Topic;
	}): boolean => {
		const {action, variables, topics, triggerTopic} = options;

		const variable = buildVariable({action, variables, topics, triggerTopic});
		if (variable) {
			if (variable.types.every(type => type.type === AnyFactorType.ERROR)) {
				// detect error type
				return false;
			} else {
				const newVariables = variables.filter(v => v.name !== variable.name);
				variables.length = 0;
				variables.push(variable, ...newVariables);
				return true;
			}
		} else {
			return false;
		}
	};

	stages.forEach((stage, stageIndex) => {
		// return true when fail on validation
		const {conditional, on, units} = stage;
		if (conditional) {
			if (!on || on.filters.length === 0) {
				messages.push(`Stage[#${stageIndex + 1}] prerequisite is not given yet.`);
			} else if (!isJointValid4Pipeline({
				joint: on,
				allTopics: triggerTopic ? [triggerTopic] : [],
				triggerTopic,
				variables,
				reasons: (reason) => {
					messages.push(`Stage[#${stageIndex + 1}] prerequisite is incorrect caused by ${ParameterInvalidReasonsLabels[reason]}.`);
				}
			})) {
				// do nothing, reason already be added by passed function
			}
		}

		units.forEach((unit, unitIndex) => {
			// return true when fail on validation
			const {loopVariableName, conditional, on, do: actions} = unit;
			if (loopVariableName && loopVariableName.trim().length !== 0) {
				if (variables.every(variable => variable.name !== loopVariableName.trim())) {
					messages.push(`Unit[#${stageIndex + 1}.${unitIndex + 1}] loop variable name is incorrect.`);
				}
			}

			if (conditional) {
				if (!on || on.filters.length === 0) {
					messages.push(`Unit[#${stageIndex + 1}.${unitIndex + 1}] prerequisite is not given yet.`);
				} else if (!isJointValid4Pipeline({
					joint: on,
					allTopics: triggerTopic ? [triggerTopic] : [],
					triggerTopic,
					variables,
					reasons: (reason) => {
						messages.push(`Unit[#${stageIndex + 1}.${unitIndex + 1}] prerequisite is incorrect caused by ${ParameterInvalidReasonsLabels[reason]}.`);
					}
				})) {
					// do nothing, reason already be added by passed function
				}
			}
			actions.forEach((action, actionIndex) => {
				// return true when fail on validation
				if (isAlarmAction(action)) {
					const {severity, on, conditional} = action;
					if (!severity) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] severity is not given yet.`);
					}
					if (conditional) {
						if (!on || on.filters.length === 0) {
							messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] prerequisite is not given yet.`);
						} else if (!isJointValid4Pipeline({
							joint: on,
							allTopics: triggerTopic ? [triggerTopic] : [],
							triggerTopic,
							variables,
							reasons: (reason) => {
								messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] prerequisite is incorrect caused by ${ParameterInvalidReasonsLabels[reason]}.`);
							}
						})) {
							// do nothing, reason already be added by passed function
						}
					}
				} else if (isCopyToMemoryAction(action)) {
					const {variableName, source} = action;
					if (!variableName || variableName.trim().length === 0) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] variable name is not given yet.`);
					}
					if (!source) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] source is not given yet.`);
					} else {
						if (!isParameterValid4Pipeline({
							parameter: source,
							allTopics: topics,
							triggerTopic,
							variables,
							expectedTypes: [AnyFactorType.ANY],
							array: false,
							reasons: (reason) => {
								messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] source is incorrect caused by ${ParameterInvalidReasonsLabels[reason]}.`);
							}
						})) {
							// do nothing, reason already be added by passed function
						}
					}

					// pass validate
					const built = tryToBuildVariable({action, variables, topics, triggerTopic});
					if (!built) {
						// cannot build variable, return true as failed.
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] source is incorrect.`);
					}
				} else if (isWriteToExternalAction(action)) {
					if (!action.externalWriterId) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] adapter is not given yet.`);
					}
				} else if (isReadTopicAction(action)) {
					const {topicId, variableName, by} = action;
					if (!variableName || variableName.trim().length === 0) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] variable name is not given yet.`);
					}
					// eslint-disable-next-line
					const topic = topics.find(topic => topic.topicId == topicId);
					if (!topic) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] source topic is incorrect.`);
					} else if (isReadFactorAction(action) || isReadFactorsAction(action)) {
						const {factorId} = action;
						// eslint-disable-next-line
						const factor = topic.factors.find(factor => factor.factorId == factorId);
						if (!factor) {
							messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] source factor is incorrect.`);
						}
					}
					checkReadBy({
						by, topic, triggerTopic, variables,
						messages, stageIndex, unitIndex, actionIndex, actionType: 'read'
					});

					const built = tryToBuildVariable({action, variables, topics, triggerTopic});
					if (!built) {
						// cannot build variable, return true as failed.
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] topic or factor is incorrect.`);
					}
					if (topic && !isIndexUsed(action, topic)) {
						missIndexed.push(`#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}`);
					}
				} else if (isInsertRowAction(action) || isMergeRowAction(action)) {
					const {topicId, mapping} = action;
					// eslint-disable-next-line
					const topic = validateWriteTargetTopic({
						topics, topicId, messages, stageIndex, unitIndex, actionIndex
					});
					if (!mapping || mapping.length === 0) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] mapping doesn't be defined yet.`);
					}
					if (topic) {
						mapping.some(({factorId, source}, index) => {
							// eslint-disable-next-line
							const factor = topic.factors.find(factor => factor.factorId == factorId);
							if (!factor) {
								messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] mapping[${index + 1}] factor is missed.`);
								return true;
							}

							if (!isParameterValid4Pipeline({
								parameter: source,
								allTopics: topics,
								triggerTopic,
								variables,
								expectedTypes: [factor.type],
								array: false,
								reasons: (reason) => {
									messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] mapping[${index + 1}] source is incorrect caused by ${ParameterInvalidReasonsLabels[reason]}.`);
								}
							})) {
								// do nothing, reason already be added by passed function
							}

							// false means pass the mapping validation
							return false;
						});
					}
					if (isMergeRowAction(action)) {
						const {by} = action;
						checkReadBy({
							by, topic, triggerTopic, variables,
							messages, stageIndex, unitIndex, actionIndex, actionType: 'merge'
						});

						if (topic && !isIndexUsed(action, topic)) {
							missIndexed.push(`#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}`);
						}
					}
				} else if (isWriteFactorAction(action)) {
					const {topicId, factorId, by} = action;
					// eslint-disable-next-line
					const topic = validateWriteTargetTopic({
						topics, topicId, messages, stageIndex, unitIndex, actionIndex
					});
					// eslint-disable-next-line
					const factor = topic?.factors.find(factor => factor.factorId == factorId);
					if (!factor) {
						messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] source factor is incorrect.`);
					}
					checkReadBy({
						by, topic, triggerTopic, variables,
						messages, stageIndex, unitIndex, actionIndex, actionType: 'merge'
					});
					if (topic && !isIndexUsed(action, topic)) {
						missIndexed.push(`#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}`);
					}
				} else if (isDeleteTopicAction(action)) {
					const {topicId, by} = action;
					// eslint-disable-next-line
					const topic = validateWriteTargetTopic({
						topics, topicId, messages, stageIndex, unitIndex, actionIndex
					});
					checkReadBy({
						by, topic, triggerTopic, variables,
						messages, stageIndex, unitIndex, actionIndex, actionType: 'delete'
					});

					if (topic && !isIndexUsed(action, topic)) {
						missIndexed.push(`#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}`);
					}
				} else {
					messages.push(`Action[#${stageIndex + 1}.${unitIndex + 1}.${actionIndex + 1}] action type is not supported yet.`);
				}
			});
		});
	});

	return {pipeline, pass: messages.length === 0, messages, missIndexed};
};