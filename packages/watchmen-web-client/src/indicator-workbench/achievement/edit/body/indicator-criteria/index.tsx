import {Indicator} from '@/services/data/tuples/indicator-types';
import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {Lang} from '@/widgets/langs';
import {IndicatorCriteriaDefData} from '../types';
import {IndicatorPartRelationLine} from '../widgets';
import {IndicatorCriteriaEditContent} from './indicator-criteria-edit-content';
import {IndicatorCriteriaNodeContent} from './indicator-criteria-node-content';
import {LineToParent} from './line-to-parent';
import {IndicatorCriteriaNode, IndicatorCriteriaNodeContainer} from './widgets';

export const InternalIndicatorCriteria = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	indicator: Indicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, indicator, defData} = props;

	return <>
		<LineToParent achievement={achievement} achievementIndicator={achievementIndicator} defData={defData}/>
		<IndicatorCriteriaNodeContainer>
			<IndicatorCriteriaNodeContent achievement={achievement} achievementIndicator={achievementIndicator}
			                              defData={defData}/>
			<IndicatorCriteriaEditContent achievement={achievement} achievementIndicator={achievementIndicator}
			                              indicator={indicator}
			                              defData={defData}/>
		</IndicatorCriteriaNodeContainer>
	</>;
};

export const IndicatorCriteria = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	indicator: Indicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, indicator, defData} = props;

	if (!defData.loaded) {
		return <>
			<IndicatorPartRelationLine/>
			<IndicatorCriteriaNode>
				{Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.LOADING_CRITERIA_DEF}
			</IndicatorCriteriaNode>
		</>;
	}

	return <InternalIndicatorCriteria achievement={achievement} achievementIndicator={achievementIndicator}
	                                  indicator={indicator} defData={defData}/>;
};