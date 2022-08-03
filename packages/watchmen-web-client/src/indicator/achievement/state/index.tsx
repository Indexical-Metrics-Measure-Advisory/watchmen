import {IndicatorsData} from './indicators-data';
import {MeasureBucketsData} from './measure-buckets-data';
import {PluginsData} from './plugins-data';
import {AchievementState} from './state';
import {TopicsData} from './topics-data';
import {ValueBucketsData} from './value-buckets-data';

export const AchievementStateHolder = () => {
	return <>
		<TopicsData/>
		<ValueBucketsData/>
		<MeasureBucketsData/>
		<IndicatorsData/>
		<PluginsData/>
		<AchievementState/>
	</>;
};