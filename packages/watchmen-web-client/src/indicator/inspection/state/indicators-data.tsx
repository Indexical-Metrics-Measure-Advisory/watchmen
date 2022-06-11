import {fetchIndicator, fetchIndicatorsForSelection} from '@/services/data/tuples/indicator';
import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {QueryIndicator} from '@/services/data/tuples/query-indicator-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect, useState} from 'react';
import {useInspectionEventBus} from '../inspection-event-bus';
import {IndicatorForInspection, InspectionEventTypes} from '../inspection-event-bus-types';

interface LoadedIndicators {
	loaded: boolean;
	data: Array<QueryIndicator>;
}

type LoadedIndicatorsForInspections = Record<IndicatorId, IndicatorForInspection>;

export const IndicatorsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useInspectionEventBus();

	const [indicators, setIndicators] = useState<LoadedIndicators>({loaded: false, data: []});
	const [indicatorsForInspections, setIndicatorsForInspections] = useState<LoadedIndicatorsForInspections>({});

	// indicator related
	useEffect(() => {
		const onAskIndicators = (onData: (indicators: Array<QueryIndicator>) => void) => {
			if (indicators.loaded) {
				onData(indicators.data);
			} else {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await fetchIndicatorsForSelection(''),
					(indicators: Array<QueryIndicator>) => {
						const sorted = indicators.sort((i1, i2) => {
							return (i1.name || '').localeCompare(i2.name || '', void 0, {
								sensitivity: 'base',
								caseFirst: 'upper'
							});
						});
						setIndicators({loaded: true, data: sorted});
						onData(sorted);
					});
			}
		};
		on(InspectionEventTypes.ASK_INDICATORS, onAskIndicators);
		return () => {
			off(InspectionEventTypes.ASK_INDICATORS, onAskIndicators);
		};
	}, [on, off, fireGlobal, indicators.loaded, indicators.data]);
	useEffect(() => {
		const onAskIndicator = (indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void) => {
			if (indicatorsForInspections[indicatorId] != null) {
				onData(indicatorsForInspections[indicatorId]);
			} else {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => {
						const {indicator, topic, subject, enums} = await fetchIndicator(indicatorId);
						return {indicator, topic, subject, enums};
					},
					({indicator, topic, subject, enums}: IndicatorForInspection) => {
						setIndicatorsForInspections(ifi => {
							return {...ifi, [indicatorId]: {indicator, topic, subject, enums: enums ?? []}};
						});
						onData({indicator, topic, subject, enums: enums ?? []});
					});
			}
		};
		on(InspectionEventTypes.ASK_INDICATOR, onAskIndicator);
		return () => {
			off(InspectionEventTypes.ASK_INDICATOR, onAskIndicator);
		};
	}, [on, off, fireGlobal, indicatorsForInspections]);

	return <Fragment/>;
};