import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWIndicatorRoute} from '@/routes/utils';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Routes} from 'react-router-dom';
import {ObjectiveEditor} from './edit';
import ObjectiveList from './list';
import {ObjectiveListState} from './objective-list-state';
import {ObjectiveState} from './objective-state';
import {ObjectivesEventBusProvider} from './objectives-event-bus';

const ObjectiveRoute = () => {
	return <Routes>
		{asIDWIndicatorRoute(Router.IDW_OBJECTIVE_EDIT, <ObjectiveEditor/>)}
		{asIDWIndicatorRoute(Router.IDW_OBJECTIVE, <ObjectiveList/>)}
		{asFallbackNavigate(Router.IDW_OBJECTIVE)}
	</Routes>;
};

const ObjectiveIndex = () => {
	useHelp(HELP_KEYS.IDW_OBJECTIVE);

	return <ObjectivesEventBusProvider>
		<ObjectiveListState/>
		<ObjectiveState/>
		<ObjectiveRoute/>
	</ObjectivesEventBusProvider>;
};

export default ObjectiveIndex;