import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWStoryRoute} from '@/routes/utils';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Routes} from 'react-router-dom';
import {StoryEventBusProvider} from './story-event-bus';
// import {ConvergenceEditor} from './edit';
import StoryList from './list';
import {StoryEditor} from "@/indicator/story/edit";
// import {ConvergencesState} from './state';

const StoryRoute = () => {
	return <Routes>
		{asIDWStoryRoute(Router.IDW_STORY, <StoryList/>)}
		{asFallbackNavigate(Router.IDW_STORY)}
		{asIDWStoryRoute(Router.IDW_STORY_EDIT, <StoryEditor/>)}
	</Routes>;
};

const StoryIndex = () => {
	useHelp(HELP_KEYS.IDW_STORY);

	return <StoryEventBusProvider>
		{/*<ConvergencesState/>*/}
		<StoryRoute/>
	</StoryEventBusProvider>;
};

export default StoryIndex;