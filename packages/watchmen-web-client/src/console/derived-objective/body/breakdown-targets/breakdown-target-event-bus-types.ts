export enum BreakdownTargetEventTypes {
	DIMENSION_CHANGED = 'dimension-changed',
}

export interface BreakdownTargetEventBus {
	fire(type: BreakdownTargetEventTypes.DIMENSION_CHANGED): this;
	on(type: BreakdownTargetEventTypes.DIMENSION_CHANGED, listener: () => void): this;
	off(type: BreakdownTargetEventTypes.DIMENSION_CHANGED, listener: () => void): this;
}
