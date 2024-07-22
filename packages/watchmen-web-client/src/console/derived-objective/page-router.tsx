import {Router} from '@/routes/types';
import {asDerivedObjectiveRoute, asFallbackNavigate, toDerivedObjective} from '@/routes/utils';
import React from 'react';
import {Routes} from 'react-router-dom';
import {Copilot} from './copilot';
import {DerivedObjective} from "@/services/data/tuples/derived-objective-types";
import {DerivedObjectivePage} from "@/console/derived-objective/derived-objective";


export const DerivedObjectivePageRouter = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	return <Routes>
		{asDerivedObjectiveRoute(
			Router.CONSOLE_DERIVED_OBJECTIVE, <DerivedObjectivePage derivedObjective={derivedObjective}/>)}
		{asDerivedObjectiveRoute(
			Router.CONSOLE_DERIVED_OBJECTIVE_COPILOT, <Copilot derivedObjective={derivedObjective}/>)}
		{asFallbackNavigate(toDerivedObjective(derivedObjective.derivedObjectiveId) as Router)}
	</Routes>;
};