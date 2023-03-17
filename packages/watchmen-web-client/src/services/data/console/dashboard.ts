import {Router} from '@/routes/types';
import {askShareToken} from '../login';
import {Dashboard} from '../tuples/dashboard-types';

export const buildDashboardShareUrl = async (dashboard: Dashboard): Promise<string> => {
	// REMOTE use real api to retrieve dashboard share url
	const {protocol, host} = window.location;
	const path = Router.SHARE_DASHBOARD
		.replace(':dashboardId', dashboard.dashboardId)
		.replace(':token', askShareToken());
	return `${protocol}//${host}${path}`;
};
