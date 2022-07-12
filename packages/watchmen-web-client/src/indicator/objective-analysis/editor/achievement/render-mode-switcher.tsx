import {Achievement} from '@/services/data/tuples/achievement-types';
import {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../../../achievement/achievement-event-bus';
import {AchievementEventTypes, AchievementRenderMode} from '../../../achievement/achievement-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

export const RenderModeSwitcher = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const {fire} = useAchievementEventBus();
	const {on, off} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onSwitchToEdit = () => fire(AchievementEventTypes.SWITCH_RENDER_MODE, achievement, AchievementRenderMode.EDIT);
		const onSwitchToView = () => fire(AchievementEventTypes.SWITCH_RENDER_MODE, achievement, AchievementRenderMode.VIEW);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		return () => {
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};