import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWRoute} from '@/routes/utils';
import {isAdmin} from '@/services/data/account';
import React, {ReactNode} from 'react';
import {Navigate, Routes} from 'react-router-dom';
import styled from 'styled-components';
import IndicatorBucketsIndex from './bucket';
import IndicatorConvergenceIndex from './convergence';
import IndicatorIndicatorIndex from './indicator';
import {IndicatorMenu} from './menu';
import IndicatorObjectiveIndex from './objective';
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
	if (!isAdmin()) {
		return <Navigate to={Router.CONSOLE_HOME}/>;
	}

	return <IndicatorContainer>
		<IndicatorMenu/>
		<Routes>
			{asRoute(Router.IDW_BUCKETS, <IndicatorBucketsIndex/>)}
			{asRoute(Router.IDW_INDICATOR_ALL, <IndicatorIndicatorIndex/>)}
			{asRoute(Router.IDW_OBJECTIVE_ALL, <IndicatorObjectiveIndex/>)}
			{asRoute(Router.IDW_CONVERGENCE_ALL, <IndicatorConvergenceIndex/>)}
			{asRoute(Router.IDW_SETTINGS, <IndicatorSettingsIndex/>)}
			{asFallbackNavigate(Router.IDW_INDICATOR)}
		</Routes>
	</IndicatorContainer>;
};

export default IndicatorIndex;