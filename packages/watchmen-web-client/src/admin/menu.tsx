import {isMultipleDataSourcesEnabled, isPluginEnabled, isWriteExternalEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {isSuperAdmin} from '@/services/data/account';
import {
	ICON_CONSOLE,
	ICON_DATA_SOURCE,
	ICON_DQC,
	ICON_ENUM,
	ICON_EXTERNAL_WRITERS,
	ICON_HOME,
	ICON_IDW,
	ICON_LOGOUT,
	ICON_MAGIC_SPARKLES,
	ICON_MONITOR_LOGS,
	ICON_PIPELINE,
	ICON_PIPELINE_DEBUG,
	ICON_PLUGINS,
	ICON_REPORT,
	ICON_SETTINGS,
	ICON_SPACE,
	ICON_SWITCH_WORKBENCH,
	ICON_TENANT,
	ICON_TOOLBOX,
	ICON_TOPIC,
	ICON_USER,
	ICON_USER_GROUP
} from '@/widgets/basic/constants';
import {SideMenuItem} from '@/widgets/basic/side-menu/side-menu-item';
import {SideMenuLogo} from '@/widgets/basic/side-menu/side-menu-logo';
import {SideMenuPlaceholder} from '@/widgets/basic/side-menu/side-menu-placeholder';
import {SideMenuResizeHandle} from '@/widgets/basic/side-menu/side-menu-resize-handle';
import {SideMenuSeparator} from '@/widgets/basic/side-menu/side-menu-separator';
import {SideMenuSwitchWorkbench} from '@/widgets/basic/side-menu/side-menu-switch-workbench';
import {SideMenuUser} from '@/widgets/basic/side-menu/side-menu-user';
import {useSideMenuRoutes} from '@/widgets/basic/side-menu/use-side-menu-routes';
import {useSideMenuWidth} from '@/widgets/basic/side-menu/use-side-menu-width';
import {
	isConsoleAvailable,
	isDataQualityAvailable,
	isIndicatorAvailable
} from '@/widgets/common-settings/workbench-utils';
import React from 'react';
import {matchPath, useLocation} from 'react-router-dom';
import styled from 'styled-components';

// noinspection CssUnresolvedCustomProperty
const AdminMenuContainer = styled.div.attrs<{ width: number }>(({width}) => {
	return {
		'data-widget': 'admin-menu',
		style: {width}
	};
})<{ width: number }>`
    display: flex;
    position: relative;
    flex-direction: column;
    align-items: flex-start;
    min-width: var(--console-menu-width);
    height: 100vh;
    top: 0;
    left: 0;
    border-right: var(--border);
    background-color: var(--invert-color);
    overflow: hidden;

    + main {
        max-width: ${({width}) => `calc(100vw - ${width}px)`};

        div[data-widget="full-width-page"] {
            max-width: ${({width}) => `calc(100vw - ${width}px)`};
        }
    }
`;

export const AdminMenu = () => {
	const location = useLocation();
	const {menuWidth, showTooltip, onResize} = useSideMenuWidth();
	const {account, navigateTo, logout} = useSideMenuRoutes('Bye-bye now?');

	const workbenches = [];
	if (isConsoleAvailable()) {
		workbenches.push({label: 'To Console', icon: ICON_CONSOLE, action: navigateTo(Router.CONSOLE)});
	}
	if (isIndicatorAvailable()) {
		workbenches.push({label: 'To Indicator', icon: ICON_IDW, action: navigateTo(Router.IDW)});
	}
	if (isDataQualityAvailable()) {
		workbenches.push({label: 'To Data Quality Center', icon: ICON_DQC, action: navigateTo(Router.DQC)});
	}

	return <AdminMenuContainer width={menuWidth}>
		<SideMenuLogo title="DataMO Admin"/>
		<SideMenuItem icon={ICON_HOME} label="Home" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_HOME}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_HOME)}
		              visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_TOPIC} label="Topics" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_TOPICS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_TOPICS)}
		              visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_ENUM} label="Enumerations" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_ENUMS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_ENUMS)}
		              visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_REPORT} label="Reports" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_REPORTS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_REPORTS)}
		              visible={false}/>
		<SideMenuItem icon={ICON_SPACE} label="Spaces" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_SPACES}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_SPACES)}
		              visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_PIPELINE} label="Pipelines" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_PIPELINES_ALL}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_PIPELINES)}
		              visible={!isSuperAdmin()}/>
		<SideMenuSeparator width={menuWidth} visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_USER_GROUP} label="User Groups" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_USER_GROUPS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_USER_GROUPS)}
		              visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_TENANT} label="Data Zones" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_TENANTS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_TENANTS)}
		              visible={isSuperAdmin()}/>
		<SideMenuItem icon={ICON_DATA_SOURCE} label="Data Sources" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_DATA_SOURCES}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_DATA_SOURCES)}
		              visible={isSuperAdmin() && isMultipleDataSourcesEnabled()}/>
		<SideMenuItem icon={ICON_EXTERNAL_WRITERS} label="External Writers" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_EXTERNAL_WRITERS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_EXTERNAL_WRITERS)}
		              visible={isSuperAdmin() && isWriteExternalEnabled()}/>
		<SideMenuItem icon={ICON_PLUGINS} label="Plugins" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_PLUGINS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_PLUGINS)}
		              visible={isSuperAdmin() && isPluginEnabled()}/>
		<SideMenuItem icon={ICON_MAGIC_SPARKLES} label="AI Models" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_AI_MODEL}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_AI_MODEL)}
		              visible={isSuperAdmin()}/>
		<SideMenuItem icon={ICON_USER} label="Users" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_USERS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_USERS)}/>
		<SideMenuSeparator width={menuWidth} visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_PIPELINE_DEBUG} label="Simulator" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_SIMULATOR}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_SIMULATOR)}
		              visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_MONITOR_LOGS} label="Monitor Logs" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_MONITOR_LOGS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_MONITOR_LOGS)}
		              visible={!isSuperAdmin()}/>
		<SideMenuSeparator width={menuWidth} visible={!isSuperAdmin()}/>
		<SideMenuItem icon={ICON_TOOLBOX} label="Toolbox" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_TOOLBOX_ALL}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_TOOLBOX)}
		              visible={!isSuperAdmin()}/>
		<SideMenuPlaceholder/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_SETTINGS} label={'Settings'} showTooltip={showTooltip}
		              active={!!matchPath({path: Router.ADMIN_SETTINGS}, location.pathname)}
		              onClick={navigateTo(Router.ADMIN_SETTINGS)}
		              visible={!isSuperAdmin()}/>
		<SideMenuSwitchWorkbench icon={ICON_SWITCH_WORKBENCH} workbenches={workbenches} visible={!isSuperAdmin()}/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_LOGOUT} label={'Logout'} showTooltip={showTooltip} onClick={logout}/>
		<SideMenuUser name={account.name}/>
		<SideMenuResizeHandle width={menuWidth} onResize={onResize}/>
	</AdminMenuContainer>;
};
