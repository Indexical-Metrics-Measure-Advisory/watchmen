import {toObjectiveAnalysisEdit} from '@/routes/utils';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import React from 'react';
import {Redirect} from 'react-router-dom';

export const AnalysisEditor = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	return <Redirect to={toObjectiveAnalysisEdit(analysis.analysisId)}/>;
};
export const renderEditor = (analysis: ObjectiveAnalysis) => {
	return <AnalysisEditor analysis={analysis}/>;
};
