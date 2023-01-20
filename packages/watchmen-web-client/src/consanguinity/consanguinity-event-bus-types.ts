import {Objective} from '@/services/data/tuples/objective-types';

export enum ConsanguinityEventTypes {
	ASK_SINGLE_OBJECTIVE = 'ask-single-objective',
}

export interface ConsanguinityEventBus {
	fire(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, objective: Objective): this;
	on(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, listener: (objective: Objective) => void): this;
	off(type: ConsanguinityEventTypes.ASK_SINGLE_OBJECTIVE, listener: (objective: Objective) => void): this;
}