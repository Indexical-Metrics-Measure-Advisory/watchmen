import {saveObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

export const ObjectiveAnalysisSaver = (props: { analysis: ObjectiveAnalysis }) => {
	// noinspection JSUnusedLocalSymbols
	const {analysis} = props;

	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useObjectiveAnalysisEventBus();

	useEffect(() => {
		const onSave = (analysis: ObjectiveAnalysis) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				await saveObjectiveAnalysis(analysis);
			});
		};
		on(ObjectiveAnalysisEventTypes.SAVE, onSave);
		on(ObjectiveAnalysisEventTypes.RENAMED, onSave);
		return () => {
			off(ObjectiveAnalysisEventTypes.SAVE, onSave);
			off(ObjectiveAnalysisEventTypes.RENAMED, onSave);
		};
	}, [on, off]);

	return <Fragment/>;
};