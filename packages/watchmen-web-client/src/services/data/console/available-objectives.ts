import {Apis, get} from '../apis';
import {fetchMockAvailableObjectives} from '../mock/console/mock-avaiable-objectives';
import {Objective} from '../tuples/objective-types';
import {isMockService} from '../utils';

export const fetchAvailableObjectives = async (): Promise<Array<Objective>> => {
	if (isMockService()) {
		return fetchMockAvailableObjectives();
	} else {
		return await get({api: Apis.OBJECTIVES_AVAILABLE});
	}
};
