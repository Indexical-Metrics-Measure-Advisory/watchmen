import {Indicator} from '@/services/data/tuples/indicator-types';
import {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../../../../achievement/achievement-event-bus';
import {AchievementEventTypes} from '../../../../achievement/achievement-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../../objective-analysis-event-bus-types';

export const IndicatorsDataProxy = () => {
	const {on, off} = useAchievementEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onAskIndicators = (onData: (indicators: Array<Indicator>) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_INDICATORS, onData);
		};
		on(AchievementEventTypes.ASK_INDICATORS, onAskIndicators);
		return () => {
			off(AchievementEventTypes.ASK_INDICATORS, onAskIndicators);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};