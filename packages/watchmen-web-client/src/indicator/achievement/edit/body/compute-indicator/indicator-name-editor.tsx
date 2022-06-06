import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {IndicatorNameEditor} from '../indicator-criteria/indicator-name-editor';

export const ComputeIndicatorNameEditor = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
}) => {
	const {achievement, achievementIndicator} = props;

	return <IndicatorNameEditor achievement={achievement} achievementIndicator={achievementIndicator}/>;
};