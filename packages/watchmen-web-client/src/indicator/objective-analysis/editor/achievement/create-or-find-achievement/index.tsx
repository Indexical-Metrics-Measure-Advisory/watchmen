import {Achievement, AchievementId} from '@/services/data/tuples/achievement-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../../objective-analysis-event-bus-types';
import {CreateOrFindEditor} from './editor';
import {CreateOrFindViewer} from './viewer';
import {NoAchievement} from './widgets';

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

	switch (true) {
		case !visible && achievement == null:
			return <NoAchievement>
				{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_ACHIEVEMENT}
			</NoAchievement>;
		case !visible:
			return null;
		case achievement == null:
			return <CreateOrFindEditor onPicked={onPicked}/>;
		case achievement != null:
			return <CreateOrFindViewer achievement={achievement!} onCleared={onCleared}/>;
		default:
			return null;
	}
};