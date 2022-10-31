import {ConstantParameter, ParameterKind} from '@/services/data/tuples/factor-calculator-types';
import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {importPipelines} from '@/services/data/tuples/pipeline';
import {AggregateArithmetic} from '@/services/data/tuples/pipeline-stage-unit-action/aggregate-arithmetic-types';
import {
	SystemActionType,
	WriteTopicActionType
} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {
	InsertRowAction,
	MappingFactor
} from '@/services/data/tuples/pipeline-stage-unit-action/write-topic-actions-types';
import {Pipeline, PipelineTriggerType} from '@/services/data/tuples/pipeline-types';
import {importTopics} from '@/services/data/tuples/topic';
import {Topic, TopicKind, TopicType} from '@/services/data/tuples/topic-types';
import {generateUuid, isFakedUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button, DwarfButton} from '@/widgets/basic/button';
import {ICON_PIPELINE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {DialogFooter, DialogLabel} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import {useAdminCacheEventBus} from '../../cache/cache-event-bus';
import {AdminCacheEventTypes} from '../../cache/cache-event-bus-types';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {createFactor, isTopicNameInvalid, isTopicNameTooLong} from '../utils';
import {TopicPickerTable} from './topic-picker-table';
import {PICKER_DIALOG_HEIGHT, PickerDialogBody} from './widgets';

const asPeerTopicName = (topic: Topic): string => {
	let peerTopicName = topic.name;
	if (peerTopicName.toLowerCase().startsWith('raw_')) {
		peerTopicName = `dist_${peerTopicName.substr(4)}`;
	} else {
		peerTopicName = `dist_${peerTopicName}`;
	}
	return peerTopicName;
};

const asTopicName = (topic: Topic, factorName: string): string => {
	if (factorName.indexOf('.') === -1) {
		return asPeerTopicName(topic);
	} else {
		const segments = factorName.split('.').map(segment => segment.trim()).filter(segment => segment.length !== 0);
		segments.length = segments.length - 1;
		return `dist_${segments.join('_')}`;
	}
};

const asFactorName = (factorName: string): string => {
	if (factorName.indexOf('.') === -1) {
		return factorName.trim();
	} else {
		const names = factorName.split('.').map(segment => segment.trim());
		return names[names.length - 1];
	}
};

type ParsedTopics = Record<string, {
	topic: Topic;
	// key: factor id in distinct topic; value: factor id in raw topic
	factorIdMap: Record<string, string>;
	array: boolean;
	// existing only when array is true
	loopFactor?: Factor;
}>

const createPeerTopic = (topic: Topic): Topic => {
	return {
		topicId: generateUuid(),
		name: asPeerTopicName(topic),
		kind: TopicKind.BUSINESS,
		type: TopicType.DISTINCT,
		factors: [],
		dataSourceId: topic.dataSourceId,
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
const parseTopics = (topic: Topic) => {
	const clonedFactors: Array<Factor> = [...(topic.factors || [])].sort((f1, f2) => {
		return (f1.name || '').localeCompare(f2.name || '');
	});
	const arrayFactorNames = clonedFactors.filter(factor => factor.type === FactorType.ARRAY).map(factor => factor.name);

	const peerTopic = createPeerTopic(topic);
	return clonedFactors.reduce((topics, factor) => {
		if (factor.type === FactorType.ARRAY || factor.type === FactorType.OBJECT) {
			const topicName = `dist_${factor.name.replaceAll('.', '_')}`;
			const newTopic = {
				topicId: generateUuid(),
				name: topicName,
				kind: TopicKind.BUSINESS,
				type: TopicType.DISTINCT,
				factors: [],
				dataSourceId: topic.dataSourceId,
				version: 1,
				createdAt: getCurrentTime(),
				lastModifiedAt: getCurrentTime()
			};
			const array = factor.type === FactorType.ARRAY
				|| arrayFactorNames.some(name => factor.name.startsWith(`${name}.`));
			topics[topicName] = {topic: newTopic, factorIdMap: {}, array, loopFactor: array ? factor : (void 0)};
		} else {
			const topicName = asTopicName(topic, factor.name || '');
			const newTopic = topics[topicName]!;
			const factorName = asFactorName(factor.name);
			const newFactor = {
				...factor,
				factorId: createFactor(newTopic.topic, true).factorId,
				name: factorName
			};
			newTopic.topic.factors.push(newFactor);
			newTopic.factorIdMap[newFactor.factorId] = factor.factorId;
		}
		return topics;
	}, {[peerTopic.name]: {topic: peerTopic, factorIdMap: {}, array: false}} as ParsedTopics);
};

const parsePipelines = (sourceTopic: Topic, targetTopics: ParsedTopics): Array<Pipeline> => {
	return Object.values(targetTopics).map(({topic: tailTopic, factorIdMap, array, loopFactor}) => {
		const hasLoop = array;
		const loopVariableName = `lv_${(loopFactor?.name || '').replaceAll('.', '_')}`;
		const mappingPrefix = hasLoop ? `${loopVariableName}.` : '';

		return {
			pipelineId: generateUuid(),
			name: `Flatten to [${tailTopic.name}]`,
			topicId: sourceTopic.topicId,
			type: PipelineTriggerType.INSERT_OR_MERGE,
			conditional: false,
			stages: [{
				stageId: generateUuid(),
				name: 'Copy data stage',
				conditional: false,
				units: [
					hasLoop ? {
						unitId: generateUuid(),
						name: 'Prepare loop variable',
						conditional: false,
						do: [{
							actionId: generateUuid(),
							type: SystemActionType.COPY_TO_MEMORY,
							variableName: loopVariableName,
							source: {
								kind: ParameterKind.TOPIC,
								topicId: sourceTopic.topicId,
								// eslint-disable-next-line
								factorId: (sourceTopic.factors || []).find(factor => factor.name == loopFactor!.name)?.factorId
							}
						}]
					} : null,
					{
						unitId: generateUuid(),
						name: 'Copy data unit',
						conditional: false,
						loopVariableName: hasLoop ? loopVariableName : (void 0),
						do: [{
							actionId: generateUuid(),
							type: WriteTopicActionType.INSERT_ROW,
							topicId: tailTopic.topicId,
							mapping: tailTopic.factors.map(tailFactor => {
								const fromFactorId = factorIdMap[tailFactor.factorId];
								// eslint-disable-next-line
								const fromFactor = (sourceTopic.factors || []).find(factor => factor.factorId == fromFactorId);
								let variableName = hasLoop ? fromFactor!.name.substring(loopFactor!.name.length + 1) : fromFactor!.name;
								variableName = `${mappingPrefix}${variableName}`;
								return {
									source: {
										kind: ParameterKind.CONSTANT,
										value: `{${variableName}}`
									} as ConstantParameter,
									factorId: tailFactor.factorId,
									arithmetic: AggregateArithmetic.NONE
								} as MappingFactor;
							})
						} as InsertRowAction]
					}
				].filter(x => x != null)
			}],
			enabled: true,
			validated: true,
			version: 1,
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		} as Pipeline;
	});
};

const TopicPicker = (props: {
	topics: Array<Topic>;
	onConfirm: (topics: Array<Topic>) => void
}) => {
	const {topics, onConfirm} = props;

	const {fire} = useEventBus();
	const [candidates] = useState(() => {
		return topics.map(topic => {
			return {topic, picked: true};
		});
	});

	// noinspection DuplicatedCode
	const onConfirmClicked = () => {
		const topics = candidates.filter(c => c.picked).map(({topic}) => topic);
		const valid = topics.every(topic => {
			if (!topic.name || !topic.name.trim()) {
				fire(EventTypes.SHOW_ALERT, <AlertLabel>Topic name is required.</AlertLabel>);
				return false;
			} else if (isTopicNameInvalid(topic.name)) {
				fire(EventTypes.SHOW_ALERT, <AlertLabel>
					Please use camel case or snake case for topic name.
				</AlertLabel>);
				return false;
			} else if (isTopicNameTooLong(topic.name)) {
				fire(EventTypes.SHOW_ALERT, <AlertLabel>55 characters maximum for topic name.</AlertLabel>);
				return false;
			} else {
				return true;
			}
		});
		if (valid) {
			onConfirm(topics);
			fire(EventTypes.HIDE_DIALOG);
		}
	};
	const onCancelClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <>
		<PickerDialogBody>
			<DialogLabel>Please select topics</DialogLabel>
			<TopicPickerTable candidates={candidates}/>
		</PickerDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onConfirmClicked}>Confirm</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>Cancel</Button>
		</DialogFooter>
	</>;
};

export const ParseFlattenPipelinesButton = (props: { topic: Topic }) => {
	const {topic} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useAdminCacheEventBus();
	const {fire: fireTuple} = useTupleEventBus();
	const {on, off} = useTopicEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onTopicTypeChanged = () => {
			forceUpdate();
		};
		on(TopicEventTypes.TOPIC_TYPE_CHANGED, onTopicTypeChanged);
		return () => {
			off(TopicEventTypes.TOPIC_TYPE_CHANGED, onTopicTypeChanged);
		};
	}, [on, off, topic, forceUpdate]);

	if (topic.type !== TopicType.RAW) {
		return null;
	}

	const doParsePipelines = () => {
		const topics = parseTopics(topic);
		const candidates = Object.values(topics).map(({topic}) => topic).sort((g1, g2) => {
			return (g1.name || '').toLowerCase().localeCompare((g2.name || '').toLowerCase());
		});
		const onConfirm = (selectedTopics: Array<Topic>) => {
			// record fake ids
			// const pipelines = parsePipelines(topic, topics);
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				return await importTopics(selectedTopics);
			}, (importedTopics: Array<Topic>) => {
				importedTopics.forEach(importedTopic => fireCache(AdminCacheEventTypes.SAVE_TOPIC, importedTopic));
				const pipelines = parsePipelines(topic, importedTopics.reduce((parsed, importedTopic) => {
					const inMemoryParsedTopic = Object.values(topics).find(({topic}) => topic.name === importedTopic.name);
					// @ts-ignore
					parsed[importedTopic.name] = {...inMemoryParsedTopic, topic: importedTopic};
					return parsed;
				}, {} as ParsedTopics));
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
					return await importPipelines(pipelines);
				}, (importedPipelines: Array<Pipeline>) => {
					importedPipelines.forEach(importedPipeline => fireCache(AdminCacheEventTypes.SAVE_PIPELINE, importedPipeline));
					fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Flatten distinct topics created.</AlertLabel>);
				});
			});
		};
		fireGlobal(EventTypes.SHOW_DIALOG,
			<TopicPicker topics={candidates} onConfirm={onConfirm}/>,
			{
				marginTop: '10vh',
				marginLeft: '20%',
				width: '60%',
				height: PICKER_DIALOG_HEIGHT
			});
	};
	const doSaveTopic = () => {
		fireGlobal(EventTypes.HIDE_DIALOG);
		fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.SAVING);
		fireTuple(TupleEventTypes.SAVE_TUPLE, topic, (topic, saved) => {
			if (saved) {
				fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.SAVED);
				doParsePipelines();
			} else {
				fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
			}
		});
	};
	const onParseClicked = () => {
		if (isFakedUuid(topic)) {
			fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
				'Current topic is not persist yet, should be saved first before parse flatten topics and pipelines. Are you sure to save it first?',
				() => doSaveTopic(), () => fireGlobal(EventTypes.HIDE_DIALOG));
		} else {
			fireTuple(TupleEventTypes.ASK_TUPLE_STATE, (state: TupleState) => {
				if (state === TupleState.CHANGED) {
					fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
						'Current topic is changed, should be saved first before parse flatten topics and pipelines. Are you sure to save it first?',
						() => doSaveTopic(), () => fireGlobal(EventTypes.HIDE_DIALOG));
				} else if (state === TupleState.SAVING) {
					fireGlobal(EventTypes.SHOW_ALERT,
						<AlertLabel>
							Current topic is saving, please wait for saved and try to parse again.
						</AlertLabel>);
				} else {
					doParsePipelines();
				}
			});
		}
	};

	return <DwarfButton ink={ButtonInk.PRIMARY} onClick={onParseClicked}>
		<FontAwesomeIcon icon={ICON_PIPELINE}/>
		<span>Build Flatten Topics</span>
	</DwarfButton>;
};