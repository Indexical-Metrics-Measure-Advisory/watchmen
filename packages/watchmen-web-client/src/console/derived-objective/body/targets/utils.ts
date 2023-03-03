import {BreakdownTarget} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTargetId} from '@/services/data/tuples/objective-types';

export const createBreakdownTarget = (targetId: ObjectiveTargetId): BreakdownTarget => {
	return {
		targetId,
		dimensions: []
	};
};
