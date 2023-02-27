import {ConnectedSpaceId} from '../tuples/connected-space-types';
import {DashboardId} from '../tuples/dashboard-types';
import {DerivedObjectiveId} from '../tuples/derived-objective-types';

export interface Favorite {
	connectedSpaceIds: Array<ConnectedSpaceId>;
	derivedObjectiveIds: Array<DerivedObjectiveId>;
	dashboardIds: Array<DashboardId>;
}
