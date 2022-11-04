import {Router} from '@/routes/types';
import {asConsoleDashboardRoute, asFallbackNavigate, toDashboard} from '@/routes/utils';
import {saveLastSnapshot} from '@/services/data/account/last-snapshot';
import {LastSnapshot} from '@/services/data/account/last-snapshot-types';
import {saveDashboard} from '@/services/data/tuples/dashboard';
import {Dashboard, DashboardId} from '@/services/data/tuples/dashboard-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {FullWidthPage} from '@/widgets/basic/page';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {Lang} from '@/widgets/langs';
import React, {Fragment, useEffect, useState} from 'react';
import {Routes, useNavigate, useParams} from 'react-router-dom';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {createDashboard} from '../utils/tuples';
import {DashboardBody} from './body';
import {DashboardEventBusProvider} from './dashboard-event-bus';
import {DashboardHeader} from './header';

const ConsoleDashboard = () => {
	const {dashboardId} = useParams<{ dashboardId: DashboardId }>();

	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const {fire, on, off} = useConsoleEventBus();
	const [dashboard, setDashboard] = useState<Dashboard | null>(null);
	useEffect(() => {
		fire(ConsoleEventTypes.ASK_DASHBOARDS, (dashboards: Array<Dashboard>) => {
			// eslint-disable-next-line
			const dashboard = dashboards.find(dashboard => dashboard.dashboardId == dashboardId);
			if (dashboard) {
				setDashboard(dashboard);
			} else {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					{Lang.CONSOLE.ERROR.DASHBOARD_NOT_FOUND}
				</AlertLabel>, () => {
					navigate(Router.CONSOLE, {replace: true});
				});
			}
		});
	}, [fire, fireGlobal, navigate, dashboardId]);
	useEffect(() => {
		const onDashboardRemoved = (dashboard: Dashboard) => {
			// eslint-disable-next-line
			if (dashboard.dashboardId != dashboardId) {
				return;
			}

			fire(ConsoleEventTypes.ASK_DASHBOARDS, (dashboards: Array<Dashboard>) => {
				// eslint-disable-next-line
				const dashboard = dashboards.sort((d1, d2) => {
					return d1.name.toLowerCase().localeCompare(d2.name.toLowerCase());
					// eslint-disable-next-line
				}).find(dashboard => dashboard.dashboardId != dashboardId);
				if (dashboard) {
					// switch to another one
					navigate(toDashboard(dashboard.dashboardId), {replace: true});
				} else {
					// no dashboard, to home
					navigate(Router.CONSOLE_HOME, {replace: true});
				}
			});
		};
		on(ConsoleEventTypes.DASHBOARD_REMOVED, onDashboardRemoved);
		return () => {
			off(ConsoleEventTypes.DASHBOARD_REMOVED, onDashboardRemoved);
		};
	}, [fire, on, off, navigate, dashboardId]);

	// eslint-disable-next-line
	if (!dashboard || dashboard.dashboardId != dashboardId) {
		return null;
	}

	return <DashboardEventBusProvider>
		<FullWidthPage>
			<DashboardHeader dashboard={dashboard}/>
			{/*<VerticalMarginOneUnit/>*/}
			<DashboardBody dashboard={dashboard}/>
		</FullWidthPage>
	</DashboardEventBusProvider>;
};

const ConsoleDashboardAuto = () => {
	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useConsoleEventBus();
	useEffect(() => {
		fire(ConsoleEventTypes.ASK_DASHBOARDS, (dashboards: Array<Dashboard>) => {
			const allDashboardIds = [...dashboards].map(dashboard => dashboard.dashboardId);
			fire(ConsoleEventTypes.ASK_LAST_SNAPSHOT, async ({lastDashboardId}: LastSnapshot) => {
				// eslint-disable-next-line
				if (lastDashboardId && allDashboardIds.some(id => id == lastDashboardId)) {
					// exists and found in list
					navigate(toDashboard(lastDashboardId));
				} else if (dashboards && dashboards.length > 0) {
					// pick the latest visited one
					const {dashboardId: firstDashboardId} = [...dashboards].sort((d1, d2) => {
						return (d2.lastVisitTime || '').localeCompare((d1.lastVisitTime || ''));
					})[0];
					navigate(toDashboard(firstDashboardId));
					try {
						await saveLastSnapshot({lastDashboardId: firstDashboardId});
					} catch (e: any) {
						// ignore
					}
				} else {
					// no dashboards created
					const dashboard = createDashboard();
					fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
						async () => await saveDashboard(dashboard),
						() => {
							fire(ConsoleEventTypes.DASHBOARD_CREATED, dashboard);
							navigate(toDashboard(dashboard.dashboardId));
						});
				}
			});
		});
	}, [fireGlobal, fire, navigate]);

	return <Fragment/>;
};

const ConsoleDashboardIndex = () => {
	useHelp(HELP_KEYS.CONSOLE_DASHBOARD);
	return <Routes>
		{asConsoleDashboardRoute(Router.CONSOLE_DASHBOARD_EDIT, <ConsoleDashboard/>)}
		{asConsoleDashboardRoute(Router.CONSOLE_DASHBOARD, <ConsoleDashboardAuto/>)}
		{asFallbackNavigate(Router.CONSOLE_DASHBOARD)}
	</Routes>;
};

export default ConsoleDashboardIndex;