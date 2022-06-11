import {BucketsData} from './buckets-data';
import {EnumsData} from './enums-data';
import {IndicatorsDataProxy} from './indicators-data-proxy';
import {InspectionsDataProxy} from './inspections-data-proxy';

export const InspectionStateHolder = () => {
	return <>
		<IndicatorsDataProxy/>
		<BucketsData/>
		<EnumsData/>
		<InspectionsDataProxy/>
	</>;
};