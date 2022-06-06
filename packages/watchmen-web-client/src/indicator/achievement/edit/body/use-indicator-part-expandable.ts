import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {useCollapseFixedThing} from '@/widgets/basic/utils';
import {useEffect, useRef, useState} from 'react';
import {useAchievementEditEventBus} from './achievement-edit-event-bus';
import {AchievementEditEventTypes} from './achievement-edit-event-bus-types';

export enum Expandable {
	NAME = 'name',
	CRITERIA = 'criteria',
	CALCULATION = 'calculation'
}

export const useIndicatorPartExpandable = (options: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	expandable: Expandable;
}) => {
	const {achievement, achievementIndicator, expandable} = options;

	const containerRef = useRef<HTMLDivElement>(null);
	const {on, off, fire} = useAchievementEditEventBus();
	const [expanded, setExpanded] = useState(false);
	useCollapseFixedThing({containerRef, visible: expanded, hide: () => setExpanded(false)});
	useEffect(() => {
		const onSomethingExpanded = (accepted: Expandable) => (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement) {
				return;
			}
			if (aAchievementIndicator !== achievementIndicator || expandable !== accepted) {
				setExpanded(false);
			}
		};
		const onNameExpanded = onSomethingExpanded(Expandable.NAME);
		const onCriteriaExpanded = onSomethingExpanded(Expandable.CRITERIA);
		const onCalculationExpanded = onSomethingExpanded(Expandable.CALCULATION);
		on(AchievementEditEventTypes.NAME_EXPANDED, onNameExpanded);
		on(AchievementEditEventTypes.CRITERIA_EXPANDED, onCriteriaExpanded);
		on(AchievementEditEventTypes.CALCULATION_EXPANDED, onCalculationExpanded);
		return () => {
			off(AchievementEditEventTypes.NAME_EXPANDED, onNameExpanded);
			off(AchievementEditEventTypes.CRITERIA_EXPANDED, onCriteriaExpanded);
			off(AchievementEditEventTypes.CALCULATION_EXPANDED, onCalculationExpanded);
		};
	}, [on, off, achievement, achievementIndicator, expandable]);
	useEffect(() => {
		const onExpand = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}
			setExpanded(true);
			switch (expandable) {
				case Expandable.NAME:
					fire(AchievementEditEventTypes.NAME_EXPANDED, achievement, achievementIndicator);
					break;
				case Expandable.CRITERIA:
					fire(AchievementEditEventTypes.CRITERIA_EXPANDED, achievement, achievementIndicator);
					break;
				case Expandable.CALCULATION:
					fire(AchievementEditEventTypes.CALCULATION_EXPANDED, achievement, achievementIndicator);
					break;
			}
		};
		switch (expandable) {
			case Expandable.NAME:
				on(AchievementEditEventTypes.EXPAND_NAME, onExpand);
				break;
			case Expandable.CRITERIA:
				on(AchievementEditEventTypes.EXPAND_CRITERIA, onExpand);
				break;
			case Expandable.CALCULATION:
				on(AchievementEditEventTypes.EXPAND_CALCULATION, onExpand);
				break;
		}
		return () => {
			switch (expandable) {
				case Expandable.NAME:
					off(AchievementEditEventTypes.EXPAND_NAME, onExpand);
					break;
				case Expandable.CRITERIA:
					off(AchievementEditEventTypes.EXPAND_CRITERIA, onExpand);
					break;
				case Expandable.CALCULATION:
					off(AchievementEditEventTypes.EXPAND_CALCULATION, onExpand);
					break;
			}
		};
	}, [on, off, fire, achievement, achievementIndicator, expandable]);

	return {containerRef, expanded};
};