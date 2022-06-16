import {BucketsData} from './buckets-data';
import {EnumsData} from './enums-data';
import {IndicatorsData} from './indicators-data';
import {InspectionsData} from './inspections-data';

export const InspectionStateHolder = () => {
	return <>
		<IndicatorsData/>
		<BucketsData/>
		<EnumsData/>
		<InspectionsData/>
	</>;
};