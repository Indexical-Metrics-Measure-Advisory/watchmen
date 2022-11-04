import NoDataImage from '@/assets/dashboard-no-data.svg';
import {ConsoleEventBusProvider} from '@/console/console-event-bus';
import {DashboardBody} from '@/console/dashboard/body';
import {DashboardEventBusProvider} from '@/console/dashboard/dashboard-event-bus';
import {Router} from '@/routes/types';
import {fetchAdminDashboard} from '@/services/data/admin/home';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {Dashboard} from '@/services/data/tuples/dashboard-types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AdminLoading} from './admin-loading';
import {SimulateConsole} from './simulate-console';
import {AdminDashboardContainer, CreateOne, NoData} from './widgets';

interface HomeState {
	initialized: boolean;
	dashboard?: Dashboard;
	connectedSpaces?: Array<ConnectedSpace>;
}

const AdminDashboard = (props: { dashboard: Dashboard }) => {
	const {dashboard} = props;
	useHelp(HELP_KEYS.ADMIN_DASHBOARD);

	return <DashboardEventBusProvider>
		<AdminDashboardContainer>
			<DashboardBody dashboard={dashboard} removable={false} transient={true}/>
		</AdminDashboardContainer>
	</DashboardEventBusProvider>;
};

const AdminHomeIndex = () => {
	const navigate = useNavigate();
	const [state, setState] = useState<HomeState>({initialized: false});
	useEffect(() => {
		(async () => {
			try {
				const {dashboard, connectedSpaces} = await fetchAdminDashboard();
				setState({initialized: true, dashboard, connectedSpaces});
			} catch (e: any) {
				console.error(e);
				setState({initialized: true});
			}
		})();
	}, []);

	if (!state.initialized) {
		return <AdminLoading label="Loading..."/>;
	}

	if (state.initialized && (state.dashboard == null || state.connectedSpaces == null || state.connectedSpaces.length === 0)) {
		const onCreateClicked = () => navigate(Router.CONSOLE_DASHBOARD);
		return <AdminLoading label={
			<>
				<span>No dashboard defined, </span>
				<CreateOne onClick={onCreateClicked}>pick a dashboard from your spaces first.</CreateOne>
			</>
		} spin={true}>
			<NoData background={NoDataImage}/>
		</AdminLoading>;
	}

	return <ConsoleEventBusProvider>
		<SimulateConsole connectedSpaces={state.connectedSpaces!}/>
		<AdminDashboard dashboard={state.dashboard!}/>
	</ConsoleEventBusProvider>;
};

export default AdminHomeIndex;