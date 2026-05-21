import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {Pipeline, PipelineId} from '@/services/data/tuples/pipeline-types';
import {fetchTopicDataIds, fetchTopicRowCount, triggerCollectorPipeline} from '@/services/data/tuples/topic';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {getServiceHost} from '@/services/data/utils';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ICON_LOADING} from '@/widgets/basic/constants';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import dayjs from 'dayjs';
import React, {useState} from 'react';
import {TopFilterEdit} from './top-filter-edit';
import {TriggerTopicFilter} from './types';
import {
	CollectorDateTimeInput,
	CollectorSectionLabel,
	CollectorTriggerContainer,
	RunInBrowserContainer,
	TopicDropdown,
	TriggerButton,
	TriggerContainer,
	TriggerFilterContainer,
	TriggerLabel,
	TriggerPipeline,
	TriggerPipelinesContainer,
	TriggerText
} from './widgets';

interface CollectorTriggerState {
	startTime: string;
	endTime: string;
	topicId?: TopicId;
	selectedPipelineIds: Array<PipelineId>;
}

interface State {
	trigger: Omit<TriggerTopicFilter, 'topicId'> & { topicId?: TopicId };
	rowCount?: number;
	threads: string | number;
	collector: CollectorTriggerState;
}

enum RunningStatus {
	WAIT, ING, STOPPED
}

interface RunningState {
	running: RunningStatus;
	total: number;
	success: number;
	failed: Array<{ dataId: string, pipelineId: PipelineId }>;
}

const PAGE_CONFIG = {
	showLegacyTopicTrigger: false
};

