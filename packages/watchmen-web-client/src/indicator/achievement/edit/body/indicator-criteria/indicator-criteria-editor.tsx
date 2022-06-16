import {
	Achievement,
	AchievementIndicator,
	AchievementIndicatorCriteria
} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {DropdownOption} from '@/widgets/basic/types';
import {IndicatorCriteriaDefData} from '../types';
import {IndicatorCriteriaArithmeticEditor} from './indicator-criteria-arithmetic-editor';
import {IndicatorCriteriaFactorEditor} from './indicator-criteria-factor-editor';
import {IndicatorCriteriaOperators} from './indicator-criteria-operators';
import {IndicatorCriteriaValueEditor} from './indicator-criteria-value-editor';
import {IndicatorCriteriaIndex, IndicatorCriteriaRow} from './widgets';

export const IndicatorCriteriaEditor = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	criteria: AchievementIndicatorCriteria;
	indicator: Indicator;
	factorCandidates: Array<DropdownOption>;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, criteria, indicator, factorCandidates, defData} = props;

	const index = (achievementIndicator.criteria || []).indexOf(criteria) + 1;

	return <IndicatorCriteriaRow>
		<IndicatorCriteriaIndex>{index === 0 ? (achievementIndicator.criteria || []).length + 1 : index}</IndicatorCriteriaIndex>
		<IndicatorCriteriaFactorEditor achievement={achievement} achievementIndicator={achievementIndicator}
		                               criteria={criteria} defData={defData}
		                               factorCandidates={factorCandidates} indicator={indicator}/>
		<IndicatorCriteriaArithmeticEditor achievement={achievement} achievementIndicator={achievementIndicator}
		                                   criteria={criteria} defData={defData} indicator={indicator}/>
		<IndicatorCriteriaValueEditor achievement={achievement} achievementIndicator={achievementIndicator}
		                              criteria={criteria} defData={defData}/>
		<IndicatorCriteriaOperators achievement={achievement} achievementIndicator={achievementIndicator}
		                            criteria={criteria}/>
	</IndicatorCriteriaRow>;
};