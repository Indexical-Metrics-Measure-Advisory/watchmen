import {Fragment, useEffect} from 'react';
import {useInspectionEventBus} from '../../../inspection/inspection-event-bus';
import {InspectionEventTypes, InspectionRenderMode} from '../../../inspection/inspection-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

export const RenderModeSwitcher = () => {
	const {fire} = useInspectionEventBus();
	const {on, off} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onSwitchToEdit = () => fire(InspectionEventTypes.SWITCH_RENDER_MODE, InspectionRenderMode.EDIT);
		const onSwitchToView = () => fire(InspectionEventTypes.SWITCH_RENDER_MODE, InspectionRenderMode.VIEW);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		return () => {
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};