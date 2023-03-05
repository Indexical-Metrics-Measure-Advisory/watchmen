import {SharedDerivedObjective} from '../../share/derived-objective';
import {DerivedObjectiveId} from '../../tuples/derived-objective-types';
import {Token} from '../../types';
import {DemoDerivedObjectives} from '../tuples/mock-data-derived-objectives';

export const fetchMockSharedDerivedObjective = async (derivedObjectiveId: DerivedObjectiveId, token: Token): Promise<SharedDerivedObjective> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({derivedObjective: JSON.parse(JSON.stringify(DemoDerivedObjectives[0]))});
		}, 300);
	});
};