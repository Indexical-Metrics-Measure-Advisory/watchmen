import {BucketsData} from './buckets-data';
import {EnumsDataProxy} from './enums-data-proxy';
import {IndicatorsDataProxy} from './indicators-data-proxy';
import {InspectionsDataProxy} from './inspections-data-proxy';

export const InspectionStateHolder = () => {
	return <>
		<IndicatorsDataProxy/>
		<BucketsData/>
		<EnumsDataProxy/>
		<InspectionsDataProxy/>
	</>;
};