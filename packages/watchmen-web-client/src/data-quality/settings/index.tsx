import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {SettingsPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {PersonalAccessToken} from '@/widgets/common-settings/personal-access-token';
import {ThemeSettings} from '@/widgets/common-settings/theme';
import React from 'react';
import {CacheSettings} from './cache';
import {ClassificationSettings} from './classification';

export const DataQualitySettings = () => {
	return <SettingsPage>
		<PageHeader title="Settings"/>
		<VerticalMarginOneUnit/>
		<ThemeSettings/>
		<PersonalAccessToken/>
		<ClassificationSettings/>
		<CacheSettings/>
		<VerticalMarginOneUnit/>
	</SettingsPage>;
};

const DataQualitySettingsIndex = () => {
	return <DataQualitySettings/>;
};

export default DataQualitySettingsIndex;