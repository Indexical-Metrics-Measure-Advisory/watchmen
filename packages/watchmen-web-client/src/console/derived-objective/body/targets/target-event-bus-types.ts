import {BreakdownTarget} from '@/services/data/tuples/derived-objective-types';

export enum TargetEventTypes {
	BREAKDOWN_ADDED = 'breakdown-added',
	BREAKDOWN_REMOVED = 'breakdown-removed'
}

export interface TargetEventBus {
	fire(type: TargetEventTypes.BREAKDOWN_ADDED, breakdownTarget: BreakdownTarget): this;
	on(type: TargetEventTypes.BREAKDOWN_ADDED, listener: (breakdownTarget: BreakdownTarget) => void): this;
	off(type: TargetEventTypes.BREAKDOWN_ADDED, listener: (breakdownTarget: BreakdownTarget) => void): this;

	fire(type: TargetEventTypes.BREAKDOWN_REMOVED, breakdownTarget: BreakdownTarget): this;
	on(type: TargetEventTypes.BREAKDOWN_REMOVED, listener: (breakdownTarget: BreakdownTarget) => void): this;
	off(type: TargetEventTypes.BREAKDOWN_REMOVED, listener: (breakdownTarget: BreakdownTarget) => void): this;
}
