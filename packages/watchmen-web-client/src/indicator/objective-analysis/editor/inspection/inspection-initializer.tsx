import {Inspection} from '@/services/data/tuples/inspection-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {Fragment, useEffect} from 'react';
import {useInspectionEventBus} from '../../../inspection/inspection-event-bus';
import {IndicatorForInspection, InspectionEventTypes} from '../../../inspection/inspection-event-bus-types';

export const InspectionInitializer = (props: { analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective }) => {
	const {perspective} = props;

	const {fire} = useInspectionEventBus();
	useEffect(() => {
		const inspectionId = perspective.relationId;
		if (inspectionId != null && inspectionId.trim().length !== 0) {
			fire(InspectionEventTypes.ASK_INSPECTION, inspectionId, (inspection: Inspection) => {
				fire(InspectionEventTypes.ASK_INDICATOR, inspection.indicatorId, (indicator: IndicatorForInspection) => {
					fire(InspectionEventTypes.INSPECTION_PICKED, inspection, indicator);
				});
			});
		}
	}, [fire, perspective]);

	return <Fragment/>;
};