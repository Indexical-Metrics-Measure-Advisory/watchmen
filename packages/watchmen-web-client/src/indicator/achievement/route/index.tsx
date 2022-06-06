import {Router} from '@/routes/types';
import React from 'react';
import {Redirect, Route, Switch} from 'react-router-dom';
import {AchievementEdit} from '../edit';
import {AchievementQuery} from '../query';
import {Indicators} from './indicators';
import {MeasureBuckets} from './measure-buckets';
import {AchievementState} from './state';
import {Topics} from './topics';
import {ValueBuckets} from './value-buckets';

export const AchievementRoute = () => {
	return <>
		<Topics/>
		<ValueBuckets/>
		<MeasureBuckets/>
		<Indicators/>
		<AchievementState/>
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