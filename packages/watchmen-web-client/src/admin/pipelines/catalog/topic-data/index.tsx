import {fetchTopicData} from '@/services/data/tuples/topic';
import {Topic} from '@/services/data/tuples/topic-types';
import {ICON_CLOSE} from '@/widgets/basic/constants';
import {Grid} from '@/widgets/dataset-grid';
import {DEFAULT_COLUMN_WIDTH} from '@/widgets/dataset-grid/constants';
import {GridEventBusProvider, useGridEventBus} from '@/widgets/dataset-grid/grid-event-bus';
import {GridEventTypes} from '@/widgets/dataset-grid/grid-event-bus-types';
import {ColumnDefs, ColumnSortBy, DataPage} from '@/widgets/dataset-grid/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useCallback, useEffect, useState} from 'react';
import {useCatalogEventBus} from '../catalog-event-bus';
import {CatalogEventTypes} from '../catalog-event-bus-types';
import {
	CloseButton,
	TopicDataBackdrop,
	TopicDataContainer,
	TopicDataHeader,
	TopicDataTitle
} from './widgets';

const TopicDataGrid = (props: { topic: Topic }) => {
	const {topic} = props;
	const {fire} = useGridEventBus();
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);

	const loadData = useCallback(async (pageNumber: number, pageSize: number) => {
		setLoading(true);
		try {
			const page = await fetchTopicData(topic.topicId, pageNumber, pageSize);
			// @ts-ignore
			if (!page) {
				// failed
				return;
			}
			const columnDefs: ColumnDefs = {
				fixed: [],
				data: topic.factors.map((f, index) => {
					return {
						name: f.name,
						sort: ColumnSortBy.NONE,
						width: DEFAULT_COLUMN_WIDTH,
						fixed: false,
						index: index
					};
				})
			};
			const data = page.data.map((row) => {
				return topic.factors.map((f) => {
					// @ts-ignore
					return row[f.name];
				});
			});
			const dataPage: DataPage = {
				itemCount: page.itemCount,
				pageNumber: page.pageNumber,
				pageSize: page.pageSize,
				pageCount: page.pageCount,
				data
			};

			fire(GridEventTypes.DATA_LOADED, dataPage, columnDefs);
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	}, [topic, fire]);

	useEffect(() => {
		loadData(1, 100);
	}, [loadData]);

	return <Grid hasColumns={true} pageable={true} onPageChange={(pageNumber) => loadData(pageNumber, 100)}/>;
};

export const TopicDataViewer = () => {
	const {on, off} = useCatalogEventBus();
	const [topic, setTopic] = useState<Topic | null>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const onShowTopicData = (topic: Topic) => {
			setTopic(topic);
			setVisible(true);
		};
		on(CatalogEventTypes.SHOW_TOPIC_DATA, onShowTopicData);
		return () => {
			off(CatalogEventTypes.SHOW_TOPIC_DATA, onShowTopicData);
		};
	}, [on, off]);

	useEffect(() => {
		if (!visible) {
			return;
		}
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setVisible(false);
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [visible]);

	if (!visible || !topic) {
		return null;
	}

	return <>
		<TopicDataBackdrop onClick={() => setVisible(false)}/>
		<TopicDataContainer>
			<TopicDataHeader>
				<TopicDataTitle>Data of {topic.name}</TopicDataTitle>
				<CloseButton onClick={() => setVisible(false)}>
					<FontAwesomeIcon icon={ICON_CLOSE}/>
				</CloseButton>
			</TopicDataHeader>
			<GridEventBusProvider>
				<TopicDataGrid topic={topic}/>
			</GridEventBusProvider>
		</TopicDataContainer>
	</>;
};
