import {AchievementsData} from './achievements-data';
import {EnumsData} from './enums-data';
import {IndicatorsData} from './indicators-data';
import {InspectionsData} from './inspections-data';
import {MeasureBucketsData} from './measure-buckets-data';
import {PluginsData} from './plugins-data';
import {QueryBucketsData} from './query-buckets-data';
import {TopicsData} from './topics-data';
import {ValueBucketsData} from './value-buckets-data';

export const DataHolder = () => {
	return <>
		<EnumsData/>
		<TopicsData/>
		<QueryBucketsData/>
		<MeasureBucketsData/>
		<ValueBucketsData/>
		<IndicatorsData/>
		<AchievementsData/>
		<InspectionsData/>
		<PluginsData/>
	</>;
};