export const Trigger = (props: { topics: Array<Topic>, pipelines: Array<Pipeline> }) => {
	const {topics, pipelines} = props;

	const {fire: fireGlobal} = useEventBus();
	// const threadsInputRef = useRef<HTMLInputElement>(null);
	const [state, setState] = useState<State>({
		trigger: {
			joint: {
				jointType: ParameterJointType.AND,
				filters: []
			},
			pipelineIds: []
		},
		threads: 4,
		collector: {
			startTime: '',
			endTime: '',
			topicId: undefined,
			selectedPipelineIds: []
		}
	});
	const [fetchingRowCount, setFetchingRowCount] = useState(false);
	const [runningState, setRunningState] = useState<RunningState>({
		running: RunningStatus.WAIT,
		total: 0,
		success: 0,
		failed: []
	});

	const onChange = (option: DropdownOption) => {
		if (runningState.running === RunningStatus.ING) {
			return;
		}

		// eslint-disable-next-line
		if (option.value == state.trigger.topicId) {
			return;
		}

		setState(({threads, collector}) => {
			return {
				trigger: {
					topicId: option.value as TopicId,
					joint: {
						jointType: ParameterJointType.AND,
						filters: []
					},
					pipelineIds: []
				},
				threads,
				collector
			};
		});
		if (runningState.running === RunningStatus.STOPPED) {
			setRunningState({running: RunningStatus.WAIT, total: 0, success: 0, failed: []});
		}
	};
	const onPipelineClicked = (pipelineId: PipelineId) => () => {
		if (runningState.running !== RunningStatus.WAIT) {
			return;
		}

		if (state.trigger.pipelineIds.includes(pipelineId)) {
			setState(({trigger, rowCount, threads, collector}) => {
				return {
					trigger: {
						...trigger,
						// eslint-disable-next-line
						pipelineIds: (trigger.pipelineIds || []).filter(selected => selected != pipelineId)
					},
					rowCount, threads, collector
				};
			});
		} else {
			setState(({trigger, rowCount, threads, collector}) => {
				return {
					trigger: {
						...trigger,
						// eslint-disable-next-line
						pipelineIds: [...(trigger.pipelineIds || []), pipelineId]
					},
					rowCount, threads, collector
				};
			});
		}
	};
	const onFetchRowCountClicked = () => {
		if (runningState.running !== RunningStatus.WAIT) {
			return;
		}

		if (state.trigger.topicId == null) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please pick a topic first.</AlertLabel>);
			return;
		}
		if (state.trigger.pipelineIds.length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please pick at least one pipeline.</AlertLabel>);
			return;
		}

		setFetchingRowCount(true);
		// fetch row count of this topic
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return fetchTopicRowCount(state.trigger.topicId!, state.trigger.joint);
		}, (rowCount: number) => {
			setState(({trigger, threads, collector}) => ({trigger, rowCount, threads, collector}));
			setFetchingRowCount(false);
		}, () => setFetchingRowCount(false));
	};
	const fetchDataIds = async (): Promise<Array<string>> => {
		return new Promise<Array<string>>(resolve => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				return fetchTopicDataIds(state.trigger.topicId!, state.trigger.joint);
			}, (dataIds: Array<string>) => {
				resolve(dataIds);
			}, () => {
				resolve([]);
			});
		});
	};
	const onDownloadClicked = async () => {
		const dataIds = await fetchDataIds();
		// eslint-disable-next-line
		const topic = state.trigger.topicId == null ? null : topics.find(topic => topic.topicId == state.trigger.topicId);
		const content = JSON.stringify({
			url: `${getServiceHost()}topic/data/rerun?topic_id=${topic?.topicId ?? ''}&data_id=:dataId&pipeline_id=:pipelineId`,
			data: dataIds.map(dataId => {
				return state.trigger.pipelineIds.map(pipelineId => {
					return {
						topicId: state.trigger.topicId,
						pipelineId: pipelineId,
						dataId: dataId
					};
				});
			}).flat()
		});
		const link = document.createElement('a');
		link.href = 'data:application/json;charset=utf-8,' + encodeURI(content);
		link.target = '_blank';
		link.download = `manual-topic[${topic?.name ?? ''}]-trigger-${dayjs().format('YYYYMMDDHHmmss')}.json`;
		link.click();
	};
	const onCollectorStartTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setState(prev => ({
			...prev,
			collector: {...prev.collector, startTime: event.target.value}
		}));
	};
	const onCollectorEndTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setState(prev => ({
			...prev,
			collector: {...prev.collector, endTime: event.target.value}
		}));
	};
	const onCollectorTopicClicked = (option: DropdownOption) => {
		setState(prev => ({
			...prev,
			collector: {
				...prev.collector,
				topicId: option.value as TopicId,
				selectedPipelineIds: []
			}
		}));
	};
	const onCollectorPipelineClicked = (pipelineId: PipelineId) => () => {
		if (state.collector.selectedPipelineIds.includes(pipelineId)) {
			setState(prev => ({
				...prev,
				collector: {
					...prev.collector,
					selectedPipelineIds: prev.collector.selectedPipelineIds.filter(id => id != pipelineId)
				}
			}));
		} else {
			setState(prev => ({
				...prev,
				collector: {
					...prev.collector,
					selectedPipelineIds: [...prev.collector.selectedPipelineIds, pipelineId]
				}
			}));
		}
	};
	const onTriggerCollectorPipeline = async () => {
		if (!state.collector.startTime) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please input start time.</AlertLabel>);
			return;
		}
		if (!state.collector.endTime) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please input end time.</AlertLabel>);
			return;
		}
		if (!state.collector.topicId) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please select a topic.</AlertLabel>);
			return;
		}
		if (state.collector.selectedPipelineIds.length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please select at least one pipeline.</AlertLabel>);
			return;
		}

		try {
			const selectedTopic = topics.find(t => t.topicId === state.collector.topicId);
			await triggerCollectorPipeline({
				startTime: state.collector.startTime,
				endTime: state.collector.endTime,
				tableName: selectedTopic?.name || '',
				pipelineId: state.collector.selectedPipelineIds[0]
			});
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Pipeline triggered successfully.</AlertLabel>);
		} catch (e) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Failed to trigger pipeline.</AlertLabel>);
		}
	};
	// const onThreadsChange = (event: ChangeEvent<HTMLInputElement>) => {
	// 	if (runningState.running !== RunningStatus.WAIT) {
	// 		return;
	// 	}
	//
	// 	const {value} = event.target;
	// 	setState(({trigger, rowCount}) => {
	// 		return {trigger, rowCount, threads: value} as unknown as State;
	// 	});
	// };
	// const onRunClicked = async () => {
	// 	if (runningState.running !== RunningStatus.WAIT) {
	// 		return;
	// 	}
	//
	// 	const threads = state.threads;
	// 	if (isXaNumber(threads, false)) {
	// 		if (`${threads}`.indexOf('.') !== -1) {
	// 			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
	// 				Please identify threads count first, it should be a positive integral number.
	// 			</AlertLabel>, () => threadsInputRef.current?.focus());
	// 			return;
	// 		}
	// 	} else {
	// 		fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
	// 			Please identify threads count first, it should be a positive integral number.
	// 		</AlertLabel>, () => threadsInputRef.current?.focus());
	// 		return;
	// 	}
	// 	const threadCount = parseInt(`${threads}`);
	// 	if (threadCount === 0) {
	// 		fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
	// 			Please identify threads count first, it should be a positive integral number.
	// 		</AlertLabel>, () => threadsInputRef.current?.focus());
	// 		return;
	// 	}
	//
	// 	setRunningState(state => ({...state, running: RunningStatus.ING}));
	// 	const dataIds = await fetchDataIds();
	// 	const runnable = dataIds.map(dataId => {
	// 		return state.trigger.pipelineIds.map(pipelineId => {
	// 			return {
	// 				topicId: state.trigger.topicId,
	// 				pipelineId: pipelineId,
	// 				dataId: dataId
	// 			};
	// 		});
	// 	}).flat();
	// 	setRunningState(state => ({...state, running: RunningStatus.ING, total: runnable.length}));
	//
	// 	let successCount = 0;
	// 	let failedCount = 0;
	// 	let totalCount = runnable.length;
	// 	const fire = () => {
	// 		if (runnable.length === 0) {
	// 			if (successCount + failedCount === totalCount) {
	// 				setRunningState(state => ({...state, running: RunningStatus.STOPPED}));
	// 			}
	// 			return;
	// 		}
	// 		const {topicId, pipelineId, dataId} = runnable.shift()!;
	//
	// 		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
	// 			return await rerunTopic(topicId!, pipelineId, dataId);
	// 		}, () => {
	// 			successCount++;
	// 			setRunningState(state => {
	// 				return {
	// 					running: RunningStatus.ING,
	// 					total: state.total,
	// 					success: state.success + 1,
	// 					failed: state.failed
	// 				};
	// 			});
	// 			fire();
	// 		}, () => {
	// 			failedCount++;
	// 			setRunningState(state => {
	// 				return {
	// 					running: RunningStatus.ING,
	// 					total: state.total,
	// 					success: state.success,
	// 					failed: [...state.failed, {dataId, pipelineId}]
	// 				};
	// 			});
	// 			fire();
	// 		}, true);
	// 	};
	// 	new Array(threadCount).fill(1).forEach(() => fire());
	// };
	const onDownloadFailedClicked = () => {
		const content = JSON.stringify({
			url: `${getServiceHost()}topic/data/rerun?topic_id=${topic?.topicId ?? ''}&data_id=:dataId&pipeline_id=:pipelineId`,
			data: runningState.failed.map(({pipelineId, dataId}) => {
				return {
					topicId: state.trigger.topicId,
					pipelineId: pipelineId,
					dataId: dataId
				};
			})
		});
		const link = document.createElement('a');
		link.href = 'data:application/json;charset=utf-8,' + encodeURI(content);
		link.target = '_blank';
		link.download = `failed-topic[${topic?.name ?? ''}]-trigger-${dayjs().format('YYYYMMDDHHmmss')}.json`;
		link.click();
	};

	const collectorOptions = topics.map(topic => {
		return {
			value: topic.topicId,
			label: topic.name || 'Noname Topic'
		};
	}).sort((p1, p2) => {
		return (p1.label.toLowerCase()).localeCompare(p2.label.toLowerCase());
	});

	const options = collectorOptions;

	// eslint-disable-next-line
	const collectorTopic = state.collector.topicId == null ? null : topics.find(topic => topic.topicId == state.collector.topicId);
	const collectorAvailablePipelines = pipelines
		// eslint-disable-next-line
		.filter(pipeline => pipeline.topicId == state.collector.topicId)
		.sort((p1, p2) => {
			return (p1.name || '').toLowerCase().localeCompare((p2.name || '').toLowerCase());
		});

	// eslint-disable-next-line
	const topic = state.trigger.topicId == null ? null : topics.find(topic => topic.topicId == state.trigger.topicId);
	const availablePipelines = pipelines
		// eslint-disable-next-line
		.filter(pipeline => pipeline.topicId == state.trigger.topicId)
		.sort((p1, p2) => {
			return (p1.name || '').toLowerCase().localeCompare((p2.name || '').toLowerCase());
		});

	return <TriggerContainer>
		{PAGE_CONFIG.showLegacyTopicTrigger
			? <>
				<TriggerLabel>Pick a topic</TriggerLabel>
				<TopicDropdown value={state.trigger.topicId ?? null} options={options} onChange={onChange}
				               please="To trigger pipelines"/>
				{topic != null
					? <>
						<TriggerLabel>Pipelines</TriggerLabel>
						{availablePipelines.length === 0
							? <TriggerText>No available pipelines.</TriggerText>
							: <TriggerPipelinesContainer>
								{availablePipelines.map(pipeline => {
									return <TriggerPipeline key={pipeline.pipelineId}
									                        selected={state.trigger.pipelineIds?.includes(pipeline.pipelineId) ?? false}
									                        onClick={onPipelineClicked(pipeline.pipelineId)}>
										{pipeline.name || 'Noname Pipeline'}
									</TriggerPipeline>;
								})
								}
							</TriggerPipelinesContainer>}
						<TriggerLabel>Filter by</TriggerLabel>
						<TriggerFilterContainer>
							<TopFilterEdit topic={topic} filter={state.trigger as TriggerTopicFilter}/>
						</TriggerFilterContainer>
					</>
					: null}
				<span/>
				<TriggerButton ink={runningState.running !== RunningStatus.WAIT ? ButtonInk.WAIVE : ButtonInk.PRIMARY}
				               onClick={onFetchRowCountClicked}>
					<span>Fetch Row Count</span>
					{fetchingRowCount ? <FontAwesomeIcon icon={ICON_LOADING} spin={true}/> : null}
				</TriggerButton>
				{state.rowCount != null
					? <>
						<span/>
						<TriggerText>
							{state.rowCount} row(s) found{state.rowCount === 0 ? ', seems no need to run.' : '.'}
						</TriggerText>
						<span/>
						<TriggerButton ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>
							Download Data, Run with CLI
						</TriggerButton>
						{/*{state.rowCount > 1000*/}
						{/*	? <TriggerButton ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>*/}
						{/*		Download Data, Run with CLI*/}
						{/*	</TriggerButton>*/}
						{/*	: <RunInBrowserContainer>*/}
						{/*		<TriggerText>With</TriggerText>*/}
						{/*		<Input value={state.threads} onChange={onThreadsChange} ref={threadsInputRef}/>*/}
						{/*		<TriggerText>Threads</TriggerText>*/}
						{/*		<TriggerButton*/}
						{/*			ink={runningState.running !== RunningStatus.WAIT ? ButtonInk.WAIVE : ButtonInk.PRIMARY}*/}
						{/*			onClick={onRunClicked}>*/}
						{/*			<span>{runningState.running !== RunningStatus.STOPPED ? 'Run in Browser' : 'Triggerred'}</span>*/}
						{/*			{runningState.running === RunningStatus.ING*/}
						{/*				? <FontAwesomeIcon icon={ICON_LOADING} spin={true}/>*/}
						{/*				: null}*/}
						{/*		</TriggerButton>*/}
						{/*		<TriggerText>or</TriggerText>*/}
						{/*		<TriggerButton ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>*/}
						{/*			Download Data, Run with CLI*/}
						{/*		</TriggerButton>*/}
						{/*	</RunInBrowserContainer>}*/}
						{runningState.running === RunningStatus.ING || runningState.running === RunningStatus.STOPPED
							? <>
								<span/>
								<RunInBrowserContainer>
									<TriggerText data-big={true}>
										Pipeline triggered, total <span
										data-ink={ButtonInk.PRIMARY}>{runningState.total}</span>, <span
										data-ink={ButtonInk.SUCCESS}>{runningState.success}</span> successful, <span
										data-ink={ButtonInk.DANGER}>{runningState.failed.length}</span> failed. Check monitor
										logs to more rerun details.
									</TriggerText>
									{runningState.failed.length !== 0 && runningState.running === RunningStatus.STOPPED
										? <TriggerButton ink={ButtonInk.DANGER} onClick={onDownloadFailedClicked}>
											Download Failures
										</TriggerButton>
										: null}
								</RunInBrowserContainer>
							</>
							: null}
					</>
					: null}
			</>
			: null}

		<CollectorTriggerContainer standalone={!PAGE_CONFIG.showLegacyTopicTrigger}>
			<CollectorSectionLabel>Collector Pipeline Trigger</CollectorSectionLabel>
			<span/>
			<TriggerLabel>Start Time</TriggerLabel>
			<CollectorDateTimeInput value={state.collector.startTime}
			                        onChange={onCollectorStartTimeChange}/>
			<TriggerLabel>End Time</TriggerLabel>
			<CollectorDateTimeInput value={state.collector.endTime}
			                        onChange={onCollectorEndTimeChange}/>
			<TriggerLabel>Table Name</TriggerLabel>
			<TopicDropdown value={state.collector.topicId ?? null} options={collectorOptions}
			               onChange={onCollectorTopicClicked} please="Select a topic"/>
			{collectorTopic != null
				? <>
					<TriggerLabel>Pipelines</TriggerLabel>
					{collectorAvailablePipelines.length === 0
						? <TriggerText>No available pipelines.</TriggerText>
						: <TriggerPipelinesContainer>
							{collectorAvailablePipelines.map(pipeline => {
								return <TriggerPipeline key={pipeline.pipelineId}
								                        selected={state.collector.selectedPipelineIds?.includes(pipeline.pipelineId) ?? false}
								                        onClick={onCollectorPipelineClicked(pipeline.pipelineId)}>
									{pipeline.name || 'Noname Pipeline'}
								</TriggerPipeline>;
							})
							}
						</TriggerPipelinesContainer>}
				</>
				: null}
			<span/>
			<TriggerButton ink={ButtonInk.PRIMARY} onClick={onTriggerCollectorPipeline}>
				Trigger Collector Pipeline
			</TriggerButton>
		</CollectorTriggerContainer>
	</TriggerContainer>;
};
