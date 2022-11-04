import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWIndicatorRoute} from '@/routes/utils';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Routes} from 'react-router-dom';
import {IndicatorEditor} from './edit';
import {IndicatorListState} from './indicator-list-state';
import {IndicatorState} from './indicator-state';
import {IndicatorsEventBusProvider} from './indicators-event-bus';
import IndicatorList from './list';

const IndicatorRoute = () => {
	return <Routes>
		{asIDWIndicatorRoute(Router.IDW_INDICATOR_EDIT, <IndicatorEditor/>)}
		{asIDWIndicatorRoute(Router.IDW_INDICATOR, <IndicatorList/>)}
		{asFallbackNavigate(Router.IDW_INDICATOR)}
	</Routes>;
};

const IndicatorIndicatorIndex = () => {
	useHelp(HELP_KEYS.IDW_INDICATOR);

	return <IndicatorsEventBusProvider>
		<IndicatorListState/>
		<IndicatorState/>
		<IndicatorRoute/>
	</IndicatorsEventBusProvider>;
};

export default IndicatorIndicatorIndex;