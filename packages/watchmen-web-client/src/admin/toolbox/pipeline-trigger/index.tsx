import {Router} from '@/routes/types';
import {Pipeline} from '@/services/data/tuples/pipeline-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {isSynonymTopic} from '@/services/data/tuples/topic-utils';
import {AdminCacheData} from '@/services/local-persist/types';
import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAdminCacheEventBus} from '../../cache/cache-event-bus';
import {AdminCacheEventTypes} from '../../cache/cache-event-bus-types';
import {Trigger} from './trigger';

export const PipelineTrigger = () => {
	const navigate = useNavigate();
	const {fire: fireCache} = useAdminCacheEventBus();
	const [data, setData] = useState<{ topics: Array<Topic>, pipelines: Array<Pipeline> }>({topics: [], pipelines: []});
	useEffect(() => {
		const askData = () => {
			fireCache(AdminCacheEventTypes.ASK_DATA_LOADED, (loaded) => {
				if (loaded) {
					fireCache(AdminCacheEventTypes.ASK_DATA, (data?: AdminCacheData) => {
						setData({
							topics: (data?.topics || []).filter(topic => !isSynonymTopic(topic)),
							pipelines: data?.pipelines || []
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

	return <FixWidthPage>
		<PageHeader title="Pipeline Trigger" onBackClicked={onBackClicked}/>
		<VerticalMarginOneUnit/>
		<Trigger topics={data.topics} pipelines={data.pipelines}/>
	</FixWidthPage>;
};