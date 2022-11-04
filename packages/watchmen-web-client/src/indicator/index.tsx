import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWRoute} from '@/routes/utils';
import {isAdmin} from '@/services/data/account';
import React, {ReactNode} from 'react';
import {Routes} from 'react-router-dom';
import styled from 'styled-components';
import IndicatorBucketsIndex from './bucket';
import IndicatorIndicatorIndex from './indicator';
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

const asRoute = (path: Router, children: ReactNode,
                 options: { wrapped?: boolean; scrollable?: boolean } = {wrapped: true, scrollable: true}) => {
	const {wrapped = true, scrollable = true} = options;
	if (wrapped) {
		return asIDWRoute(path, <IndicatorMain scrollable={scrollable}>{children}</IndicatorMain>);
	} else {
		return asIDWRoute(path, children);
	}
};

const IndicatorIndex = () => {
	return <IndicatorContainer>
		<IndicatorMenu/>
		<Routes>
			{isAdmin() ? asRoute(Router.IDW_BUCKETS, <IndicatorBucketsIndex/>) : null}
			{isAdmin() ? asRoute(Router.IDW_INDICATOR_ALL, <IndicatorIndicatorIndex/>) : null}
			{/*{isAdmin() ? asRoute(Router.IDW_INSPECTION, <IndicatorInspectionIndex/>) : null}*/}
			{/*{isAdmin() ? asRoute(Router.IDW_ACHIEVEMENT_ALL, <IndicatorAchievementIndex/>) : null}*/}
			{isAdmin()
				? asRoute(Router.IDW_OBJECTIVE_ANALYSIS_ALL, <IndicatorObjectiveAnalysisIndex/>, {scrollable: false})
				: null}
			{asRoute(Router.IDW_SETTINGS, <IndicatorSettingsIndex/>)}
			{isAdmin() ? asFallbackNavigate(Router.IDW_INDICATOR) : asFallbackNavigate(Router.IDW_OBJECTIVE_ANALYSIS)}
		</Routes>
		{/*<WaterMark/>*/}
	</IndicatorContainer>;
};

export default IndicatorIndex;