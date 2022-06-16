import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import styled from 'styled-components';
import {Lang} from '../langs';

const MeasureMethodContainer = styled.span.attrs({'data-widget': 'measure-method'})`
	display     : flex;
	position    : relative;
	align-items : center;
`;

export const MeasureMethodLabels: Record<MeasureMethod, string> = {
	// address related
	[MeasureMethod.CONTINENT]: Lang.MEASURE_METHOD.CONTINENT,
	[MeasureMethod.REGION]: Lang.MEASURE_METHOD.REGION,
	[MeasureMethod.COUNTRY]: Lang.MEASURE_METHOD.COUNTRY,
	[MeasureMethod.PROVINCE]: Lang.MEASURE_METHOD.PROVINCE,
	[MeasureMethod.CITY]: Lang.MEASURE_METHOD.CITY,
	[MeasureMethod.DISTRICT]: Lang.MEASURE_METHOD.DISTRICT,
	[MeasureMethod.FLOOR]: Lang.MEASURE_METHOD.FLOOR,
	[MeasureMethod.RESIDENCE_TYPE]: Lang.MEASURE_METHOD.RESIDENCE_TYPE,
	[MeasureMethod.RESIDENTIAL_AREA]: Lang.MEASURE_METHOD.RESIDENTIAL_AREA,

	// time related
	[MeasureMethod.YEAR]: Lang.MEASURE_METHOD.YEAR,
	[MeasureMethod.HALF_YEAR]: Lang.MEASURE_METHOD.HALF_YEAR,
	[MeasureMethod.QUARTER]: Lang.MEASURE_METHOD.QUARTER,
	[MeasureMethod.MONTH]: Lang.MEASURE_METHOD.MONTH,
	[MeasureMethod.HALF_MONTH]: Lang.MEASURE_METHOD.HALF_MONTH,
	[MeasureMethod.TEN_DAYS]: Lang.MEASURE_METHOD.TEN_DAYS,
	[MeasureMethod.WEEK_OF_YEAR]: Lang.MEASURE_METHOD.WEEK_OF_YEAR,
	[MeasureMethod.WEEK_OF_MONTH]: Lang.MEASURE_METHOD.WEEK_OF_MONTH,
	[MeasureMethod.HALF_WEEK]: Lang.MEASURE_METHOD.HALF_WEEK,
	[MeasureMethod.DAY_OF_MONTH]: Lang.MEASURE_METHOD.DAY_OF_MONTH,
	[MeasureMethod.DAY_OF_WEEK]: Lang.MEASURE_METHOD.DAY_OF_WEEK,
	[MeasureMethod.DAY_KIND]: Lang.MEASURE_METHOD.DAY_KIND,
	[MeasureMethod.HOUR]: Lang.MEASURE_METHOD.HOUR,
	[MeasureMethod.HOUR_KIND]: Lang.MEASURE_METHOD.HOUR_KIND,
	[MeasureMethod.AM_PM]: Lang.MEASURE_METHOD.AM_PM,

	// individual related
	[MeasureMethod.GENDER]: Lang.MEASURE_METHOD.GENDER,
	[MeasureMethod.OCCUPATION]: Lang.MEASURE_METHOD.OCCUPATION,
	[MeasureMethod.AGE]: Lang.MEASURE_METHOD.AGE,
	[MeasureMethod.RELIGION]: Lang.MEASURE_METHOD.RELIGION,
	[MeasureMethod.NATIONALITY]: Lang.MEASURE_METHOD.NATIONALITY,

	// organization related
	[MeasureMethod.BIZ_TRADE]: Lang.MEASURE_METHOD.BIZ_TRADE,
	[MeasureMethod.BIZ_SCALE]: Lang.MEASURE_METHOD.BIZ_SCALE,

	// boolean
	[MeasureMethod.BOOLEAN]: Lang.MEASURE_METHOD.BOOLEAN,

	// enumeration
	[MeasureMethod.ENUM]: Lang.MEASURE_METHOD.ENUM
};

export const MeasureMethodLabel = (props: { measureMethod: MeasureMethod }) => {
	const {measureMethod, ...rest} = props;

	return <MeasureMethodContainer {...rest}>
		{MeasureMethodLabels[measureMethod] || ''}
	</MeasureMethodContainer>;
};