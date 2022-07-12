import {Achievement, AchievementId} from '@/services/data/tuples/achievement-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../../objective-analysis-event-bus-types';
import {CreateOrFindEditor} from './editor';
import {CreateOrFindViewer} from './viewer';

export const CreateOrFindAchievement = (props: {
	analysis: ObjectiveAnalysis;
	perspective: ObjectiveAnalysisPerspective;
	achievement: Achievement | null;
	onPicked: (achievementId: AchievementId) => void;
	onCleared: () => void;
}) => {
	const {achievement, onCleared, onPicked} = props;

	const {on, off} = useObjectiveAnalysisEventBus();
	const [visible, setVisible] = useState(true);
	useEffect(() => {
		const onSwitchToEdit = () => setVisible(true);
		const onSwitchToView = () => setVisible(false);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		return () => {
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		};
	}, [on, off, achievement]);

	if (!visible) {
		return null;
	}

	if (achievement == null) {
		return <CreateOrFindEditor onPicked={onPicked}/>;
	} else {
		return <CreateOrFindViewer achievement={achievement} onCleared={onCleared}/>;
	}
};