import {Tuple} from '@/services/data/tuples/tuple-types';
import {DateTime} from '@/services/data/types';
import {Objective, ObjectiveId} from './objective-types';

export type DerivedObjectiveId = string;

export interface DerivedObjective extends Tuple {
	derivedObjectiveId: DerivedObjectiveId;
	name: string;
	description?: string;
	objectiveId: ObjectiveId;
	definition: Objective;
	lastVisitTime: DateTime;
}
