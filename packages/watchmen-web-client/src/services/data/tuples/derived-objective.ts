import {Apis, get} from '../apis';
import {fetchMockDerivedObjectives, saveMockDerivedObjective} from '../mock/tuples/mock-derived-objectives';
import {isMockService} from '../utils';
import {DerivedObjective} from './derived-objective-types';
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
