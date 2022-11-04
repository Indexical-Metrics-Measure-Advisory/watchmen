import {fetchObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis, ObjectiveAnalysisId} from '@/services/data/tuples/objective-analysis-types';
import {FullWidthPage} from '@/widgets/basic/page';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Body} from './body';
import {DataHolder} from './data-holder';
import {Header} from './header';
import {ObjectiveAnalysisEventBusProvider} from './objective-analysis-event-bus';
import {ObjectiveAnalysisSaver} from './saver';

export const ObjectiveAnalysisEditor = () => {
	const analysisId = useParams<{ analysisId: ObjectiveAnalysisId }>().analysisId!;

	const {fire: fireGlobal} = useEventBus();
	const [analysis, setAnalysis] = useState<ObjectiveAnalysis | null>(null);
	useHelp(HELP_KEYS.IDW_OBJECTIVE_ANALYSIS);
	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await fetchObjectiveAnalysis(analysisId);
		}, (analysis: ObjectiveAnalysis) => setAnalysis(analysis));
	}, [fireGlobal, analysisId]);

	if (analysis == null) {
		return null;
	}

	return <ObjectiveAnalysisEventBusProvider>
		<DataHolder/>
		<ObjectiveAnalysisSaver analysis={analysis}/>
		<FullWidthPage>
			<Header analysis={analysis} startOnView={false}/>
			<Body analysis={analysis}/>
		</FullWidthPage>
	</ObjectiveAnalysisEventBusProvider>;
};
