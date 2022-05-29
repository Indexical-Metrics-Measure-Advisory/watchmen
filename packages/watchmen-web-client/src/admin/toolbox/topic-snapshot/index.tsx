import {useAdminCacheEventBus} from '@/admin/cache/cache-event-bus';
import {AdminCacheEventTypes} from '@/admin/cache/cache-event-bus-types';
import {Router} from '@/routes/types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AdminCacheData} from '@/services/local-persist/types';
import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import React, {useEffect, useState} from 'react';
import {useHistory} from 'react-router-dom';

export const TopicSnapshot = () => {
	const history = useHistory();
	const {fire: fireCache} = useAdminCacheEventBus();
	const [data, setData] = useState<{ topics: Array<Topic> }>({topics: []});
	useEffect(() => {
		const askData = () => {
			fireCache(AdminCacheEventTypes.ASK_DATA_LOADED, (loaded) => {
				if (loaded) {
					fireCache(AdminCacheEventTypes.ASK_DATA, (data?: AdminCacheData) => {
						setData({
							topics: data?.topics || []
						});
					});
				} else {
					setTimeout(() => askData(), 100);
				}
			});
		};
		askData();
	}, [fireCache]);

	const onBackClicked = () => history.push(Router.ADMIN_TOOLBOX);

	return <FixWidthPage>
		<PageHeader title="Topic Snapshot" onBackClicked={onBackClicked}/>
		<VerticalMarginOneUnit/>
	</FixWidthPage>;

};