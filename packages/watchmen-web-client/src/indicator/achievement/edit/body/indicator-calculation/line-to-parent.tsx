import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {useIndicatorValuesCalculator} from '../indicator-values-calculator';
import {IndicatorPartRelationLine} from '../widgets';

export const LineToParent = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
}) => {
	const {achievement, achievementIndicator} = props;

	const calculatedValues = useIndicatorValuesCalculator(achievement, achievementIndicator);

	return <IndicatorPartRelationLine error={calculatedValues.loadFailed} warn={!calculatedValues.calculated}/>;
};