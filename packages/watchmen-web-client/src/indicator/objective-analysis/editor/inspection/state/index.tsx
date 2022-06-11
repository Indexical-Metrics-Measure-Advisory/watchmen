import {BucketsData} from './buckets-data';
import {EnumsData} from './enums-data';
import {IndicatorsDataProxy} from './indicators-data-proxy';
import {InspectionsData} from './inspections-data';

export const InspectionStateHolder = () => {
	return <>
		<IndicatorsDataProxy/>
		<BucketsData/>
		<EnumsData/>
		<InspectionsData/>
	</>;
};