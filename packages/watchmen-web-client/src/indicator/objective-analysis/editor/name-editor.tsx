import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {PageTitleEditor} from '@/widgets/basic/page-title-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import React from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

export const NameEditor = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const {fire} = useObjectiveAnalysisEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChange = async (title: string) => {
		analysis.title = title;
		forceUpdate();
	};
	const onNameChangeComplete = async (title: string) => {
		analysis.title = title.trim() || 'Noname';
		forceUpdate();
		fire(ObjectiveAnalysisEventTypes.RENAMED, analysis);
	};

	return <PageTitleEditor title={analysis.title}
	                        defaultTitle="Noname"
	                        onChange={onNameChange} onChangeComplete={onNameChangeComplete}/>;
};