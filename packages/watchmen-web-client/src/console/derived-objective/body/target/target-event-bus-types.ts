import {BreakdownTarget} from '@/services/data/tuples/derived-objective-types';

export enum TargetEventTypes {
	ADD_BREAKDOWN = 'add-breakdown',
	REMOVE_BREAKDOWN = 'remove-breakdown',

	BREAKDOWN_REMOVED = 'breakdown-removed'
}

export interface TargetEventBus {
	fire(type: TargetEventTypes.ADD_BREAKDOWN, breakdown: BreakdownTarget): this;
	on(type: TargetEventTypes.ADD_BREAKDOWN, listener: (breakdown: BreakdownTarget) => void): this;
	off(type: TargetEventTypes.ADD_BREAKDOWN, listener: (breakdown: BreakdownTarget) => void): this;

	fire(type: TargetEventTypes.REMOVE_BREAKDOWN, breakdown: BreakdownTarget): this;
	on(type: TargetEventTypes.REMOVE_BREAKDOWN, listener: (breakdown: BreakdownTarget) => void): this;
	off(type: TargetEventTypes.REMOVE_BREAKDOWN, listener: (breakdown: BreakdownTarget) => void): this;

	fire(type: TargetEventTypes.BREAKDOWN_REMOVED, breakdown: BreakdownTarget): this;
	on(type: TargetEventTypes.BREAKDOWN_REMOVED, listener: (breakdown: BreakdownTarget) => void): this;
	off(type: TargetEventTypes.BREAKDOWN_REMOVED, listener: (breakdown: BreakdownTarget) => void): this;
}
