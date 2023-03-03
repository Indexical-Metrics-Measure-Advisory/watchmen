export enum BreakdownEventTypes {
	DIMENSION_CHANGED = 'dimension-changed',
}

export interface BreakdownEventBus {
	fire(type: BreakdownEventTypes.DIMENSION_CHANGED): this;
	on(type: BreakdownEventTypes.DIMENSION_CHANGED, listener: () => void): this;
	off(type: BreakdownEventTypes.DIMENSION_CHANGED, listener: () => void): this;
}