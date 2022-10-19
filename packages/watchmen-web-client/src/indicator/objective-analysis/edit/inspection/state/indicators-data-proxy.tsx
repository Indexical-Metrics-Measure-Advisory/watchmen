import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {QueryIndicator} from '@/services/data/tuples/query-indicator-types';
import {Fragment, useEffect} from 'react';
import {useInspectionEventBus} from '../../../../inspection/inspection-event-bus';
import {IndicatorForInspection, InspectionEventTypes} from '../../../../inspection/inspection-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

export const IndicatorsDataProxy = () => {
	const {on, off} = useInspectionEventBus();
	const {fire} = useObjectiveAnalysisEventBus();

	// indicator related
	useEffect(() => {
		const onAskIndicators = (onData: (indicators: Array<QueryIndicator>) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_INDICATORS, onData);
		};
		on(InspectionEventTypes.ASK_INDICATORS, onAskIndicators);
		return () => {
			off(InspectionEventTypes.ASK_INDICATORS, onAskIndicators);
		};
	}, [on, off, fire]);
	useEffect(() => {
		const onAskIndicator = (indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_INDICATOR, indicatorId, onData);
		};
		on(InspectionEventTypes.ASK_INDICATOR, onAskIndicator);
		return () => {
			off(InspectionEventTypes.ASK_INDICATOR, onAskIndicator);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};