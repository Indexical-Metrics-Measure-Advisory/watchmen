import {
	isConnectedSpaceOpened,
	isDashboardOpened,
	isDerivedObjectiveOpened,
	toConnectedSpace,
	toDashboard,
	toDerivedObjective
} from '@/routes/utils';
import {saveFavorite} from '@/services/data/console/favorite';
import {Favorite} from '@/services/data/console/favorite-types';
import {ConnectedSpace, ConnectedSpaceId} from '@/services/data/tuples/connected-space-types';
import {Dashboard, DashboardId} from '@/services/data/tuples/dashboard-types';
import {DerivedObjective, DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {ICON_CONNECTED_SPACE, ICON_DASHBOARD, ICON_OBJECTIVE} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {MouseEvent, useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {RenderItem, RenderItemType, StateData} from './types';

const buildFavoriteItems = (data: StateData) => {
	return [
		...data.connectedSpaceIds.map(connectedSpaceId => {
			// eslint-disable-next-line
			const connectedSpace = data.connectedSpaces.find(space => space.connectId == connectedSpaceId);
			if (connectedSpace) {
				return {
					id: connectedSpace.connectId, name: connectedSpace.name,
					icon: ICON_CONNECTED_SPACE, type: RenderItemType.CONNECTED_SPACE
				};
			} else {
				return null;
			}
		}).filter(x => !!x) as Array<RenderItem>,
		...data.dashboardIds.map(dashboardId => {
			// eslint-disable-next-line
			const dashboard = data.dashboards.find(dashboard => dashboard.dashboardId == dashboardId);
			if (dashboard) {
				return {
					id: dashboard.dashboardId, name: dashboard.name, icon: ICON_DASHBOARD,
					type: RenderItemType.DASHBOARD
				};
			} else {
				return null;
			}
		}).filter(x => !!x) as Array<RenderItem>,
		...data.derivedObjectiveIds.map(derivedObjectiveId => {
			// eslint-disable-next-line
			const derivedObjective = data.derivedObjectives.find(objective => objective.derivedObjectiveId == derivedObjectiveId);
			if (derivedObjective) {
				return {
					id: derivedObjective.derivedObjectiveId, name: derivedObjective.name,
					icon: ICON_OBJECTIVE, type: RenderItemType.DERIVED_OBJECTIVE
				};
			} else {
				return null;
			}
		}).filter(x => !!x) as Array<RenderItem>
	].sort((i1, i2) => i1.name.toLowerCase().localeCompare(i2.name.toLowerCase()));
};

export const useFavoriteState = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const {on, off, fire} = useConsoleEventBus();
	const [data, setData] = useState<StateData>({
		connectedSpaces: [], connectedSpaceIds: [],
		dashboards: [], dashboardIds: [],
		derivedObjectives: [], derivedObjectiveIds: []
	});
	useEffect(() => {
		const onDashboardAddedIntoFavorite = (dashboardId: DashboardId) => {
			setData(data => {
				return {...data, dashboardIds: Array.from(new Set([...data.dashboardIds, dashboardId]))};
			});
		};
		const onDashboardRemovedFromFavorite = (dashboardId: DashboardId) => {
			setData(data => {
				// eslint-disable-next-line
				return {...data, dashboardIds: data.dashboardIds.filter(id => id != dashboardId)};
			});
		};

		on(ConsoleEventTypes.DASHBOARD_ADDED_INTO_FAVORITE, onDashboardAddedIntoFavorite);
		on(ConsoleEventTypes.DASHBOARD_REMOVED_FROM_FAVORITE, onDashboardRemovedFromFavorite);
		return () => {
			off(ConsoleEventTypes.DASHBOARD_ADDED_INTO_FAVORITE, onDashboardAddedIntoFavorite);
			off(ConsoleEventTypes.DASHBOARD_REMOVED_FROM_FAVORITE, onDashboardRemovedFromFavorite);
		};
	}, [on, off]);
	useEffect(() => {
		const onConnectedSpaceAddedIntoFavorite = (connectedSpaceId: ConnectedSpaceId) => {
			setData(data => {
				return {
					...data,
					connectedSpaceIds: Array.from(new Set([...data.connectedSpaceIds, connectedSpaceId]))
				};
			});
		};
		const onConnectedSpaceRemovedFromFavorite = (connectedSpaceId: ConnectedSpaceId) => {
			setData(data => {
				return {
					...data,
					// eslint-disable-next-line
					connectedSpaceIds: data.connectedSpaceIds.filter(id => id != connectedSpaceId)
				};
			});
		};

		on(ConsoleEventTypes.CONNECTED_SPACE_ADDED_INTO_FAVORITE, onConnectedSpaceAddedIntoFavorite);
		on(ConsoleEventTypes.CONNECTED_SPACE_REMOVED_FROM_FAVORITE, onConnectedSpaceRemovedFromFavorite);
		return () => {
			off(ConsoleEventTypes.CONNECTED_SPACE_ADDED_INTO_FAVORITE, onConnectedSpaceAddedIntoFavorite);
			off(ConsoleEventTypes.CONNECTED_SPACE_REMOVED_FROM_FAVORITE, onConnectedSpaceRemovedFromFavorite);
		};
	}, [on, off]);
	useEffect(() => {
		const onDerivedObjectiveAddedIntoFavorite = (derivedObjectiveId: DerivedObjectiveId) => {
			setData(data => {
				return {
					...data,
					derivedObjectiveIds: Array.from(new Set([...data.derivedObjectiveIds, derivedObjectiveId]))
				};
			});
		};
		const onDerivedObjectiveRemovedFromFavorite = (derivedObjectiveId: DerivedObjectiveId) => {
			setData(data => {
				return {
					...data,
					// eslint-disable-next-line
					derivedObjectiveIds: data.derivedObjectiveIds.filter(id => id != derivedObjectiveId)
				};
			});
		};

		on(ConsoleEventTypes.DERIVED_OBJECTIVE_ADDED_INTO_FAVORITE, onDerivedObjectiveAddedIntoFavorite);
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, onDerivedObjectiveRemovedFromFavorite);
		return () => {
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_ADDED_INTO_FAVORITE, onDerivedObjectiveAddedIntoFavorite);
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, onDerivedObjectiveRemovedFromFavorite);
		};
	}, [on, off]);
	useEffect(() => {
		const onDashboardCreated = (dashboard: Dashboard) => {
			setData(data => {
				return {...data, dashboards: Array.from(new Set([...data.dashboards, dashboard]))};
			});
		};
		const onDashboardRemoved = (dashboard: Dashboard) => {
			setData(data => {
				return {...data, dashboards: data.dashboards.filter(exists => exists !== dashboard)};
			});
		};
		on(ConsoleEventTypes.DASHBOARD_CREATED, onDashboardCreated);
		on(ConsoleEventTypes.DASHBOARD_REMOVED, onDashboardRemoved);
		return () => {
			off(ConsoleEventTypes.DASHBOARD_CREATED, onDashboardCreated);
			off(ConsoleEventTypes.DASHBOARD_REMOVED, onDashboardRemoved);
		};
	}, [on, off]);
	useEffect(() => {
		const onConnectedSpaceCreated = (connectedSpace: ConnectedSpace) => {
			setData(data => {
				return {...data, connectedSpaces: Array.from(new Set([...data.connectedSpaces, connectedSpace]))};
			});
		};
		const onConnectedSpaceRemoved = (connectedSpace: ConnectedSpace) => {
			setData(data => {
				return {
					...data,
					connectedSpaces: data.connectedSpaces.filter(exists => exists !== connectedSpace)
				};
			});
		};
		on(ConsoleEventTypes.CONNECTED_SPACE_CREATED, onConnectedSpaceCreated);
		on(ConsoleEventTypes.CONNECTED_SPACE_REMOVED, onConnectedSpaceRemoved);
		return () => {
			off(ConsoleEventTypes.CONNECTED_SPACE_CREATED, onConnectedSpaceCreated);
			off(ConsoleEventTypes.CONNECTED_SPACE_REMOVED, onConnectedSpaceRemoved);
		};
	}, [on, off]);
	useEffect(() => {
		const onDerivedObjectiveCreated = (derivedObjective: DerivedObjective) => {
			setData(data => {
				return {...data, derivedObjectives: Array.from(new Set([...data.derivedObjectives, derivedObjective]))};
			});
		};
		const onDerivedObjectiveRemoved = (derivedObjective: DerivedObjective) => {
			setData(data => {
				return {
					...data,
					derivedObjectives: data.derivedObjectives.filter(exists => exists !== derivedObjective)
				};
			});
		};
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_CREATED, onDerivedObjectiveCreated);
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED, onDerivedObjectiveRemoved);
		return () => {
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_CREATED, onDerivedObjectiveCreated);
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED, onDerivedObjectiveRemoved);
		};
	}, [on, off]);
	useEffect(() => {
		fire(ConsoleEventTypes.ASK_FAVORITE, ({dashboardIds, connectedSpaceIds, derivedObjectiveIds}: Favorite) => {
			fire(ConsoleEventTypes.ASK_CONNECTED_SPACES, (connectedSpaces: Array<ConnectedSpace>) => {
				fire(ConsoleEventTypes.ASK_DASHBOARDS, (dashboards: Array<Dashboard>) => {
					fire(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, (derivedObjectives: Array<DerivedObjective>) => {
						setData({
							connectedSpaces, connectedSpaceIds,
							dashboards, dashboardIds,
							derivedObjectives, derivedObjectiveIds
						});
					});
				});
			});
		});
	}, [fire]);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onDashboardRenamed = (dashboard: Dashboard) => {
			// eslint-disable-next-line
			if (data.dashboardIds.some(dashboardId => dashboardId == dashboard.dashboardId)) {
				forceUpdate();
			}
		};
		const onConnectedSpaceRenamed = (connectedSpace: ConnectedSpace) => {
			// eslint-disable-next-line
			if (data.connectedSpaceIds.some(connectedSpaceId => connectedSpaceId == connectedSpace.connectId)) {
				forceUpdate();
			}
		};
		const onDerivedObjectiveRenamed = (derivedObjective: DerivedObjective) => {
			// eslint-disable-next-line
			if (data.derivedObjectiveIds.some(derivedObjectiveId => derivedObjectiveId == derivedObjective.derivedObjectiveId)) {
				forceUpdate();
			}
		};
		on(ConsoleEventTypes.DASHBOARD_RENAMED, onDashboardRenamed);
		on(ConsoleEventTypes.CONNECTED_SPACE_RENAMED, onConnectedSpaceRenamed);
		on(ConsoleEventTypes.DERIVED_OBJECTIVE_RENAMED, onDerivedObjectiveRenamed);
		return () => {
			off(ConsoleEventTypes.DASHBOARD_RENAMED, onDashboardRenamed);
			off(ConsoleEventTypes.CONNECTED_SPACE_RENAMED, onConnectedSpaceRenamed);
			off(ConsoleEventTypes.DERIVED_OBJECTIVE_RENAMED, onDerivedObjectiveRenamed);
		};
	}, [on, off, data.dashboardIds, data.connectedSpaceIds, data.derivedObjectiveIds, forceUpdate]);

	const onItemClicked = (id: string, type: RenderItemType) => () => {
		if (type === RenderItemType.DASHBOARD) {
			if (!isDashboardOpened(id, location)) {
				navigate(toDashboard(id));
			}
		} else if (type === RenderItemType.CONNECTED_SPACE) {
			if (!isConnectedSpaceOpened(id, location)) {
				navigate(toConnectedSpace(id));
			}
		} else if (type === RenderItemType.DERIVED_OBJECTIVE) {
			if (!isDerivedObjectiveOpened(id, location)) {
				navigate(toDerivedObjective(id));
			}
		}
		fire(ConsoleEventTypes.HIDE_FAVORITE);
	};
	const onItemRemoveClicked = (id: string, type: RenderItemType) => async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		let dashboardIds = data.dashboardIds;
		let connectedSpaceIds = data.connectedSpaceIds;
		let derivedObjectiveIds = data.derivedObjectiveIds;
		if (type === RenderItemType.DASHBOARD) {
			// eslint-disable-next-line
			dashboardIds = dashboardIds.filter(dashboardId => id != dashboardId);
			fire(ConsoleEventTypes.DASHBOARD_REMOVED_FROM_FAVORITE, id);
		} else if (type === RenderItemType.CONNECTED_SPACE) {
			// eslint-disable-next-line
			connectedSpaceIds = connectedSpaceIds.filter(connectedSpaceId => id != connectedSpaceId);
			fire(ConsoleEventTypes.CONNECTED_SPACE_REMOVED_FROM_FAVORITE, id);
		} else if (type === RenderItemType.DERIVED_OBJECTIVE) {
			// eslint-disable-next-line
			derivedObjectiveIds = derivedObjectiveIds.filter(derivedObjectiveId => id != derivedObjectiveId);
			fire(ConsoleEventTypes.DERIVED_OBJECTIVE_REMOVED_FROM_FAVORITE, id);
		}
		try {
			await saveFavorite({
				connectedSpaceIds: connectedSpaceIds || [],
				dashboardIds: dashboardIds || [],
				derivedObjectiveIds: derivedObjectiveIds || []
			});
		} catch (e: any) {
			// ignore
			console.info(e);
		}
	};

	const items = buildFavoriteItems(data);

	return {items, onItemClicked, onItemRemoveClicked, data};
};