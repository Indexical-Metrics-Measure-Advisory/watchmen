import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

export const useViewModeSwitch = (startOnView: boolean) => {
	const {on, off} = useObjectiveAnalysisEventBus();
	const [onViewMode, setOnViewMode] = useState(startOnView);
	useEffect(() => {
		const onSwitchToEdit = () => setOnViewMode(false);
		const onSwitchToView = () => setOnViewMode(true);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		return () => {
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		};
	}, [on, off]);

	return onViewMode;
};