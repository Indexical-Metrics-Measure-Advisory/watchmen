import {fetchTopicArchivePolicies} from '@/services/data/admin/topic-archive';
import {TopicArchivePolicy} from '@/services/data/tuples/topic-archive-types';
import {DataSource} from '@/services/data/tuples/data-source-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {Page} from '@/services/data/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {
	TupleSearchListPagination,
	TupleSearchListPaginationButton,
	TupleSearchListPaginationPointer
} from '@/widgets/tuple-workbench/tuple-search/widgets';
import React, {useEffect, useState} from 'react';
import {PolicyRow} from './policy-row';
import {useTopicArchiveEventBus} from './topic-archive-event-bus';
import {TopicArchiveEventTypes} from './topic-archive-event-bus-types';
import {TopicArchiveCriteria} from './types';
import {ResultContainer, ResultHeader, ResultHeaderCell, ResultNoData} from './widgets';

export const Results = (props: { topics: Array<Topic>, dataSources: Array<DataSource> }) => {
	const {topics, dataSources} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire, on, off} = useTopicArchiveEventBus();
	const [criteria, setCriteria] = useState<TopicArchiveCriteria>({});
	const [page, setPage] = useState<Page<TopicArchivePolicy>>({
		data: [],
		pageNumber: 1,
		pageSize: 10,
		itemCount: 0,
		pageCount: 1
	});
	useEffect(() => {
		const onSearched = (criteria: TopicArchiveCriteria, page: Page<TopicArchivePolicy>) => {
			setPage(page);
			setCriteria(criteria);
		};
		on(TopicArchiveEventTypes.SEARCHED, onSearched);
		return () => {
			off(TopicArchiveEventTypes.SEARCHED, onSearched);
		};
	}, [on, off]);

	const onPreviousPageClicked = () => {
		const {pageNumber} = page;
		if (pageNumber > 1) {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				setCriteria(criteria => ({...criteria, pageNumber: pageNumber - 1}));
				return await fetchTopicArchivePolicies(criteria.topicId, pageNumber - 1, criteria.pageSize);
			}, (policies: Page<TopicArchivePolicy>) => {
				fire(TopicArchiveEventTypes.SEARCHED, criteria, policies);
			});
		}
	};
	const onNextPageClicked = () => {
		const {pageNumber, pageCount} = page;
		if (pageNumber < pageCount) {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				setCriteria(criteria => ({...criteria, pageNumber: pageNumber + 1}));
				return await fetchTopicArchivePolicies(criteria.topicId, pageNumber + 1, criteria.pageSize);
			}, (policies: Page<TopicArchivePolicy>) => {
				fire(TopicArchiveEventTypes.SEARCHED, criteria, policies);
			});
		}
	};

	const hasPreviousPage = page.pageNumber !== 1;
	const hasNextPage = page!.pageNumber < page!.pageCount;

	const onPolicyChanged = async () => {
		await new Promise<void>(resolve => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				return await fetchTopicArchivePolicies(criteria.topicId, page.pageNumber, page.pageSize);
			}, (policies: Page<TopicArchivePolicy>) => {
				fire(TopicArchiveEventTypes.SEARCHED, criteria, policies);
				resolve();
			}, () => resolve());
		});
	};

	return <ResultContainer>
		<ResultHeader>
			<ResultHeaderCell/>
			<ResultHeaderCell>Topic</ResultHeaderCell>
			<ResultHeaderCell>Hot Days</ResultHeaderCell>
			<ResultHeaderCell>Batch Size</ResultHeaderCell>
			<ResultHeaderCell>Enabled?</ResultHeaderCell>
			<ResultHeaderCell/>
		</ResultHeader>
		{page.data.length === 0
			? <ResultNoData>No archive policy.</ResultNoData>
			: <>
				{page.data.map((policy, index) => {
					return <PolicyRow policy={policy} topics={topics} dataSources={dataSources}
					                  onChanged={onPolicyChanged}
					                  index={(page.pageNumber - 1) * page.pageSize + index + 1}
					                  key={policy.policyId}/>;
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
