import {Achievement} from '@/services/data/tuples/achievement-types';
import {PageHeaderButtons, PageHeaderButtonSeparator} from '@/widgets/basic/page-header-buttons';
import React from 'react';
import {BackToQueryButton} from './back-to-query';
import {NameEditor} from './name-editor';
import {SwitchIndicatorCandidatesButton} from './switch-indicator-candidates-button';
import {AchievementEditPageHeaderContainer} from './widgets';

export const AchievementEditPageHeader = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	return <AchievementEditPageHeaderContainer>
		<NameEditor achievement={achievement}/>
		<PageHeaderButtons>
			<BackToQueryButton/>
			<PageHeaderButtonSeparator/>
			<SwitchIndicatorCandidatesButton achievement={achievement}/>
		</PageHeaderButtons>
	</AchievementEditPageHeaderContainer>;
};