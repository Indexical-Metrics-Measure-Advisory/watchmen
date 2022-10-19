import {BucketsDataProxy} from './buckets-data-proxy';
import {EnumsDataProxy} from './enums-data-proxy';
import {IndicatorsDataProxy} from './indicators-data-proxy';
import {InspectionsDataProxy} from './inspections-data-proxy';

export const InspectionStateHolder = () => {
	return <>
		<IndicatorsDataProxy/>
		<BucketsDataProxy/>
		<EnumsDataProxy/>
		<InspectionsDataProxy/>
	</>;
};