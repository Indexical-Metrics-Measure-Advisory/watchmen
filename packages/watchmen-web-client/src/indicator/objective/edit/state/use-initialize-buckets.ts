import {BucketId} from '@/services/data/tuples/bucket-types';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {useAskBuckets} from '../hooks/use-ask-buckets';
import {askVariableBucketIds} from '../utils';
import {findIndicators} from './utils';

export const useInitializeBuckets = (objective: Objective | null | undefined, shouldStart: boolean) => {
	const {fire} = useObjectivesEventBus();
	const [initialized, setInitialized] = useState(false);

	const askInitialBucketIds = async (objective: Objective): Promise<Array<BucketId>> => {
		const fromVariableBucketIds = askVariableBucketIds(objective);
		const indicators = await findIndicators(objective, (indicatorId: IndicatorId) => {
			return new Promise<Indicator | null>(resolve => {
				fire(ObjectivesEventTypes.ASK_INDICATOR, indicatorId, (indicator?: Indicator) => {
					resolve(indicator ?? null);
				});
			});
		});
		const valueBucketIds = indicators.map(indicator => indicator.valueBuckets || []).flat();

		const map: Record<BucketId, boolean> = {};
		fromVariableBucketIds.forEach(bucketId => map[`${bucketId}`] = true);
		valueBucketIds.forEach(bucketId => map[`${bucketId}`] = true);
		return Object.keys(map);
	};

	useAskBuckets({
		objective,
		shouldStartAsk: () => !initialized && shouldStart,
		detailBucketIds: askInitialBucketIds,
		onLoad: () => setInitialized(true)
	});

	return initialized;
};