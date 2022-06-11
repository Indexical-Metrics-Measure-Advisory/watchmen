import {IndicatorsDataProxy} from './indicators-data-proxy';
import {MeasureBucketsData} from './measure-buckets-data';
import {AchievementState} from './state';
import {TopicsDataProxy} from './topics-data-proxy';
import {ValueBucketsData} from './value-buckets-data';

export const AchievementStateHolder = () => {
	return <>
		<TopicsDataProxy/>
		<ValueBucketsData/>
		<MeasureBucketsData/>
		<IndicatorsDataProxy/>
		<AchievementState/>
	</>;
};