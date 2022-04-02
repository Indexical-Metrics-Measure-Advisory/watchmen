import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {SettingsPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {PersonalAccessToken} from '@/widgets/common-settings/personal-access-token';
import {ThemeSettings} from '@/widgets/common-settings/theme';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {CacheSettings} from './cache';
import {SimulatorLogsSettings} from './simulator-logs';

export const AdminSettings = () => {
	useHelp(HELP_KEYS.SETTINGS);

	return <SettingsPage>
		<PageHeader title="Settings"/>
		<VerticalMarginOneUnit/>
		<ThemeSettings/>
		<PersonalAccessToken/>
		<CacheSettings/>
		<SimulatorLogsSettings/>
		<VerticalMarginOneUnit/>
	</SettingsPage>;
};

const AdminSettingsIndex = () => {
	return <AdminSettings/>;
};

export default AdminSettingsIndex;