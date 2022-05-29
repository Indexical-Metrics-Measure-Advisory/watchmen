import {TopicSnapshotScheduler} from '@/services/data/admin/topic-snapshot-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {Page} from '@/services/data/types';
import {useEffect, useState} from 'react';
import {useTopicSnapshotEventBus} from './topic-snapshot-event-bus';
import {TopicSnapshotEventTypes} from './topic-snapshot-event-bus-types';
import {ResultBodyCell, ResultBodyRow, ResultContainer, ResultHeader, ResultHeaderCell, ResultNoData} from './widgets';

export const Results = (props: { topics: Array<Topic> }) => {
	const {topics} = props;

	const {on, off} = useTopicSnapshotEventBus();
	const [page, setPage] = useState<Page<TopicSnapshotScheduler>>({
		data: [],
		pageNumber: 1,
		pageSize: 10,
		itemCount: 0,
		pageCount: 1
	});
	useEffect(() => {
		const onSearched = (page: Page<TopicSnapshotScheduler>) => {
			setPage(page);
		};
		on(TopicSnapshotEventTypes.SEARCHED, onSearched);
		return () => {
			off(TopicSnapshotEventTypes.SEARCHED, onSearched);
		};
	}, [on, off]);

	return <ResultContainer>
		<ResultHeader>
			<ResultHeaderCell/>
			<ResultHeaderCell>Topic</ResultHeaderCell>
			<ResultHeaderCell>Frequency</ResultHeaderCell>
			<ResultHeaderCell/>
		</ResultHeader>
		{page.data.length === 0
			? <ResultNoData>No scheduler.</ResultNoData>
			: page.data.map(({schedulerId, topicId, frequency, condition}, index) => {
				// eslint-disable-next-line
				const topic = topics.find(topic => topic.topicId == topicId);
				const topicName = topic?.name || 'Noname Topic';
				return <ResultBodyRow key={schedulerId}>
					<ResultBodyCell>{(page.pageNumber - 1) * page.pageSize + index + 1}</ResultBodyCell>
					<ResultBodyCell>{topicName}</ResultBodyCell>
					<ResultBodyCell>{frequency}</ResultBodyCell>
					<ResultBodyCell></ResultBodyCell>
				</ResultBodyRow>;
			})}
	</ResultContainer>;
};