import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {Pipeline, PipelineId} from '@/services/data/tuples/pipeline-types';
import {fetchTopicDataIds, fetchTopicRowCount} from '@/services/data/tuples/topic';
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
	TopicDropdown,
	TriggerButton,
	TriggerContainer,
	TriggerFilterContainer,
	TriggerLabel,
	TriggerPipeline,
	TriggerPipelinesContainer,
	TriggerText
} from './widgets';

interface State {
	trigger: Omit<TriggerTopicFilter, 'topicId'> & { topicId?: TopicId };
	rowCount?: number;
}

export const TriggerDef = (props: { topics: Array<Topic>, pipelines: Array<Pipeline> }) => {
	const {topics, pipelines} = props;

	const {fire: fireGlobal} = useEventBus();
	const [state, setState] = useState<State>({
		trigger: {
			joint: {
				jointType: ParameterJointType.AND,
				filters: []
			},
			pipelineIds: []
		}
	});
	const [fetchingRowCount, setFetchingRowCount] = useState(false);

	const onChange = (option: DropdownOption) => {
		setState(state => {
			return {
				trigger: {
					...state.trigger,
					topicId: option.value as TopicId
				}
			};
		});
	};
	const onPipelineClicked = (pipelineId: PipelineId) => () => {
		if (state.trigger.pipelineIds.includes(pipelineId)) {
			setState(({trigger, rowCount}) => {
				return {
					trigger: {
						...trigger,
						// eslint-disable-next-line
						pipelineIds: (trigger.pipelineIds || []).filter(selected => selected != pipelineId)
					},
					rowCount
				};
			});
		} else {
			setState(({trigger, rowCount}) => {
				return {
					trigger: {
						...trigger,
						// eslint-disable-next-line
						pipelineIds: [...(trigger.pipelineIds || []), pipelineId]
					},
					rowCount
				};
			});
		}
	};
	const onFetchRowCountClicked = () => {
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
			setState(({trigger}) => ({trigger, rowCount}));
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
	const onRunClicked = async () => {
		const dataIds = await fetchDataIds();
	};

	const options = topics.map(topic => {
		return {
			value: topic.topicId,
			label: topic.name || 'Noname Topic'
		};
	});

	// eslint-disable-next-line
	const topic = state.trigger.topicId == null ? null : topics.find(topic => topic.topicId == state.trigger.topicId);
	const availablePipelines = pipelines
		// eslint-disable-next-line
		.filter(pipeline => pipeline.topicId == state.trigger.topicId)
		.sort((p1, p2) => {
			return (p1.name || '').localeCompare(p2.name || '');
		});

	return <TriggerContainer>
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
		<TriggerButton ink={ButtonInk.PRIMARY} onClick={onFetchRowCountClicked}>
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
				{state.rowCount > 1000
					? <TriggerButton ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>
						Download Data, Run with CLI
					</TriggerButton>
					: <TriggerButton ink={ButtonInk.PRIMARY} onClick={onRunClicked}>
						Run in Browser
					</TriggerButton>}
			</>
			: null}
	</TriggerContainer>;
};