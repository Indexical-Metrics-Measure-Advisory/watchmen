import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity-types';
import {Objective} from '@/services/data/tuples/objective-types';

export enum ConsanguinityEventTypes {
	ASK_SINGLE_OBJECTIVE = 'ask-single-objective',

	NODE_SELECTED = 'node-selected',
	ACTIVE_SAME_ROUTE = 'active-same-route'
}

export interface RouteConsanguinityUniqueIds {
	center: ConsanguinityUniqueId;
	direct: Array<ConsanguinityUniqueId>;
	sameRoute: Array<ConsanguinityUniqueId>;
}

export interface ConsanguinityEventBus {
	fire(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, objective: Objective): this;
	on(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, listener: (objective: Objective) => void): this;
	off(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, listener: (objective: Objective) => void): this;

	fire(type: ConsanguinityEventTypes.NODE_SELECTED, cid: ConsanguinityUniqueId, thisEventId: string): this;
	on(type: ConsanguinityEventTypes.NODE_SELECTED, listener: (cid: ConsanguinityUniqueId, thisEventId: string) => void): this;
	off(type: ConsanguinityEventTypes.NODE_SELECTED, listener: (cid: ConsanguinityUniqueId, thisEventId: string) => void): this;

	fire(type: ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, cids: RouteConsanguinityUniqueIds): this;
	on(type: ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, listener: (cids: RouteConsanguinityUniqueIds) => void): this;
	off(type: ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, listener: (cids: RouteConsanguinityUniqueIds) => void): this;
}