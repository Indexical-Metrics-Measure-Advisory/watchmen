import {EnumId} from '@/services/data/tuples/enum-types';
import {Factor} from '@/services/data/tuples/factor-types';
import {IndicatorMeasure} from '@/services/data/tuples/indicator-types';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';

export interface AvailableMeasureFactor extends IndicatorMeasure {
	factorName?: string;
	factor?: Factor;
}

export interface AvailableMeasureColumn extends IndicatorMeasure {
	columnAlias?: string;
	column?: SubjectDataSetColumn;
	enumId?: EnumId;
}