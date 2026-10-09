import {SettingsPage} from '@/widgets/basic/page';
import {PersonalAccessToken} from '@/widgets/common-settings/personal-access-token';
import {ThemeSettings} from '@/widgets/common-settings/theme';
import React from 'react';
import {AmbientBody, HeroHeader, HeroSubtitle, HeroTitle} from '../widgets/kit';
import {CacheSettings} from './cache';
import {ClassificationSettings} from './classification';

export const DataQualitySettings = () => {
	return <SettingsPage>
		<HeroHeader>
			<div>
				<HeroTitle>Settings</HeroTitle>
				<HeroSubtitle>Theme, access tokens, classification and cache of the workbench.</HeroSubtitle>
			</div>
		</HeroHeader>
		<ThemeSettings/>
		<PersonalAccessToken/>
		<ClassificationSettings/>
		<CacheSettings/>
	</SettingsPage>;
};

const DataQualitySettingsIndex = () => {
	return <AmbientBody>
		<DataQualitySettings/>
	</AmbientBody>;
};

export default DataQualitySettingsIndex;