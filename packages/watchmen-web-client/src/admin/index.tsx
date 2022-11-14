import {isMultipleDataSourcesEnabled, isPluginEnabled, isWriteExternalEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {asAdminRoute, asFallbackNavigate} from '@/routes/utils';
import {isAdmin, isSuperAdmin} from '@/services/data/account';
import React, {ReactNode} from 'react';
import {Navigate, Routes} from 'react-router-dom';
import styled from 'styled-components';
import {AdminCache} from './cache';
import {AdminCacheEventBusProvider} from './cache/cache-event-bus';
import AdminDataSources from './data-sources';
import AdminEnums from './enums';
import AdminExternalWriters from './external-writers';
import AdminHome from './home';
import {AdminMenu} from './menu';
import AdminMonitorLogs from './monitor-log';
import AdminPipelines from './pipelines';
import AdminPlugins from './plugins';
import AdminSettings from './settings';
import AdminDebug from './simulator';
import AdminSpaces from './spaces';
import AdminTenants from './tenants';
import AdminToolbox from './toolbox';
import {TopicProfile} from './topic-profile';
import {TopicProfileEventBusProvider} from './topic-profile/topic-profile-event-bus';
import AdminTopics from './topics';
import AdminUserGroups from './user-groups';
import AdminUsers from './users';

const AdminContainer = styled.div.attrs({'data-widget': 'admin'})`
	display : flex;
`;
const AdminMain = styled.main.attrs<{ scrollable?: boolean }>(({scrollable = true}) => {
	return {
		'data-widget': 'admin-main',
		'data-v-scroll': scrollable ? '' : (void 0),
		style: {
			overflowY: scrollable ? (void 0) : 'hidden',
			overflowX: scrollable ? (void 0) : 'hidden'
		}
	};
})<{ scrollable?: boolean }>`
	flex-grow  : 1;
	display    : flex;
	height     : 100vh;
	min-height : 100vh;
	overflow-y : scroll;
`;

const asRoute = (path: Router, children: ReactNode,
                 options: { wrapped?: boolean; scrollable?: boolean } = {wrapped: true, scrollable: true}) => {
	const {wrapped = true, scrollable = true} = options;
	if (wrapped) {
		return asAdminRoute(path, <AdminMain scrollable={scrollable}>{children}</AdminMain>);
	} else {
		return asAdminRoute(path, children);
	}
};

const AdminIndex = () => {
	if (!isAdmin() && !isSuperAdmin()) {
		return <Navigate to={Router.CONSOLE_HOME}/>;
	}

	return <AdminContainer>
		<AdminCacheEventBusProvider>
			<TopicProfileEventBusProvider>
				<AdminCache/>
				<AdminMenu/>

				{isSuperAdmin()
					? <Routes>
						{asRoute(Router.ADMIN_USERS, <AdminUsers/>)}
						{asRoute(Router.ADMIN_TENANTS, <AdminTenants/>)}
						{isMultipleDataSourcesEnabled()
							? asRoute(Router.ADMIN_DATA_SOURCES, <AdminDataSources/>) : null}
						{isWriteExternalEnabled()
							? asRoute(Router.ADMIN_EXTERNAL_WRITERS, <AdminExternalWriters/>) : null}
						{isPluginEnabled() ? asRoute(Router.ADMIN_PLUGINS, <AdminPlugins/>) : null}
						{asFallbackNavigate(Router.ADMIN_TENANTS)}
					</Routes>
					: <Routes>
						{asRoute(Router.ADMIN_HOME, <AdminHome/>, {scrollable: false})}
						{asRoute(Router.ADMIN_TOPICS, <AdminTopics/>)}
						{asRoute(Router.ADMIN_ENUMS, <AdminEnums/>)}
						{/*{asRoute(Router.ADMIN_REPORTS, <AdminReports/>)}*/}
						{asRoute(Router.ADMIN_SPACES, <AdminSpaces/>)}
						{asRoute(Router.ADMIN_PIPELINES_ALL, <AdminPipelines/>, {wrapped: false})}
						{asRoute(Router.ADMIN_USER_GROUPS, <AdminUserGroups/>)}
						{asRoute(Router.ADMIN_USERS, <AdminUsers/>)}
						{asRoute(Router.ADMIN_TENANTS, <AdminTenants/>)}
						{asRoute(Router.ADMIN_MONITOR_LOGS, <AdminMonitorLogs/>, {scrollable: false})}
						{asRoute(Router.ADMIN_SIMULATOR, <AdminDebug/>, {wrapped: false})}
						{asRoute(Router.ADMIN_TOOLBOX_ALL, <AdminToolbox/>)}
						{asRoute(Router.ADMIN_SETTINGS, <AdminSettings/>)}
						{asFallbackNavigate(Router.ADMIN_HOME)}
					</Routes>
				}
				<TopicProfile/>
			</TopicProfileEventBusProvider>
		</AdminCacheEventBusProvider>
	</AdminContainer>;
};

export default AdminIndex;