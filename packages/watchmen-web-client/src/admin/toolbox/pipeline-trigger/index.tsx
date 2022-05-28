import {Pipeline} from '@/services/data/tuples/pipeline-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AdminCacheData} from '@/services/local-persist/types';
import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import React, {useEffect, useState} from 'react';
import {useAdminCacheEventBus} from '../../cache/cache-event-bus';
import {AdminCacheEventTypes} from '../../cache/cache-event-bus-types';
import {TriggerDef} from './trigger-def';

export const PipelineTrigger = () => {
	const {fire: fireCache} = useAdminCacheEventBus();
	const [data, setData] = useState<{ topics: Array<Topic>, pipelines: Array<Pipeline> }>({topics: [], pipelines: []});
	useEffect(() => {
		const askData = () => {
			fireCache(AdminCacheEventTypes.ASK_DATA_LOADED, (loaded) => {
				if (loaded) {
					fireCache(AdminCacheEventTypes.ASK_DATA, (data?: AdminCacheData) => {
						setData({
							topics: data?.topics || [],
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

	return <FixWidthPage>
		<PageHeader title="Pipeline Trigger"/>
		<VerticalMarginOneUnit/>
		<TriggerDef topics={data.topics} pipelines={data.pipelines}/>
	</FixWidthPage>;
};