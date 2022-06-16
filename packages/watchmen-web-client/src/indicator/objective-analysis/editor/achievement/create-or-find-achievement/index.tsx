import {Achievement, AchievementId} from '@/services/data/tuples/achievement-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
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

	if (achievement == null) {
		return <CreateOrFindEditor onPicked={onPicked}/>;
	} else {
		return <CreateOrFindViewer achievement={achievement} onCleared={onCleared}/>;
	}
};