import {Router} from '@/routes/types';
import React from 'react';
import {Route, Switch} from 'react-router-dom';
import {IndicatorEditor} from './edit';
import {IndicatorListState} from './indicator-list-state';
import {IndicatorState} from './indicator-state';
import {IndicatorsEventBusProvider} from './indicators-event-bus';
import IndicatorList from './list';

const IndicatorWorkbenchRoute = () => {
	return <Switch>
		<Route path={Router.INDICATOR_WORKBENCH_INDICATOR_PREPARE}><IndicatorEditor/></Route>
		<Route path={Router.INDICATOR_WORKBENCH_INDICATORS}><IndicatorList/></Route>
	</Switch>;
};

const IndicatorWorkbenchIndicatorIndex = () => {
	return <IndicatorsEventBusProvider>
		<IndicatorListState/>
		<IndicatorState/>
		<IndicatorWorkbenchRoute/>
	</IndicatorsEventBusProvider>;
};

export default IndicatorWorkbenchIndicatorIndex;