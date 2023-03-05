import {saveTokenIntoSession} from '../account';
import {Apis, get} from '../apis';
import {fetchMockSharedDerivedObjective} from '../mock/share/mock-derived-objective';
import {DerivedObjective, DerivedObjectiveId} from '../tuples/derived-objective-types';
import {Token} from '../types';
import {isMockService} from '../utils';

export interface SharedDerivedObjective {
	derivedObjective: DerivedObjective;
}

export const fetchSharedDerivedObjective = async (derivedObjectiveId: DerivedObjectiveId, token: Token): Promise<SharedDerivedObjective> => {
	if (isMockService()) {
		return await fetchMockSharedDerivedObjective(derivedObjectiveId, token);
	} else {
		const derivedObjective = await get({
			api: Apis.DERIVED_OBJECTIVE_SHARE_GET,
			search: {derivedObjectiveId, token},
			auth: false
		});
		saveTokenIntoSession(token);

		return {derivedObjective};
	}
};
