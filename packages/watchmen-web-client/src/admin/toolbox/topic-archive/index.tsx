import {Router} from '@/routes/types';
import {Topic} from '@/services/data/tuples/topic-types';
import {isSynonymTopic, isSystemTopic} from '@/services/data/tuples/topic-utils';
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
import {TopicArchiveEventBusProvider} from './topic-archive-event-bus';

export const TopicArchive = () => {
	const navigate = useNavigate();
	const {fire: fireCache} = useAdminCacheEventBus();
	const [data, setData] = useState<{ topics: Array<Topic>, dataSources: AdminCacheData['dataSources'] }>({
		topics: [], dataSources: []
	});
	useEffect(() => {
		const askData = () => {
			fireCache(AdminCacheEventTypes.ASK_DATA_LOADED, (loaded) => {
				if (loaded) {
					fireCache(AdminCacheEventTypes.ASK_DATA, (data?: AdminCacheData) => {
						setData({
							topics: (data?.topics || []).filter(topic => {
								// raw topics are archivable, only system and synonym topics are excluded
								return !isSystemTopic(topic) && !isSynonymTopic(topic);
							}),
							dataSources: data?.dataSources || []
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

	return <TopicArchiveEventBusProvider>
		<FixWidthPage>
			<PageHeader title="Topic Archive" onBackClicked={onBackClicked}/>
			<VerticalMarginOneUnit/>
			<Criteria topics={data.topics} dataSources={data.dataSources}/>
			<Results topics={data.topics} dataSources={data.dataSources}/>
			<VerticalMarginOneUnit/>
		</FixWidthPage>
	</TopicArchiveEventBusProvider>;
};
