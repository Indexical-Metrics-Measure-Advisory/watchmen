import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';
import {Assistant} from './widgets';

export const RenderModeAssistant = () => {
	const [viewMode, setViewMode] = useState(false);
	const {on, off} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onSwitchToEdit = () => setViewMode(false);
		const onSwitchToView = () => setViewMode(true);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		return () => {
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		};
	}, [on, off]);

	return <Assistant viewMode={viewMode}/>;
};