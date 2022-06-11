import {Router} from '@/routes/types';
import React from 'react';
import {Redirect, Route, Switch} from 'react-router-dom';
import {AchievementEdit} from '../edit';
import {AchievementQuery} from '../query';
import {AchievementStateHolder} from '../state';

export const AchievementRoute = () => {
	return <>
		<AchievementStateHolder/>
		<Switch>
			<Route path={Router.INDICATOR_ACHIEVEMENT_QUERY}>
				<AchievementQuery/>
			</Route>
			<Route path={Router.INDICATOR_ACHIEVEMENT_EDIT}>
				<AchievementEdit/>
			</Route>
			<Route path="*">
				<Redirect to={Router.INDICATOR_ACHIEVEMENT_QUERY}/>
			</Route>
		</Switch>
	</>;
};