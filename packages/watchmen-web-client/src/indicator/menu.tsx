import {Router} from '@/routes/types';
import {isAdmin, isSuperAdmin} from '@/services/data/account';
import {
	ICON_ADMIN,
	ICON_BUCKETS,
	ICON_CONSOLE,
	ICON_CONVERGENCE,
	ICON_DQC,
	ICON_INDICATOR,
	ICON_LOGOUT,
	ICON_OBJECTIVE,
	ICON_SETTINGS,
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
import {isAdminAvailable, isConsoleAvailable, isDataQualityAvailable} from '@/widgets/common-settings/workbench-utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {matchPath, useLocation} from 'react-router-dom';
import styled from 'styled-components';

const IndicatorMenuContainer = styled.div.attrs<{ width: number }>(({width}) => {
	return {
		'data-widget': 'indicator-menu',
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
	@page {
		size   : A4 landscape;
		margin : 0 15mm;
	}
	@media print {
		display : none;
		+ main {
			max-width  : unset;
			height     : unset;
			overflow-y : unset;
			div[data-widget="full-width-page"] {
				max-width : unset;
			}
		}
	}
`;

export const IndicatorMenu = () => {
	const location = useLocation();
	const {menuWidth, showTooltip, onResize} = useSideMenuWidth();
	const {account, navigateTo, logout} = useSideMenuRoutes(Lang.CONSOLE.BYE);

	const workbenches = [];
	if (isConsoleAvailable()) {
		workbenches.push({label: Lang.CONSOLE.MENU.TO_CONSOLE, icon: ICON_CONSOLE, action: navigateTo(Router.CONSOLE)});
	}
	if (isAdminAvailable()) {
		workbenches.push({label: Lang.CONSOLE.MENU.TO_ADMIN, icon: ICON_ADMIN, action: navigateTo(Router.ADMIN)});
	}
	if (isDataQualityAvailable()) {
		workbenches.push({label: Lang.CONSOLE.MENU.TO_DATA_QUALITY, icon: ICON_DQC, action: navigateTo(Router.DQC)});
	}

	return <IndicatorMenuContainer width={menuWidth}>
		<SideMenuLogo title={Lang.INDICATOR.MENU.TITLE}/>
		<SideMenuItem icon={ICON_BUCKETS} label={Lang.INDICATOR.MENU.BUCKETS}
		              showTooltip={showTooltip}
		              active={!!matchPath({path: Router.IDW_BUCKETS}, location.pathname)}
		              onClick={navigateTo(Router.IDW_BUCKETS)}
		              visible={isAdmin() && !isSuperAdmin()}/>
		<SideMenuItem icon={ICON_INDICATOR} label={Lang.INDICATOR.MENU.INDICATORS}
		              showTooltip={showTooltip}
		              active={!!matchPath({path: Router.IDW_INDICATOR_ALL}, location.pathname)}
		              onClick={navigateTo(Router.IDW_INDICATOR)}
		              visible={isAdmin() && !isSuperAdmin()}/>
		<SideMenuItem icon={ICON_OBJECTIVE} label={Lang.INDICATOR.MENU.OBJECTIVES}
		              showTooltip={showTooltip}
		              active={!!matchPath({path: Router.IDW_OBJECTIVE_ALL}, location.pathname)}
		              onClick={navigateTo(Router.IDW_OBJECTIVE)}
		              visible={isAdmin() && !isSuperAdmin()}/>
		<SideMenuItem icon={ICON_CONVERGENCE} label={Lang.INDICATOR.MENU.CONVERGENCES}
		              showTooltip={showTooltip}
		              active={!!matchPath({path: Router.IDW_CONVERGENCE_ALL}, location.pathname)}
		              onClick={navigateTo(Router.IDW_CONVERGENCE)}
		              visible={isAdmin() && !isSuperAdmin()}/>
		<SideMenuPlaceholder/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_SETTINGS} label={Lang.INDICATOR.MENU.SETTINGS} showTooltip={showTooltip}
		              active={!!matchPath({path: Router.IDW_SETTINGS}, location.pathname)}
		              onClick={navigateTo(Router.IDW_SETTINGS)}/>
		<SideMenuSwitchWorkbench icon={ICON_SWITCH_WORKBENCH}
		                         workbenches={workbenches}/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_LOGOUT} label={Lang.INDICATOR.MENU.LOGOUT} showTooltip={showTooltip}
		              onClick={logout}/>
		<SideMenuUser name={account.name}/>
		<SideMenuResizeHandle width={menuWidth} onResize={onResize}/>
	</IndicatorMenuContainer>;
};