import {Router} from '@/routes/types';
import {isAdmin} from '@/services/data/account';
import React from 'react';
import {Redirect, Route, Switch} from 'react-router-dom';
import styled from 'styled-components';
import IndicatorAchievementIndex from './achievement';
import IndicatorBucketsIndex from './bucket';
import IndicatorIndicatorIndex from './indicator';
import IndicatorInspectionIndex from './inspection';
import {IndicatorMenu} from './menu';
import IndicatorObjectiveAnalysisIndex from './objective-analysis';
import IndicatorSettingsIndex from './settings';

const IndicatorContainer = styled.div.attrs({'data-widget': 'indicator'})`
	display : flex;
`;
const IndicatorMain = styled.main.attrs<{ scrollable?: boolean }>(({scrollable = true}) => {
	return {
		'data-widget': 'indicator-main',
		'data-v-scroll': scrollable ? '' : (void 0),
		style: {
			overflowY: scrollable ? (void 0) : 'hidden',
			overflowX: scrollable ? (void 0) : 'hidden'
		}
	};
})<{ scrollable?: boolean }>`
	flex-grow  : 1;
	display    : flex;
	height     : 100vh;
	min-height : 100vh;
	overflow-y : scroll;
`;

const IndicatorIndex = () => {
	return <IndicatorContainer>
		<IndicatorMenu/>
		<Switch>
			{isAdmin()
				? <Route path={Router.INDICATOR_BUCKETS}>
					<IndicatorMain>
						<IndicatorBucketsIndex/>
					</IndicatorMain>
				</Route> : null}
			{isAdmin()
				? <Route path={Router.INDICATOR_INDICATORS}>
					<IndicatorMain>
						<IndicatorIndicatorIndex/>
					</IndicatorMain>
				</Route> : null}
			<Route path={Router.INDICATOR_INSPECTION}>
				<IndicatorMain>
					<IndicatorInspectionIndex/>
				</IndicatorMain>
			</Route>
			<Route path={Router.INDICATOR_ACHIEVEMENT}>
				<IndicatorMain scrollable={false}>
					<IndicatorAchievementIndex/>
				</IndicatorMain>
			</Route>
			<Route path={Router.INDICATOR_OBJECTIVE_ANALYSIS}>
				<IndicatorMain scrollable={false}>
					<IndicatorObjectiveAnalysisIndex/>
				</IndicatorMain>
			</Route>
			<Route path={Router.INDICATOR_SETTINGS}>
				<IndicatorMain>
					<IndicatorSettingsIndex/>
				</IndicatorMain>
			</Route>
			<Route path="*">
				<Redirect
					to={isAdmin() ? Router.INDICATOR_INDICATORS : Router.INDICATOR_INSPECTION}/>
			</Route>
		</Switch>
		{/*<WaterMark/>*/}
	</IndicatorContainer>;
};

export default IndicatorIndex;