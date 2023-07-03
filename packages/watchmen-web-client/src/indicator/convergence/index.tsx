import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWConvergenceRoute} from '@/routes/utils';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Routes} from 'react-router-dom';
import {ConvergencesEventBusProvider} from './convergences-event-bus';
import ConvergenceList from './list';
import {ConvergencesState} from './state';

const ConvergenceRoute = () => {
	return <Routes>
		{/*{asIDWConvergenceRoute(Router.IDW_CONVERGENCE_EDIT, <ConvergenceEditor/>)}*/}
		{asIDWConvergenceRoute(Router.IDW_CONVERGENCE, <ConvergenceList/>)}
		{asFallbackNavigate(Router.IDW_CONVERGENCE)}
	</Routes>;
};

const ConvergenceIndex = () => {
	useHelp(HELP_KEYS.IDW_CONVERGENCE);

	return <ConvergencesEventBusProvider>
		<ConvergencesState/>
		<ConvergenceRoute/>
	</ConvergencesEventBusProvider>;
};

export default ConvergenceIndex;