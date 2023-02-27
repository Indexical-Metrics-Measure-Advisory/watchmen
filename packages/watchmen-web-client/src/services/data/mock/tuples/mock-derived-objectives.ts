import {DerivedObjective} from '../../tuples/derived-objective-types';
import {isFakedUuid} from '../../tuples/utils';
import {DemoDerivedObjectives} from './mock-data-derived-objectives';

export const fetchMockDerivedObjectives = async (): Promise<Array<DerivedObjective>> => {
	return new Promise(resolve => {
		setTimeout(() => resolve(DemoDerivedObjectives), 500);
	});
};

let newDerivedObjectiveId = 10000;
export const saveMockDerivedObjective = async (derivedObjective: DerivedObjective): Promise<void> => {
	return new Promise((resolve) => {
		if (isFakedUuid(derivedObjective)) {
			derivedObjective.derivedObjectiveId = `${newDerivedObjectiveId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const renameMockDerivedObjective = async (derivedObjective: DerivedObjective): Promise<void> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 500);
	});
};

export const deleteMockDerivedObjective = async (derivedObjective: DerivedObjective): Promise<void> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 500);
	});
};
