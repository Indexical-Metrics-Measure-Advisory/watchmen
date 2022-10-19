import {Router} from '@/routes/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {Route, Switch} from 'react-router-dom';
import {ObjectiveAnalysisEditor} from './edit';
import ObjectiveAnalysisList from './list';
import {ObjectiveAnalysisListEventBusProvider} from './objective-analysis-list-event-bus';
import {ObjectiveAnalysisListState} from './objective-analysis-list-state';

const ObjectiveAnalysisRoute = () => {
	return <Switch>
		<Route path={Router.INDICATOR_OBJECTIVE_ANALYSIS_EDIT}><ObjectiveAnalysisEditor/></Route>
		<Route path={Router.INDICATOR_OBJECTIVE_ANALYSIS}><ObjectiveAnalysisList/></Route>
	</Switch>;
};

const IndicatorObjectiveAnalysisIndex = () => {
	useHelp(HELP_KEYS.INDICATOR_INDICATOR);

	return <ObjectiveAnalysisListEventBusProvider>
		<ObjectiveAnalysisListState/>
		<ObjectiveAnalysisRoute/>
	</ObjectiveAnalysisListEventBusProvider>;
};

export default IndicatorObjectiveAnalysisIndex;