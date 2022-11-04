import {toObjectiveAnalysisEdit} from '@/routes/utils';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import React from 'react';
import {Navigate} from 'react-router-dom';

export const AnalysisEditor = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	return <Navigate to={toObjectiveAnalysisEdit(analysis.analysisId)}/>;
};
export const renderEditor = (analysis: ObjectiveAnalysis) => {
	return <AnalysisEditor analysis={analysis}/>;
};
