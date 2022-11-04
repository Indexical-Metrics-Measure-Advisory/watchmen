import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWAchievementRoute} from '@/routes/utils';
import React from 'react';
import {Routes} from 'react-router-dom';
import {AchievementEdit} from '../edit';
import {AchievementQuery} from '../query';
import {AchievementStateHolder} from '../state';

export const AchievementRoute = () => {
	return <>
		<AchievementStateHolder/>
		<Routes>
			{asIDWAchievementRoute(Router.IDW_ACHIEVEMENT_EDIT, <AchievementEdit/>)}
			{asIDWAchievementRoute(Router.IDW_ACHIEVEMENT, <AchievementQuery/>)}
			{asFallbackNavigate(Router.IDW_ACHIEVEMENT)}
		</Routes>
	</>;
};