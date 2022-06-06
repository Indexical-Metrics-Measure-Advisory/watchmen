import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {IndicatorCriteriaDefData} from '../types';
import {IndicatorPartRelationLine} from '../widgets';
import {useCriteriaValidation} from './use-criteria-validation';

export const LineToParent = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, defData} = props;

	const {error, warn} = useCriteriaValidation({achievement, achievementIndicator, defData});

	return <IndicatorPartRelationLine error={error} warn={warn}/>;
};