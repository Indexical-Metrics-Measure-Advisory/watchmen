import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {Perspective} from './perspective';

export const Perspectives = (props: {
	analysis: ObjectiveAnalysis;
	startOnView: boolean;
}) => {
	const {analysis, startOnView} = props;

	const {on, off, fire} = useObjectiveAnalysisEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onDeletePerspective = (anAnalysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective) => {
			if (anAnalysis !== analysis) {
				return;
			}

			analysis.perspectives = (analysis.perspectives || []).filter(p => p !== perspective);
			fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
			forceUpdate();
		};
		on(ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, onDeletePerspective);
		return () => {
			off(ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, onDeletePerspective);
		};
	}, [on, off, fire, forceUpdate, analysis]);
	useEffect(() => {
		const onPerspectiveAdded = (anAnalysis: ObjectiveAnalysis) => {
			if (anAnalysis !== analysis) {
				return;
			}

			forceUpdate();
		};
		on(ObjectiveAnalysisEventTypes.PERSPECTIVE_ADDED, onPerspectiveAdded);
		return () => {
			off(ObjectiveAnalysisEventTypes.PERSPECTIVE_ADDED, onPerspectiveAdded);
		};
	}, [on, off, forceUpdate, analysis]);

	return <>
		{(analysis.perspectives || []).map(perspective => {
			return <Perspective analysis={analysis} perspective={perspective} startOnView={startOnView}
			                    key={perspective.perspectiveId}/>;
		})}
	</>;
};