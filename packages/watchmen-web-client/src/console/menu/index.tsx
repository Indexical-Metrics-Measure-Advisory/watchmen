import {Router} from '@/routes/types';
import {
	ICON_ADMIN,
	ICON_DASHBOARD,
	ICON_DQC,
	ICON_HOME,
	ICON_IDW,
	ICON_IMPORT,
	ICON_LOGOUT,
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
import {
	isAdminAvailable,
	isDataQualityAvailable,
	isIndicatorAvailable,
	isIngestionAvailable,
	isMetricsAvailable
} from '@/widgets/common-settings/workbench-utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {matchPath, useLocation} from 'react-router-dom';
import styled from 'styled-components';
import {FavoriteMenu} from './side-menu-favorite';

const ConsoleMenuContainer = styled.div.attrs<{ width: number }>(({width}) => {
	return {
		'data-widget': 'console-menu',
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
	@media print {
		display : none;
		+ main {
			max-width : unset;
			div[data-widget="full-width-page"] {
				max-width : unset;
			}
		}
	}
`;

export const ConsoleMenu = () => {
	const location = useLocation();
	const {menuWidth, showTooltip, onResize} = useSideMenuWidth();
	const {account, navigateTo, logout} = useSideMenuRoutes(Lang.CONSOLE.BYE);

	// const onConnectSpaceClicked = useConnectSpace();

	const workbenches = [];
	// if (isIngestionAvailable()) {
	// 		workbenches.push({label: Lang.CONSOLE.MENU.TO_INGESTION, icon: ICON_IMPORT, action: navigateTo(Router.INGESTION)});
	// 	}

	if (isAdminAvailable()) {
		workbenches.push({label: Lang.CONSOLE.MENU.TO_ADMIN, icon: ICON_ADMIN, action: navigateTo(Router.ADMIN)});
	}

	// if (isMetricsAvailable()) {
	// 		workbenches.push({label: Lang.CONSOLE.MENU.TO_METRICS, icon: ICON_STATISTICS, action: navigateTo(Router.METRICS)});
	// 	}

	// if (isIndicatorAvailable()) {
	// 	workbenches.push({label: Lang.CONSOLE.MENU.TO_INDICATOR, icon: ICON_IDW, action: navigateTo(Router.IDW)});
	// }
	if (isDataQualityAvailable()) {
		workbenches.push({label: Lang.CONSOLE.MENU.TO_DATA_QUALITY, icon: ICON_DQC, action: navigateTo(Router.DQC)});
	}

	return <ConsoleMenuContainer width={menuWidth}>
		<SideMenuLogo title={Lang.CONSOLE.MENU.TITLE}/>
		<SideMenuItem icon={ICON_HOME} label={Lang.CONSOLE.MENU.HOME} showTooltip={showTooltip}
		              active={!!matchPath({path: Router.CONSOLE_HOME}, location.pathname)}
		              onClick={navigateTo(Router.CONSOLE_HOME)}/>
		<SideMenuItem icon={ICON_DASHBOARD} label={Lang.CONSOLE.MENU.DASHBOARDS} showTooltip={showTooltip}
		              active={!!matchPath({path: Router.CONSOLE_DASHBOARD_ALL}, location.pathname)}
		              onClick={navigateTo(Router.CONSOLE_DASHBOARD)}/>
		<FavoriteMenu showTooltip={showTooltip}/>
		{/*<SideMenuSeparator width={menuWidth}/>*/}
		{/*<SideMenuSpaces showTooltip={showTooltip}/>*/}
		{/*<SideMenuConnectSpace icon={ICON_ADD} label={Lang.CONSOLE.MENU.CONNECT_SPACE} showTooltip={showTooltip}*/}
		{/*                      onClick={onConnectSpaceClicked}/>*/}
		<SideMenuPlaceholder/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_SETTINGS} label={Lang.CONSOLE.MENU.SETTINGS} showTooltip={showTooltip}
		              active={!!matchPath({path: Router.CONSOLE_SETTINGS}, location.pathname)}
		              onClick={navigateTo(Router.CONSOLE_SETTINGS)}/>
		<SideMenuSwitchWorkbench icon={ICON_SWITCH_WORKBENCH}
		                         workbenches={workbenches}
		                         visible={workbenches.length !== 0}/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_LOGOUT} label={Lang.CONSOLE.MENU.LOGOUT} showTooltip={showTooltip} onClick={logout}/>
		<SideMenuUser name={account.name}/>
		<SideMenuResizeHandle width={menuWidth} onResize={onResize}/>
	</ConsoleMenuContainer>;
};