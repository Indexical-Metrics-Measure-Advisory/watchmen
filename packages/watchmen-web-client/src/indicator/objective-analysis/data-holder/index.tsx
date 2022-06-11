import {AchievementsData} from './achievements-data';
import {BucketsData} from './buckets-data';
import {EnumsData} from './enums-data';
import {IndicatorsData} from './indicators-data';
import {InspectionsData} from './inspections-data';
import {TopicsData} from './topics-data';

export const DataHolder = () => {
	return <>
		<EnumsData/>
		<TopicsData/>
		<BucketsData/>
		<IndicatorsData/>
		<AchievementsData/>
		<InspectionsData/>
	</>;
};