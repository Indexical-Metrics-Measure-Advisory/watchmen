import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {Objective} from '@/services/data/tuples/objective-types';

export enum ConsanguinityEventTypes {
	ASK_SINGLE_OBJECTIVE = 'ask-single-objective',

	NODE_SELECTED = 'node-selected'
}

export interface ConsanguinityEventBus {
	fire(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, objective: Objective): this;
	on(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, listener: (objective: Objective) => void): this;
	off(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, listener: (objective: Objective) => void): this;

	fire(type: ConsanguinityEventTypes.NODE_SELECTED, cid: ConsanguinityUniqueId): this;
	on(type: ConsanguinityEventTypes.NODE_SELECTED, listener: (cid: ConsanguinityUniqueId) => void): this;
	off(type: ConsanguinityEventTypes.NODE_SELECTED, listener: (cid: ConsanguinityUniqueId) => void): this;
}