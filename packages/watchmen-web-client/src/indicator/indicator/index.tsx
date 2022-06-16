import {Router} from '@/routes/types';
import React from 'react';
import {Route, Switch} from 'react-router-dom';
import {IndicatorEditor} from './edit';
import {IndicatorListState} from './indicator-list-state';
import {IndicatorState} from './indicator-state';
import {IndicatorsEventBusProvider} from './indicators-event-bus';
import IndicatorList from './list';

const IndicatorRoute = () => {
	return <Switch>
		<Route path={Router.INDICATOR_INDICATOR_PREPARE}><IndicatorEditor/></Route>
		<Route path={Router.INDICATOR_INDICATORS}><IndicatorList/></Route>
	</Switch>;
};

const IndicatorIndicatorIndex = () => {
	return <IndicatorsEventBusProvider>
		<IndicatorListState/>
		<IndicatorState/>
		<IndicatorRoute/>
	</IndicatorsEventBusProvider>;
};

export default IndicatorIndicatorIndex;