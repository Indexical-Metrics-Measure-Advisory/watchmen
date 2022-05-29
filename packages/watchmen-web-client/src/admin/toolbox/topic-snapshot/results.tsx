import {TopicSnapshotCriteria} from '@/admin/toolbox/topic-snapshot/types';
import {fetchTopicSnapshotSchedulers} from '@/services/data/admin/topic-snapshot';
import {TopicSnapshotScheduler} from '@/services/data/admin/topic-snapshot-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {Page} from '@/services/data/types';
import {DwarfButton} from '@/widgets/basic/button';
import {ICON_EDIT} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {
	TupleSearchListPagination,
	TupleSearchListPaginationButton,
	TupleSearchListPaginationPointer
} from '@/widgets/tuple-workbench/tuple-search/widgets';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import {useTopicSnapshotEventBus} from './topic-snapshot-event-bus';
import {TopicSnapshotEventTypes} from './topic-snapshot-event-bus-types';
import {ResultBodyCell, ResultBodyRow, ResultContainer, ResultHeader, ResultHeaderCell, ResultNoData} from './widgets';

export const Results = (props: { topics: Array<Topic> }) => {
	const {topics} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire, on, off} = useTopicSnapshotEventBus();
	const [criteria, setCriteria] = useState<TopicSnapshotCriteria>({frequency: []});
	const [page, setPage] = useState<Page<TopicSnapshotScheduler>>({
		data: [],
		pageNumber: 1,
		pageSize: 10,
		itemCount: 0,
		pageCount: 1
	});
	useEffect(() => {
		const onSearched = (criteria: TopicSnapshotCriteria, page: Page<TopicSnapshotScheduler>) => {
			setPage(page);
			setCriteria(criteria);
		};
		on(TopicSnapshotEventTypes.SEARCHED, onSearched);
		return () => {
			off(TopicSnapshotEventTypes.SEARCHED, onSearched);
		};
	}, [on, off]);

	const onEditClicked = (scheduler: TopicSnapshotScheduler) => () => {
		// TODO
	};
	const onPreviousPageClicked = () => {
		const {pageNumber} = page;
		if (pageNumber > 1) {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				setCriteria(criteria => ({...criteria, pageNumber: pageNumber - 1}));
				return await fetchTopicSnapshotSchedulers(criteria.topicId, criteria.frequency, pageNumber - 1, criteria.pageSize);
			}, (schedulers: Page<TopicSnapshotScheduler>) => {
				fire(TopicSnapshotEventTypes.SEARCHED, criteria, schedulers);
			});
		}
	};
	const onNextPageClicked = () => {
		const {pageNumber, pageCount} = page;
		if (pageNumber < pageCount) {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				setCriteria(criteria => ({...criteria, pageNumber: pageNumber + 1}));
				return await fetchTopicSnapshotSchedulers(criteria.topicId, criteria.frequency, pageNumber + 1, criteria.pageSize);
			}, (schedulers: Page<TopicSnapshotScheduler>) => {
				fire(TopicSnapshotEventTypes.SEARCHED, criteria, schedulers);
			});
		}
	};

	const hasPreviousPage = page.pageNumber !== 1;
	const hasNextPage = page!.pageNumber < page!.pageCount;

	return <ResultContainer>
		<ResultHeader>
			<ResultHeaderCell/>
			<ResultHeaderCell>Topic</ResultHeaderCell>
			<ResultHeaderCell>Frequency</ResultHeaderCell>
			<ResultHeaderCell/>
		</ResultHeader>
		{page.data.length === 0
			? <ResultNoData>No scheduler.</ResultNoData>
			: <>
				{page.data.map((scheduler, index) => {
					const {schedulerId, topicId, frequency} = scheduler;
					// eslint-disable-next-line
					const topic = topics.find(topic => topic.topicId == topicId);
					const topicName = topic?.name || 'Noname Topic';
					return <ResultBodyRow key={schedulerId}>
						<ResultBodyCell>{(page.pageNumber - 1) * page.pageSize + index + 1}</ResultBodyCell>
						<ResultBodyCell>{topicName}</ResultBodyCell>
						<ResultBodyCell>{frequency}</ResultBodyCell>
						<ResultBodyCell>
							<DwarfButton onClick={onEditClicked(scheduler)}>
								<FontAwesomeIcon icon={ICON_EDIT}/>
							</DwarfButton>
						</ResultBodyCell>
					</ResultBodyRow>;
				})}
				<TupleSearchListPagination>
					<TupleSearchListPaginationButton visible={hasPreviousPage} onClick={onPreviousPageClicked}>
						Previous Page
					</TupleSearchListPaginationButton>
					<TupleSearchListPaginationPointer>
						#{page!.pageNumber} of {page!.pageCount} Pages
					</TupleSearchListPaginationPointer>
					<TupleSearchListPaginationButton visible={hasNextPage} onClick={onNextPageClicked}>
						Next Page
					</TupleSearchListPaginationButton>
				</TupleSearchListPagination>
			</>
		}
	</ResultContainer>;
};