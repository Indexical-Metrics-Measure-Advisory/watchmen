import {Router} from '@/routes/types';
import {asDQCRoute, asFallbackNavigate} from '@/routes/utils';
import {isAdmin, isSuperAdmin} from '@/services/data/account';
import React, {ReactNode} from 'react';
import {Navigate, Routes} from 'react-router-dom';
import styled from 'styled-components';
import {DataQualityCache} from './cache';
import {DataQualityCacheEventBusProvider} from './cache/cache-event-bus';
import DataQualityCatalog from './catalog';
import DataQualityConsanguinity from './consanguinity';
import {DataQualityMenu} from './menu';
import DataQualityMonitorRules from './rules';
import DataQualitySettings from './settings';
import DataQualityStatistics from './statistics';

const DataQualityContainer = styled.div.attrs({'data-widget': 'data-quality'})`
	display : flex;
`;
const DataQualityMain = styled.main.attrs<{ scrollable?: boolean }>(({scrollable = true}) => {
	return {
		'data-widget': 'data-quality-main',
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
		return asDQCRoute(path, <DataQualityMain scrollable={scrollable}>{children}</DataQualityMain>);
	} else {
		return asDQCRoute(path, children);
	}
};

const DataQualityIndex = () => {
	if (!isAdmin()) {
		return <Navigate to={Router.CONSOLE_HOME}/>;
	}
	if (isSuperAdmin()) {
		return <Navigate to={Router.ADMIN}/>;
	}

	return <DataQualityContainer>
		<DataQualityCacheEventBusProvider>
			<DataQualityCache/>
			<DataQualityMenu/>

			<Routes>
				{/*{asRoute(Router.DATA_QUALITY_HOME, <DataQualityHome/>, {scrollable: false})}*/}
				{asRoute(Router.DQC_CONSANGUINITY, <DataQualityConsanguinity/>, {scrollable: false})}
				{asRoute(Router.DQC_CATALOG, <DataQualityCatalog/>, {scrollable: false})}
				{asRoute(Router.DQC_RULES, <DataQualityMonitorRules/>, {scrollable: false})}
				{asRoute(Router.DQC_STATISTICS, <DataQualityStatistics/>, {scrollable: false})}
				{/*{asRoute(Router.DATA_QUALITY_END_USER, <DataQualityEndUser/>, {scrollable: false})}*/}
				{asRoute(Router.DQC_SETTINGS, <DataQualitySettings/>)}
				{asFallbackNavigate(Router.DQC_STATISTICS)}
			</Routes>
		</DataQualityCacheEventBusProvider>
	</DataQualityContainer>;
};

export default DataQualityIndex;