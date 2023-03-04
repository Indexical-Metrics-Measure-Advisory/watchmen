import {BreakdownTarget, DerivedObjective, ObjectiveTargetBreakdownValues} from '../../tuples/derived-objective-types';
import {Objective, ObjectiveTarget} from '../../tuples/objective-types';
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

export const askMockObjectiveTargetBreakdownValues = async (
	objective: Objective, target: ObjectiveTarget, breakdown: BreakdownTarget
): Promise<ObjectiveTargetBreakdownValues> => {
	return new Promise<ObjectiveTargetBreakdownValues>(resolve => {
		setTimeout(() => {
			const dimensionCount = (breakdown.dimensions ?? []).length;
			const dimensionValues = ['hello', 'world', 'watchmen', 'matryoshka', 'whatever', 'something', 'nothing', 'everything'];
			resolve({
				breakdownUuid: breakdown.uuid,
				data: new Array(Math.floor(Math.random() * 10 + 5))
					.fill(1)
					.map(() => {
						const value = Math.random() * 10000;
						return {
							dimensions: new Array(dimensionCount)
								.fill(1)
								.map(() => {
									return dimensionValues[Math.floor(Math.random() * dimensionValues.length)];
								}),
							currentValue: value,
							previousValue: value * 0.9,
							chainValue: value * 0.8
						};
					}),
				failed: false
			});
		}, 500);
	});
};

