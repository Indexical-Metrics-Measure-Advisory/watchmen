import {IndicatorsDataProxy} from './indicators-data-proxy';
import {MeasureBucketsData} from './measure-buckets-data';
import {AchievementState} from './state';
import {TopicsData} from './topics-data';
import {ValueBucketsData} from './value-buckets-data';

export const AchievementStateHolder = () => {
	return <>
		<TopicsData/>
		<ValueBucketsData/>
		<MeasureBucketsData/>
		<IndicatorsDataProxy/>
		<AchievementState/>
	</>;
};