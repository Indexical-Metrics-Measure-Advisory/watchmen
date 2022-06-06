import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect} from 'react';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {useCriteriaValidation} from './use-criteria-validation';
import {IndicatorCriteriaNode} from './widgets';

const NameLabel = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	topic?: Topic;
	subject?: SubjectForIndicator;
}) => {
	const {achievement, achievementIndicator, topic, subject} = props;
	const {criteria = []} = achievementIndicator;

	const {on, off} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onNameChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}
			forceUpdate();
		};
		on(AchievementEditEventTypes.INDICATOR_NAME_CHANGED, onNameChanged);
		return () => {
			off(AchievementEditEventTypes.INDICATOR_NAME_CHANGED, onNameChanged);
		};
	}, [on, off, forceUpdate, achievement, achievementIndicator]);

	if (topic == null && subject == null) {
		return <>{Lang.INDICATOR.ACHIEVEMENT.MISSED_INDICATOR_BASE}</>;
	} else if (criteria.length === 0) {
		return <>{Lang.INDICATOR.ACHIEVEMENT.NO_INDICATOR_CRITERIA_DEFINED}</>;
	} else if ((achievementIndicator.name || '').trim().length === 0) {
		return <span>{criteria.length} {Lang.INDICATOR.ACHIEVEMENT.INDICATOR_CRITERIA_DEFINED}</span>;
	} else {
		return <span>{(achievementIndicator.name || '').trim()}</span>;
	}
};

export const IndicatorCriteriaNodeContent = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, defData} = props;

	const {fire} = useAchievementEditEventBus();

	const onMouseEnter = () => {
		fire(AchievementEditEventTypes.EXPAND_CRITERIA, achievement, achievementIndicator);
	};
	const onClicked = () => {
		fire(AchievementEditEventTypes.EXPAND_CRITERIA, achievement, achievementIndicator);
	};

	const {error, warn} = useCriteriaValidation({achievement, achievementIndicator, defData});

	return <IndicatorCriteriaNode error={error} warn={warn}
	                              onMouseEnter={onMouseEnter} onClick={onClicked}>
		<NameLabel achievement={achievement} achievementIndicator={achievementIndicator}
		           topic={defData.topic} subject={defData.subject}/>
	</IndicatorCriteriaNode>;
};