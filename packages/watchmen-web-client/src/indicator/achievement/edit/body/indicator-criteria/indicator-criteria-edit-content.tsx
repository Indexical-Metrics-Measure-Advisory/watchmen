import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {v4} from 'uuid';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {Expandable, useIndicatorPartExpandable} from '../use-indicator-part-expandable';
import {IndicatorCriteriaEditor} from './indicator-criteria-editor';
import {IndicatorNameEditor} from './indicator-name-editor';
import {buildFactorOptions} from './utils';
import {IndicatorCriteriaEditContentContainer} from './widgets';

export const IndicatorCriteriaEditContent = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	indicator: Indicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, indicator, defData} = props;

	const {on: onEdit, off: offEdit} = useAchievementEditEventBus();
	const {containerRef, expanded} = useIndicatorPartExpandable({
		achievement,
		achievementIndicator,
		expandable: Expandable.CRITERIA
	});
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onIndicatorCriteriaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}
			forceUpdate();
		};
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		return () => {
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		};
	});

	const criteria = (achievementIndicator.criteria || []);
	const displayCriteria = [...criteria, {}];
	const factorOptions = buildFactorOptions(defData);

	return <IndicatorCriteriaEditContentContainer expanded={expanded} ref={containerRef}>
		<IndicatorNameEditor achievement={achievement} achievementIndicator={achievementIndicator}/>
		{displayCriteria.map(criteria => {
			return <IndicatorCriteriaEditor achievement={achievement} achievementIndicator={achievementIndicator}
			                                criteria={criteria}
			                                indicator={indicator} factorCandidates={factorOptions}
			                                defData={defData}
			                                key={v4()}/>;
		})}
	</IndicatorCriteriaEditContentContainer>;
};