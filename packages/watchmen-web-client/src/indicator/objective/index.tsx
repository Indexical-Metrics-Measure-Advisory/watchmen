import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWIndicatorRoute} from '@/routes/utils';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Routes} from 'react-router-dom';
import ObjectiveList from './list';
import {ObjectivesEventBusProvider} from './objectives-event-bus';

const ObjectiveRoute = () => {
	return <Routes>
		{asIDWIndicatorRoute(Router.IDW_OBJECTIVE_EDIT, <div/>)}
		{asIDWIndicatorRoute(Router.IDW_OBJECTIVE, <ObjectiveList/>)}
		{asFallbackNavigate(Router.IDW_OBJECTIVE)}
	</Routes>;
};

const ObjectiveIndex = () => {
	useHelp(HELP_KEYS.IDW_OBJECTIVE);

	return <ObjectivesEventBusProvider>
		<ObjectiveRoute/>
	</ObjectivesEventBusProvider>;
};

export default ObjectiveIndex;