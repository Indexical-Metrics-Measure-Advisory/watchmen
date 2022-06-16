import {Enum, EnumId} from '@/services/data/tuples/enum-types';
import {Fragment, useEffect} from 'react';
import {useInspectionEventBus} from '../../../../inspection/inspection-event-bus';
import {InspectionEventTypes} from '../../../../inspection/inspection-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../../objective-analysis-event-bus-types';

export const EnumsDataProxy = () => {
	const {on, off} = useInspectionEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onAskEnum = async (enumId: EnumId, onData: (enumeration?: Enum) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_ENUM, enumId, onData);
		};
		on(InspectionEventTypes.ASK_ENUM, onAskEnum);
		return () => {
			off(InspectionEventTypes.ASK_ENUM, onAskEnum);
		};
	}, [on, off, fire]);
	return <Fragment/>;
};