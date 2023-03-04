import {Apis, get, post} from '../apis';
import {
	askMockObjectiveTargetBreakdownValues,
	deleteMockDerivedObjective,
	fetchMockDerivedObjectives,
	renameMockDerivedObjective,
	saveMockDerivedObjective
} from '../mock/tuples/mock-derived-objectives';
import {isMockService} from '../utils';
import {BreakdownTarget, DerivedObjective, ObjectiveTargetBreakdownValues} from './derived-objective-types';
import {transformToServer} from './objective';
import {Objective, ObjectiveTarget} from './objective-types';
import {isFakedUuid} from './utils';

export const fetchDerivedObjectives = async (): Promise<Array<DerivedObjective>> => {
	if (isMockService()) {
		return fetchMockDerivedObjectives();
	} else {
		return await get({api: Apis.DERIVED_OBJECTIVES_MINE});
	}
};

export const connectAsDerivedObjective = async (derivedObjective: DerivedObjective): Promise<void> => {
	if (isMockService()) {
		return saveMockDerivedObjective(derivedObjective);
	} else if (isFakedUuid(derivedObjective)) {
		const data = await get({
			api: Apis.OBJECTIVE_CONNECT,
			search: {
				objectiveId: derivedObjective.objectiveId,
				name: derivedObjective.name
			}
		});
		derivedObjective.derivedObjectiveId = data.derivedObjectiveId;
		derivedObjective.definition = data.definition;
		derivedObjective.lastModifiedAt = data.lastModifiedAt;
	}
};

export const renameDerivedObjective = async (derivedObjective: DerivedObjective): Promise<void> => {
	if (isMockService()) {
		return renameMockDerivedObjective(derivedObjective);
	} else {
		await get({
			api: Apis.DERIVED_OBJECTIVE_RENAME,
			search: {derivedObjectiveId: derivedObjective.derivedObjectiveId, name: derivedObjective.name}
		});
	}
};

export const saveDerivedObjective = async (derivedObjective: DerivedObjective): Promise<void> => {
	if (isMockService()) {
		return saveMockDerivedObjective(derivedObjective);
	} else if (isFakedUuid(derivedObjective)) {
		const data = await post({api: Apis.DERIVED_OBJECTIVE_CREATE, data: derivedObjective});
		derivedObjective.derivedObjectiveId = data.derivedObjectiveId;
		derivedObjective.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.DERIVED_OBJECTIVE_SAVE, data: derivedObjective});
		derivedObjective.lastModifiedAt = data.lastModifiedAt;
	}
};

export const deleteDerivedObjective = async (derivedObjective: DerivedObjective): Promise<void> => {
	if (isMockService()) {
		return deleteMockDerivedObjective(derivedObjective);
	} else {
		await get({
			api: Apis.DERIVED_OBJECTIVE_DELETE,
			search: {derivedObjectiveId: derivedObjective.derivedObjectiveId}
		});
	}
};

export const askObjectiveTargetBreakdownValues = async (
	objective: Objective, target: ObjectiveTarget, breakdown: BreakdownTarget
): Promise<ObjectiveTargetBreakdownValues> => {
	if (isMockService()) {
		return askMockObjectiveTargetBreakdownValues(objective, target, breakdown);
	} else {
		const data = await post({
			api: Apis.OBJECTIVE_TARGET_BREAKDOWN_VALUES, data: {
				objectiveId: transformToServer(objective),
				target, breakdown
			}
		});
		return {...data, breakdownUuid: breakdown.uuid};
	}
};
