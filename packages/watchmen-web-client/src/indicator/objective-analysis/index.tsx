import {Router} from '@/routes/types';
import {asFallbackNavigate, asIDWAnalysisRoute} from '@/routes/utils';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Routes} from 'react-router-dom';
import {ObjectiveAnalysisEditor} from './edit';
import ObjectiveAnalysisList from './list';
import {ObjectiveAnalysisListEventBusProvider} from './objective-analysis-list-event-bus';
import {ObjectiveAnalysisListState} from './objective-analysis-list-state';

const IndicatorObjectiveAnalysisIndex = () => {
	useHelp(HELP_KEYS.IDW_OBJECTIVE_ANALYSIS);

	return <ObjectiveAnalysisListEventBusProvider>
		<ObjectiveAnalysisListState/>
		<Routes>
			{asIDWAnalysisRoute(Router.IDW_OBJECTIVE_ANALYSIS_EDIT, <ObjectiveAnalysisEditor/>)}
			{asIDWAnalysisRoute(Router.IDW_OBJECTIVE_ANALYSIS, <ObjectiveAnalysisList/>)}
			{asFallbackNavigate(Router.IDW_OBJECTIVE_ANALYSIS)}
		</Routes>
	</ObjectiveAnalysisListEventBusProvider>;
};

export default IndicatorObjectiveAnalysisIndex;