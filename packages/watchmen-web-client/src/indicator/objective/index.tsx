import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWObjectiveRoute} from '@/routes/utils';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Routes} from 'react-router-dom';
import {ObjectiveEditor} from './edit';
import ObjectiveList from './list';
import {ObjectivesEventBusProvider} from './objectives-event-bus';
import {ObjectivesState} from './state';

const ObjectiveRoute = () => {
	return <Routes>
		{asIDWObjectiveRoute(Router.IDW_OBJECTIVE_EDIT, <ObjectiveEditor/>)}
		{asIDWObjectiveRoute(Router.IDW_OBJECTIVE, <ObjectiveList/>)}
		{asFallbackNavigate(Router.IDW_OBJECTIVE)}
	</Routes>;
};

const ObjectiveIndex = () => {
	useHelp(HELP_KEYS.IDW_OBJECTIVE);

	return <ObjectivesEventBusProvider>
		<ObjectivesState/>
		<ObjectiveRoute/>
	</ObjectivesEventBusProvider>;
};

export default ObjectiveIndex;