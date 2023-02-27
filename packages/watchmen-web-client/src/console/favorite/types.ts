import {ConnectedSpace, ConnectedSpaceId} from '@/services/data/tuples/connected-space-types';
import {Dashboard, DashboardId} from '@/services/data/tuples/dashboard-types';
import {DerivedObjective, DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {ICON_CONNECTED_SPACE, ICON_DASHBOARD, ICON_OBJECTIVE} from '@/widgets/basic/constants';

export interface StateData {
	connectedSpaces: Array<ConnectedSpace>;
	connectedSpaceIds: Array<ConnectedSpaceId>;
	dashboards: Array<Dashboard>;
	dashboardIds: Array<DashboardId>;
	derivedObjectives: Array<DerivedObjective>;
	derivedObjectiveIds: Array<DerivedObjectiveId>;
}

export enum RenderItemType {
	DASHBOARD = 'dashboard',
	CONNECTED_SPACE = 'connected-space',
	DERIVED_OBJECTIVE = 'derived-objective'
}

export interface RenderItem {
	id: string;
	name: string;
	icon: typeof ICON_CONNECTED_SPACE | typeof ICON_DASHBOARD | typeof ICON_OBJECTIVE;
	type: RenderItemType;
}
