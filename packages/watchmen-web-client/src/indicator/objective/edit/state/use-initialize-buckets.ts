import {BucketId} from '@/services/data/tuples/bucket-types';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactorOnIndicator} from '@/services/data/tuples/objective-types';
import {isNotBlank} from '@/services/utils';
import {useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {useAskBuckets} from '../hooks/use-ask-buckets';
import {askVariableBucketIds, isIndicatorFactor} from '../utils';

export const useInitializeBuckets = (objective: Objective | null | undefined, indicatorsInitialized: boolean) => {
	const {fire} = useObjectivesEventBus();
	const [initialized, setInitialized] = useState(false);

	const askInitialBucketIds = async (objective: Objective): Promise<Array<BucketId>> => {
		const fromVariableBucketIds = askVariableBucketIds(objective);
		const indicatorIds = (objective.factors || [])
			.filter(f => isIndicatorFactor(f))
			.map(f => (f as ObjectiveFactorOnIndicator).indicatorId)
			.filter(indicatorId => isNotBlank(indicatorId)) as Array<IndicatorId>;
		const indicators = (await Promise.all(indicatorIds.map(indicatorId => {
			return new Promise<Indicator | null>(resolve => {
				fire(ObjectivesEventTypes.ASK_INDICATOR, indicatorId, (indicator?: Indicator) => {
					resolve(indicator ?? null);
				});
			});
		}))).filter(indicator => indicator != null) as Array<Indicator>;
		const valueBucketIds = indicators.map(indicator => indicator.valueBuckets || []).flat();

		const map: Record<BucketId, boolean> = {};
		fromVariableBucketIds.forEach(bucketId => map[`${bucketId}`] = true);
		valueBucketIds.forEach(bucketId => map[`${bucketId}`] = true);
		return Object.keys(map);
	};

	useAskBuckets({
		objective,
		shouldAsk: () => !initialized && indicatorsInitialized,
		detailBucketIds: askInitialBucketIds,
		onLoad: () => setInitialized(true)
	});

	return initialized;
};