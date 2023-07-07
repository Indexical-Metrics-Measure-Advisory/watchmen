import {EnumForIndicator} from '@/services/data/tuples/query-indicator-types';
import {MeasureColumnItems} from './measure-column-items';
import {MeasureFactorItems} from './measure-factor-items';
import {AvailableMeasureColumn, AvailableMeasureFactor} from './types';

export const MeasureItems = (props: {
	measures: Array<{
		key: string;
		label: string;
		measures: Array<AvailableMeasureFactor> | Array<AvailableMeasureColumn>
	}>;
	enums?: Array<EnumForIndicator>
}) => {
	const {measures, enums = []} = props;

	const isFactorArray = (
		measures: Array<AvailableMeasureFactor> | Array<AvailableMeasureColumn>
	): measures is Array<AvailableMeasureFactor> => {
		return measures.length === 0 || (measures[0] as any).factor != null;
	};

	return <>
		{measures.map(({key, label, measures}) => {
			if (isFactorArray(measures)) {
				return <MeasureFactorItems label={label} measureFactors={measures} enums={enums}
				                           key={key}/>;
			} else {
				return <MeasureColumnItems label={label} measureColumns={measures} enums={enums}
				                           key={key}/>;
			}
		})}
	</>;
};