import {Favorite} from '../../console/favorite-types';

export const fetchMockFavorite = async (): Promise<Favorite> => {
	return {
		connectedSpaceIds: ['1', '2'],
		dashboardIds: ['1'],
		derivedObjectiveIds: ['1']
	};
};