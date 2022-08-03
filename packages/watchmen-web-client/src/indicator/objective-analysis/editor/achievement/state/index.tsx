import {IndicatorsDataProxy} from './indicators-data-proxy';
import {MeasureBucketsDataProxy} from './measure-buckets-data-proxy';
import {PluginsDataProxy} from './plugins-data-proxy';
import {AchievementState} from './state';
import {TopicsDataProxy} from './topics-data-proxy';
import {ValueBucketsDataProxy} from './value-buckets-data-proxy';

export const AchievementStateHolder = () => {
	return <>
		<TopicsDataProxy/>
		<ValueBucketsDataProxy/>
		<MeasureBucketsDataProxy/>
		<IndicatorsDataProxy/>
		<PluginsDataProxy/>
		<AchievementState/>
	</>;
};