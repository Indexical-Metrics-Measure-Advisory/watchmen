import {isMultipleDataSourcesEnabled} from '@/feature-switch';
import {QueryDataSourceForHolder} from '@/services/data/tuples/query-data-source-types';
import {QueryEnumForHolder} from '@/services/data/tuples/query-enum-types';
import {DataSourceType} from '@/services/data/tuples/data-source-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import {useEffect, useMemo} from 'react';
import {Factors} from './factors';
import {useTopicEventBus, TopicEventBusProvider} from './topic-event-bus';
import {TopicEventTypes} from './topic-event-bus-types';
import {TopicDataSourceInput} from './topic/topic-data-source-input';
import {TopicDynamoIndexesInput} from './topic/topic-dynamo-indexes-input';
import {TopicDescriptionInput} from './topic/topic-description-input';
import {TopicKindInput} from './topic/topic-kind-input';
import {TopicNameInput} from './topic/topic-name-input';
import {TopicTypeInput} from './topic/topic-type-input';
import {HoldByTopic} from './types';

const TopicEditorBody = (props: {
	topic: Topic,
	enums: Array<QueryEnumForHolder>,
	dataSources: Array<QueryDataSourceForHolder>
}) => {
	const {topic, enums, dataSources} = props;
	const {on, off} = useTopicEventBus();
	const forceUpdate = useForceUpdate();

	useEffect(() => {
		on(TopicEventTypes.TOPIC_DATA_SOURCE_CHANGED, forceUpdate);
		on(TopicEventTypes.TOPIC_STORAGE_CHANGED, forceUpdate);
		on(TopicEventTypes.FACTOR_ADDED, forceUpdate);
		on(TopicEventTypes.FACTOR_REMOVED, forceUpdate);
		on(TopicEventTypes.FACTORS_IMPORTED, forceUpdate);
		on(TopicEventTypes.FACTOR_NAME_CHANGED, forceUpdate);
		return () => {
			off(TopicEventTypes.TOPIC_DATA_SOURCE_CHANGED, forceUpdate);
			off(TopicEventTypes.TOPIC_STORAGE_CHANGED, forceUpdate);
			off(TopicEventTypes.FACTOR_ADDED, forceUpdate);
			off(TopicEventTypes.FACTOR_REMOVED, forceUpdate);
			off(TopicEventTypes.FACTORS_IMPORTED, forceUpdate);
			off(TopicEventTypes.FACTOR_NAME_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	const dataSourceType = useMemo(() => {
		if (!topic.dataSourceId) {
			return undefined;
		}
		const dataSource = dataSources.find(ds => ds.dataSourceId === topic.dataSourceId);
		return dataSource?.dataSourceType;
	}, [topic.dataSourceId, dataSources]);

	return <>
		<TuplePropertyLabel>Topic Name:</TuplePropertyLabel>
		<TopicNameInput topic={topic}/>
		<TuplePropertyLabel>Topic Kind:</TuplePropertyLabel>
		<TopicKindInput topic={topic}/>
		<TuplePropertyLabel>Topic Type:</TuplePropertyLabel>
		<TopicTypeInput topic={topic}/>
		{isMultipleDataSourcesEnabled()
			? <>
				<TuplePropertyLabel>Data Source:</TuplePropertyLabel>
				<TopicDataSourceInput topic={topic} dataSources={dataSources}/>
			</>
			: null}
		<TuplePropertyLabel>Description:</TuplePropertyLabel>
		<TopicDescriptionInput topic={topic}/>
		{dataSourceType === DataSourceType.DYNAMODB
			? <>
				<TuplePropertyLabel>Dynamo Indexes:</TuplePropertyLabel>
				<TopicDynamoIndexesInput topic={topic} dataSourceType={dataSourceType}/>
			</>
			: null}
		<TuplePropertyLabel>Factors:</TuplePropertyLabel>
		<Factors topic={topic} enums={enums} dataSourceType={dataSourceType}/>
	</>;
};

const TopicEditor = (props: {
	topic: Topic,
	enums: Array<QueryEnumForHolder>,
	dataSources: Array<QueryDataSourceForHolder>
}) => {
	const {topic, enums, dataSources} = props;

	return <TopicEventBusProvider>
		<TopicEditorBody topic={topic} enums={enums} dataSources={dataSources}/>
	</TopicEventBusProvider>;
};

export const renderEditor = (topic: Topic, codes?: HoldByTopic) => {
	return <TopicEditor topic={topic} enums={codes?.enums || []} dataSources={codes?.dataSources || []}/>;
};
