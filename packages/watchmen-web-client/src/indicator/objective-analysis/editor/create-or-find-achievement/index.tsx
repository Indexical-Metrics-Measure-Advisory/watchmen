import {useObjectiveAnalysisEventBus} from '@/indicator/objective-analysis/objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '@/indicator/objective-analysis/objective-analysis-event-bus-types';
import {fetchAchievement} from '@/services/data/tuples/achievement';
import {Achievement, AchievementId} from '@/services/data/tuples/achievement-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useEffect, useState} from 'react';
import {CreateOrFindEditor} from './editor';
import {CreateOrFindViewer} from './viewer';

export const CreateOrFindAchievement = (props: {
	analysis: ObjectiveAnalysis;
	perspective: ObjectiveAnalysisPerspective;
	onPicked: (achievementId: AchievementId) => void;
	onCleared: () => void;
}) => {
	const {analysis, perspective, onCleared, onPicked} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const [achievement, setAchievement] = useState<Achievement | null>(null);
	useEffect(() => {
		const achievementId = perspective.relationId;
		if (achievementId != null && achievementId.length !== 0) {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				const {achievement} = await fetchAchievement(achievementId);
				return achievement;
			}, (achievement: Achievement) => {
				setAchievement(achievement);
			});
		}
	}, [fireGlobal, perspective.relationId]);
	const forceUpdate = useForceUpdate();

	const onAchievementPicked = (achievementId: AchievementId) => {
		perspective.relationId = achievementId;
		onPicked(achievementId);
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		forceUpdate();
	};
	const onAchievementCleared = () => {
		delete perspective.relationId;
		onCleared();
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		setAchievement(null);
	};

	if (achievement == null) {
		return <CreateOrFindEditor onPicked={onAchievementPicked}/>;
	} else {
		return <CreateOrFindViewer achievement={achievement} onCleared={onAchievementCleared}/>;
	}
};