import {DateTime} from '../types';
import {Objective, ObjectiveId} from './objective-types';
import {Tuple} from './tuple-types';

export type DerivedObjectiveId = string;

export interface DerivedObjective extends Tuple {
	derivedObjectiveId: DerivedObjectiveId;
	name: string;
	description?: string;
	objectiveId: ObjectiveId;
	definition: Objective;
	lastVisitTime: DateTime;
}
