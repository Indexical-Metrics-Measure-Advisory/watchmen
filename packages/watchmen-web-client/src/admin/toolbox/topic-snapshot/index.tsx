import {Router} from '@/routes/types';
import {Topic} from '@/services/data/tuples/topic-types';
import {isRawTopic, isSynonymTopic, isSystemTopic} from '@/services/data/tuples/topic-utils';
import {AdminCacheData} from '@/services/local-persist/types';
import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAdminCacheEventBus} from '../../cache/cache-event-bus';
import {AdminCacheEventTypes} from '../../cache/cache-event-bus-types';
import {Criteria} from './criteria';
import {Results} from './results';
import {TopicSnapshotEventBusProvider} from './topic-snapshot-event-bus';

export const TopicSnapshot = () => {
	const navigate = useNavigate();
	const {fire: fireCache} = useAdminCacheEventBus();
	const [data, setData] = useState<{ topics: Array<Topic> }>({topics: []});
	useEffect(() => {
		const askData = () => {
			fireCache(AdminCacheEventTypes.ASK_DATA_LOADED, (loaded) => {
				if (loaded) {
					fireCache(AdminCacheEventTypes.ASK_DATA, (data?: AdminCacheData) => {
						setData({
							topics: (data?.topics || []).filter(topic => {
								return !isRawTopic(topic) && !isSystemTopic(topic) && !isSynonymTopic(topic);
							})
						});
					});
				} else {
					setTimeout(() => askData(), 100);
				}
			});
		};
		askData();
	}, [fireCache]);

	const onBackClicked = () => navigate(Router.ADMIN_TOOLBOX);

	return <TopicSnapshotEventBusProvider>
		<FixWidthPage>
			<PageHeader title="Topic Snapshot" onBackClicked={onBackClicked}/>
			<VerticalMarginOneUnit/>
			<Criteria topics={data.topics}/>
			<Results topics={data.topics}/>
			<VerticalMarginOneUnit/>
		</FixWidthPage>
	</TopicSnapshotEventBusProvider>;
};