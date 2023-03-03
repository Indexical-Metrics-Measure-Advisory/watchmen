import {Indicator} from '@/services/data/tuples/indicator-types';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';

export interface IndicatorData {
	indicator?: Indicator;
	topic?: TopicForIndicator;
	subject?: SubjectForIndicator;
}
