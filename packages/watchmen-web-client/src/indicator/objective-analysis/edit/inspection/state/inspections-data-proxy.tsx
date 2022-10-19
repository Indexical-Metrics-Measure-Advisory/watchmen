import {Inspection, InspectionId} from '@/services/data/tuples/inspection-types';
import {QueryInspection} from '@/services/data/tuples/query-inspection-types';
import React, {Fragment, useEffect} from 'react';
import {useInspectionEventBus} from '../../../../inspection/inspection-event-bus';
import {InspectionEventTypes} from '../../../../inspection/inspection-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

export const InspectionsDataProxy = () => {
	const {on, off, fire} = useInspectionEventBus();
	const {fire: fireObjectiveAnalysis} = useObjectiveAnalysisEventBus();
	// inspection related
	useEffect(() => {
		const onAskInspections = (onData: (inspections: Array<QueryInspection>) => void) => {
			fireObjectiveAnalysis(ObjectiveAnalysisEventTypes.ASK_INSPECTIONS, onData);
		};
		on(InspectionEventTypes.ASK_INSPECTIONS, onAskInspections);
		return () => {
			off(InspectionEventTypes.ASK_INSPECTIONS, onAskInspections);
		};
	}, [on, off, fireObjectiveAnalysis]);
	useEffect(() => {
		const onAskInspection = (inspectionId: InspectionId, onData: (inspection: Inspection) => void) => {
			fireObjectiveAnalysis(ObjectiveAnalysisEventTypes.ASK_INSPECTION, inspectionId, onData);
		};
		on(InspectionEventTypes.ASK_INSPECTION, onAskInspection);
		return () => {
			off(InspectionEventTypes.ASK_INSPECTION, onAskInspection);
		};
	}, [on, off, fireObjectiveAnalysis]);
	useEffect(() => {
		const onSaveInspection = (inspection: Inspection, onSaved: (inspection: Inspection, saved: boolean) => void) => {
			fireObjectiveAnalysis(ObjectiveAnalysisEventTypes.SAVE_INSPECTION, inspection,
				(inspection, saved) => {
					if (saved) {
						fire(InspectionEventTypes.INSPECTION_SAVED, inspection);
					}
					onSaved(inspection, saved);
				});
		};
		on(InspectionEventTypes.SAVE_INSPECTION, onSaveInspection);
		return () => {
			off(InspectionEventTypes.SAVE_INSPECTION, onSaveInspection);
		};
	}, [on, off, fire, fireObjectiveAnalysis]);
	useEffect(() => {
		const onClearInspection = () => {
			fire(InspectionEventTypes.INSPECTION_CLEARED);
		};
		on(InspectionEventTypes.CLEAR_INSPECTION, onClearInspection);
		return () => {
			off(InspectionEventTypes.CLEAR_INSPECTION, onClearInspection);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};