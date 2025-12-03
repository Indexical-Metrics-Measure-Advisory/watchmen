import {Router} from '@/routes/types';
import {
	ICON_ADMIN,
	ICON_CATALOG,
	ICON_CONSANGUINITY,
	ICON_CONSOLE,
	ICON_END_USER,
	ICON_HOME,
	ICON_IDW,
	ICON_IMPORT,
	ICON_LOGOUT,
	ICON_RULE_DEFINE,
	ICON_SETTINGS,
	ICON_STATISTICS,
	ICON_SWITCH_WORKBENCH
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
import {isAdminAvailable, isConsoleAvailable, isIndicatorAvailable, isIngestionAvailable, isMetricsAvailable} from '@/widgets/common-settings/workbench-utils';
import { Lang } from '@/widgets/langs';
import React from 'react';
import {matchPath, useLocation} from 'react-router-dom';
import styled from 'styled-components';

const DataQualityMenuContainer = styled.div.attrs<{ width: number }>(({width}) => {
	return {
		'data-widget': 'data-quality-menu',
		style: {width}
	};
})<{ width: number }>`
	display          : flex;
	position         : relative;
	flex-direction   : column;
	align-items      : flex-start;
	min-width        : var(--console-menu-width);
	height           : 100vh;
	top              : 0;
	left             : 0;
	border-right     : var(--border);
	background-color : var(--invert-color);
	overflow         : hidden;
	+ main {
		max-width : ${({width}) => `calc(100vw - ${width}px)`};
		div[data-widget="full-width-page"] {
			max-width : ${({width}) => `calc(100vw - ${width}px)`};
		}
	}
`;

export const DataQualityMenu = () => {
	const location = useLocation();
	const {menuWidth, showTooltip, onResize} = useSideMenuWidth();
	const {account, navigateTo, logout} = useSideMenuRoutes('Bye-bye now?');

	const workbenches = [];

	// if (isIngestionAvailable()) {
	// 		workbenches.push({label: Lang.CONSOLE.MENU.TO_INGESTION, icon: ICON_IMPORT, action: navigateTo(Router.INGESTION)});
	// }

	if (isAdminAvailable()) {
		workbenches.push({label: 'To Admin', icon: ICON_ADMIN, action: navigateTo(Router.ADMIN)});
	}
	
	// if (isMetricsAvailable()) {
	// 		workbenches.push({label: Lang.CONSOLE.MENU.TO_METRICS, icon: ICON_STATISTICS, action: navigateTo(Router.METRICS)});
	// }

	// if (isConsoleAvailable()) {
	// 	workbenches.push({label: 'To Console', icon: ICON_CONSOLE, action: navigateTo(Router.CONSOLE)});
	// }
	
	// if (isIndicatorAvailable()) {
	// 	workbenches.push({label: 'To Indicator Workbench', icon: ICON_IDW, action: navigateTo(Router.IDW)});
	// }

	return <DataQualityMenuContainer width={menuWidth}>
		<SideMenuLogo title="Data Quality Center"/>
		<SideMenuItem icon={ICON_HOME} label="Home" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.DQC_HOME}, location.pathname)}
		              onClick={navigateTo(Router.DQC_HOME)}
		              visible={false}/>
		<SideMenuItem icon={ICON_STATISTICS} label="Run Statistics" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.DQC_STATISTICS}, location.pathname)}
		              onClick={navigateTo(Router.DQC_STATISTICS)}/>
		<SideMenuItem icon={ICON_CONSANGUINITY} label="Consanguinity" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.DQC_CONSANGUINITY}, location.pathname)}
		              onClick={navigateTo(Router.DQC_CONSANGUINITY)}/>
		<SideMenuItem icon={ICON_CATALOG} label="Catalog" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.DQC_CATALOG}, location.pathname)}
		              onClick={navigateTo(Router.DQC_CATALOG)}/>
		<SideMenuItem icon={ICON_RULE_DEFINE} label="Monitor Rules" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.DQC_RULES}, location.pathname)}
		              onClick={navigateTo(Router.DQC_RULES)}/>
		<SideMenuItem icon={ICON_END_USER} label="End User's Console" showTooltip={showTooltip}
		              active={!!matchPath({path: Router.DQC_END_USER}, location.pathname)}
		              onClick={navigateTo(Router.DQC_END_USER)}
		              visible={false}/>
		<SideMenuPlaceholder/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_SETTINGS} label={'Settings'} showTooltip={showTooltip}
		              active={!!matchPath({path: Router.DQC_SETTINGS}, location.pathname)}
		              onClick={navigateTo(Router.DQC_SETTINGS)}/>
		<SideMenuSwitchWorkbench icon={ICON_SWITCH_WORKBENCH}
		                         workbenches={workbenches}/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_LOGOUT} label={'Logout'} showTooltip={showTooltip} onClick={logout}/>
		<SideMenuUser name={account.name}/>
		<SideMenuResizeHandle width={menuWidth} onResize={onResize}/>
	</DataQualityMenuContainer>;
};