import {BreakdownDimension, ObjectiveTargetBreakdownValues} from '@/services/data/tuples/derived-objective-types';

export enum BreakdownTargetEventTypes {
	ADD_DIMENSION = 'add-dimension',
	REMOVE_DIMENSION = 'remove-dimension',

	DIMENSION_ADDED = 'dimension-added',
	DIMENSION_CHANGED = 'dimension-changed',
	DIMENSION_REMOVED = 'dimension-removed',

	ASK_VALUES = 'ask-values',
	VALUES_FETCHED = 'values-fetched'
}

export interface BreakdownTargetEventBus {
	fire(type: BreakdownTargetEventTypes.ADD_DIMENSION, dimension: BreakdownDimension): this;
	on(type: BreakdownTargetEventTypes.ADD_DIMENSION, listener: (dimension: BreakdownDimension) => void): this;
	off(type: BreakdownTargetEventTypes.ADD_DIMENSION, listener: (dimension: BreakdownDimension) => void): this;

	fire(type: BreakdownTargetEventTypes.REMOVE_DIMENSION, dimension: BreakdownDimension): this;
	on(type: BreakdownTargetEventTypes.REMOVE_DIMENSION, listener: (dimension: BreakdownDimension) => void): this;
	off(type: BreakdownTargetEventTypes.REMOVE_DIMENSION, listener: (dimension: BreakdownDimension) => void): this;

	fire(type: BreakdownTargetEventTypes.DIMENSION_ADDED, dimension: BreakdownDimension): this;
	on(type: BreakdownTargetEventTypes.DIMENSION_ADDED, listener: (dimension: BreakdownDimension) => void): this;
	off(type: BreakdownTargetEventTypes.DIMENSION_ADDED, listener: (dimension: BreakdownDimension) => void): this;

	fire(type: BreakdownTargetEventTypes.DIMENSION_CHANGED, dimension: BreakdownDimension): this;
	on(type: BreakdownTargetEventTypes.DIMENSION_CHANGED, listener: (dimension: BreakdownDimension) => void): this;
	off(type: BreakdownTargetEventTypes.DIMENSION_CHANGED, listener: (dimension: BreakdownDimension) => void): this;

	fire(type: BreakdownTargetEventTypes.DIMENSION_REMOVED, dimension: BreakdownDimension): this;
	on(type: BreakdownTargetEventTypes.DIMENSION_REMOVED, listener: (dimension: BreakdownDimension) => void): this;
	off(type: BreakdownTargetEventTypes.DIMENSION_REMOVED, listener: (dimension: BreakdownDimension) => void): this;

	fire(type: BreakdownTargetEventTypes.ASK_VALUES): this;
	on(type: BreakdownTargetEventTypes.ASK_VALUES, listener: () => void): this;
	off(type: BreakdownTargetEventTypes.ASK_VALUES, listener: () => void): this;

	fire(type: BreakdownTargetEventTypes.VALUES_FETCHED, values: ObjectiveTargetBreakdownValues): this;
	on(type: BreakdownTargetEventTypes.VALUES_FETCHED, listener: (values: ObjectiveTargetBreakdownValues) => void): this;
	off(type: BreakdownTargetEventTypes.VALUES_FETCHED, listener: (values: ObjectiveTargetBreakdownValues) => void): this;
}
