import {Indicator, MeasureMethod} from '@/services/data/tuples/indicator-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {DropdownOption} from '@/widgets/basic/types';

export interface DefForBreakdownDimension {
	indicator?: Indicator;
	topic?: TopicForIndicator;
	subject?: SubjectForIndicator;
	buckets: Array<QueryBucket>;
}

export interface DimensionCandidate extends DropdownOption {
	onValue: boolean;
	buckets: Array<QueryBucket>;
	timeMeasureMethods: Array<MeasureMethod>;
}
