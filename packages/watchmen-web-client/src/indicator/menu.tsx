import {Router} from '@/routes/types';
import {findAccount, isAdmin, isSuperAdmin, quit} from '@/services/data/account';
import {
	ICON_ADMIN,
	ICON_BUCKETS,
	ICON_CONSOLE,
	ICON_DATA_QUALITY,
	ICON_INDICATOR_INDICATOR,
	ICON_INDICATOR_OBJECTIVE_ANALYSIS,
	ICON_LOGOUT,
	ICON_SETTINGS,
	ICON_SWITCH_WORKBENCH,
	MOCK_ACCOUNT_NAME,
	SIDE_MENU_MAX_WIDTH,
	SIDE_MENU_MIN_WIDTH
} from '@/widgets/basic/constants';
import {SideMenuItem} from '@/widgets/basic/side-menu/side-menu-item';
import {SideMenuLogo} from '@/widgets/basic/side-menu/side-menu-logo';
import {SideMenuPlaceholder} from '@/widgets/basic/side-menu/side-menu-placeholder';
import {SideMenuResizeHandle} from '@/widgets/basic/side-menu/side-menu-resize-handle';
import {SideMenuSeparator} from '@/widgets/basic/side-menu/side-menu-separator';
import {SideMenuSwitchWorkbench} from '@/widgets/basic/side-menu/side-menu-switch-workbench';
import {SideMenuUser} from '@/widgets/basic/side-menu/side-menu-user';
import {isAdminAvailable, isConsoleAvailable, isDataQualityAvailable} from '@/widgets/common-settings/workbench-utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {matchPath, useHistory, useLocation} from 'react-router-dom';
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
	const history = useHistory();
	const location = useLocation();
	const {on, off, fire} = useEventBus();
	const [menuWidth, setMenuWidth] = useState(SIDE_MENU_MIN_WIDTH);
	useEffect(() => {
		const onAskMenuWidth = (onWidthGet: (width: number) => void) => {
			onWidthGet(menuWidth);
		};
		on(EventTypes.ASK_SIDE_MENU_WIDTH, onAskMenuWidth);
		return () => {
			off(EventTypes.ASK_SIDE_MENU_WIDTH, onAskMenuWidth);
		};
	}, [on, off, fire, menuWidth]);

	const onResize = (newWidth: number) => {
		const width = Math.min(Math.max(newWidth, SIDE_MENU_MIN_WIDTH), SIDE_MENU_MAX_WIDTH);
		setMenuWidth(width);
		fire(EventTypes.SIDE_MENU_RESIZED, width);
	};
	const onMenuClicked = (path: string) => () => {
		if (!matchPath(location.pathname, path)) {
			history.push(path);
		}
	};
	const onLogoutClicked = () => {
		fire(EventTypes.SHOW_YES_NO_DIALOG,
			'Bye-bye now?',
			() => {
				fire(EventTypes.HIDE_DIALOG);
				quit();
				history.push(Router.LOGIN);
			},
			() => fire(EventTypes.HIDE_DIALOG));
	};

	const account = findAccount() || {name: MOCK_ACCOUNT_NAME};
	const showTooltip = menuWidth / SIDE_MENU_MIN_WIDTH <= 1.5;

	const workbenches = [];
	if (isConsoleAvailable()) {
		workbenches.push({
			label: Lang.CONSOLE.MENU.TO_CONSOLE,
			icon: ICON_CONSOLE,
			action: () => onMenuClicked(Router.CONSOLE)()
		});
	}
	if (isAdminAvailable()) {
		workbenches.push({
			label: Lang.CONSOLE.MENU.TO_ADMIN,
			icon: ICON_ADMIN,
			action: () => onMenuClicked(Router.ADMIN)()
		});
	}
	if (isDataQualityAvailable()) {
		workbenches.push({
			label: Lang.CONSOLE.MENU.TO_DATA_QUALITY,
			icon: ICON_DATA_QUALITY,
			action: () => onMenuClicked(Router.DATA_QUALITY)()
		});
	}

	return <IndicatorMenuContainer width={menuWidth}>
		<SideMenuLogo title={Lang.INDICATOR.MENU.TITLE}/>
		<SideMenuItem icon={ICON_BUCKETS} label={Lang.INDICATOR.MENU.BUCKETS}
		              showTooltip={showTooltip}
		              active={!!matchPath(location.pathname, Router.INDICATOR_BUCKETS)}
		              onClick={onMenuClicked(Router.INDICATOR_BUCKETS)}
		              visible={isAdmin() && !isSuperAdmin()}/>
		<SideMenuItem icon={ICON_INDICATOR_INDICATOR} label={Lang.INDICATOR.MENU.INDICATORS}
		              showTooltip={showTooltip}
		              active={!!matchPath(location.pathname, Router.INDICATOR_INDICATORS)}
		              onClick={onMenuClicked(Router.INDICATOR_INDICATORS)}
		              visible={isAdmin() && !isSuperAdmin()}/>
		{/*<SideMenuItem icon={ICON_INDICATOR_INSPECTION} label={Lang.INDICATOR.MENU.INSPECTIONS}*/}
		{/*              showTooltip={showTooltip}*/}
		{/*              active={!!matchPath(location.pathname, Router.INDICATOR_INSPECTION)}*/}
		{/*              onClick={onMenuClicked(Router.INDICATOR_INSPECTION)}*/}
		{/*              visible={isAdmin() && !isSuperAdmin()}/>*/}
		{/*<SideMenuItem icon={ICON_INDICATOR_ACHIEVEMENT} label={Lang.INDICATOR.MENU.ACHIEVEMENTS}*/}
		{/*              showTooltip={showTooltip}*/}
		{/*              active={!!matchPath(location.pathname, Router.INDICATOR_ACHIEVEMENT)}*/}
		{/*              onClick={onMenuClicked(Router.INDICATOR_ACHIEVEMENT)}*/}
		{/*              visible={isAdmin() && !isSuperAdmin()}/>*/}
		<SideMenuItem icon={ICON_INDICATOR_OBJECTIVE_ANALYSIS} label={Lang.INDICATOR.MENU.OBJECTIVE_ANALYSIS}
		              showTooltip={showTooltip}
		              active={!!matchPath(location.pathname, Router.INDICATOR_OBJECTIVE_ANALYSIS)}
		              onClick={onMenuClicked(Router.INDICATOR_OBJECTIVE_ANALYSIS)}
		              visible={isAdmin() && !isSuperAdmin()}/>
		<SideMenuPlaceholder/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_SETTINGS} label={Lang.INDICATOR.MENU.SETTINGS} showTooltip={showTooltip}
		              active={!!matchPath(location.pathname, Router.INDICATOR_SETTINGS)}
		              onClick={onMenuClicked(Router.INDICATOR_SETTINGS)}/>
		<SideMenuSwitchWorkbench icon={ICON_SWITCH_WORKBENCH}
		                         workbenches={workbenches}/>
		<SideMenuSeparator width={menuWidth}/>
		<SideMenuItem icon={ICON_LOGOUT} label={Lang.INDICATOR.MENU.LOGOUT} showTooltip={showTooltip}
		              onClick={onLogoutClicked}/>
		<SideMenuUser name={account.name}/>
		<SideMenuResizeHandle width={menuWidth} onResize={onResize}/>
	</IndicatorMenuContainer>;
};