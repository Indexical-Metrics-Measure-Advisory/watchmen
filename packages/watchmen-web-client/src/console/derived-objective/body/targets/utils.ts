import {BreakdownTarget} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTargetId} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';

export const createBreakdownTarget = (targetId: ObjectiveTargetId): BreakdownTarget => {
	return {targetId, name: Lang.PLAIN.NEW_DERIVED_OBJECTIVE_TARGET_BREAKDOWN_NAME, dimensions: []};
};
