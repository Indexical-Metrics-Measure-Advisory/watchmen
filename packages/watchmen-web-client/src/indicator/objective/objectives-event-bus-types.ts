import {TuplePage} from '@/services/data/query/tuple-page';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';

export interface ObjectiveData {
	objective?: Objective;
}

export enum ObjectivesEventTypes {
	SEARCHED = 'searched',
	ASK_SEARCHED = 'ask-searched',

	CREATE_OBJECTIVE = 'create-objective',
	PICK_OBJECTIVE = 'pick-objective',

	ASK_OBJECTIVE = 'ask-objective',
	OBJECTIVE_SAVED = 'objective-saved'
}

export interface ObjectivesEventBus {
	fire(type: ObjectivesEventTypes.SEARCHED, page: TuplePage<QueryObjective>, searchText: string): this;
	on(type: ObjectivesEventTypes.SEARCHED, listener: (page: TuplePage<QueryObjective>, searchText: string) => void): this;
	off(type: ObjectivesEventTypes.SEARCHED, listener: (page: TuplePage<QueryObjective>, searchText: string) => void): this;

	fire(type: ObjectivesEventTypes.ASK_SEARCHED, onData: (page?: TuplePage<QueryObjective>, searchText?: string) => void): this;
	on(type: ObjectivesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryObjective>, searchText?: string) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryObjective>, searchText?: string) => void) => void): this;

	fire(type: ObjectivesEventTypes.CREATE_OBJECTIVE, onCreated: (objective: Objective) => void): this;
	on(type: ObjectivesEventTypes.CREATE_OBJECTIVE, listener: (onCreated: (objective: Objective) => void) => void): this;
	off(type: ObjectivesEventTypes.CREATE_OBJECTIVE, listener: (onCreated: (objective: Objective) => void) => void): this;

	fire(type: ObjectivesEventTypes.PICK_OBJECTIVE, objectiveId: ObjectiveId, onData: (data: ObjectiveData) => void): this;
	on(type: ObjectivesEventTypes.PICK_OBJECTIVE, listener: (objectiveId: ObjectiveId, onData: (data: ObjectiveData) => void) => void): this;
	off(type: ObjectivesEventTypes.PICK_OBJECTIVE, listener: (objectiveId: ObjectiveId, onData: (data: ObjectiveData) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_OBJECTIVE, onData: (data?: ObjectiveData) => void): this;
	on(type: ObjectivesEventTypes.ASK_OBJECTIVE, listener: (onData: (data?: ObjectiveData) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_OBJECTIVE, listener: (onData: (data?: ObjectiveData) => void) => void): this;

	fire(type: ObjectivesEventTypes.OBJECTIVE_SAVED, objective: Objective): this;
	on(type: ObjectivesEventTypes.OBJECTIVE_SAVED, listener: (objective: Objective) => void): this;
	off(type: ObjectivesEventTypes.OBJECTIVE_SAVED, listener: (objective: Objective) => void): this;
}