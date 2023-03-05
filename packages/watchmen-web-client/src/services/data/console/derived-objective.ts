import {Router} from '@/routes/types';
import {askShareToken} from '../login';
import {DerivedObjective} from '../tuples/derived-objective-types';

export const buildDerivedObjectiveShareUrl = async (derivedObjective: DerivedObjective): Promise<string> => {
	// REMOTE use real api to retrieve dashboard share url
	const {protocol, host} = window.location;
	const path = Router.SHARE_DERIVED_OBJECTIVE
		.replace(':derivedObjectiveId', derivedObjective.derivedObjectiveId)
		.replace(':token', await askShareToken());
	return `${protocol}//${host}${path}`;
};