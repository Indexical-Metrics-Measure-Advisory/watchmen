import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {isManualComputeAchievementIndicator} from '@/services/data/tuples/achievement-utils';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {noop} from '@/services/utils';
import {useEffect, useLayoutEffect, useState} from 'react';
import {v4} from 'uuid';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';
import {useAchievementEditEventBus} from './achievement-edit-event-bus';
import {AchievementEditEventTypes} from './achievement-edit-event-bus-types';
import {PickedIndicator} from './indicator';
import {IndicatorNodeContent} from './types';

enum NodesChangeTrigger {
	ADD = 'add',
	REMOVE = 'remove'
}

interface Nodes {
	initialized: boolean;
	trigger?: NodesChangeTrigger;
	data: Array<IndicatorNodeContent>;
}

const buildNodes = (achievement: Achievement, indicators: Array<Indicator>) => {
	return (achievement.indicators || []).map((picked: AchievementIndicator) => {
		return {
			id: v4(),
			nav: picked,
			// when indicator is a manual compute, ignore indicator finding
			// eslint-disable-next-line
			indicator: isManualComputeAchievementIndicator(picked)
				? (void 0)
				// eslint-disable-next-line
				: indicators.find(indicator => indicator.indicatorId == picked.indicatorId)
		};
	});
};

export const PickedIndicators = (props: {
	rootId: string;
	paletteId: string;
	achievement: Achievement;
	indicators: Array<Indicator>;
}) => {
	const {rootId, paletteId, achievement, indicators} = props;

	const {fire: fireAchievement} = useAchievementEventBus();
	const {on, off, fire} = useAchievementEditEventBus();
	const [state, setState] = useState<Nodes>({initialized: false, data: []});
	useEffect(() => {
		setState({initialized: true, data: buildNodes(achievement, indicators)});
	}, [achievement, indicators]);
	useEffect(() => {
		const onIndicatorAdded = (aAchievement: Achievement, achievementIndicator: AchievementIndicator, indicator: Indicator) => {
			if (aAchievement !== achievement) {
				return;
			}

			fireAchievement(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
			setState(state => {
				return {
					initialized: true,
					trigger: NodesChangeTrigger.ADD,
					data: [...state.data, {id: v4(), nav: achievementIndicator, indicator}]
				};
			});
		};
		const onComputeIndicatorAdded = (aAchievement: Achievement, achievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement) {
				return;
			}

			fireAchievement(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
			setState(state => {
				return {
					initialized: true,
					trigger: NodesChangeTrigger.ADD,
					data: [...state.data, {id: v4(), nav: achievementIndicator}]
				};
			});
		};
		on(AchievementEditEventTypes.INDICATOR_ADDED, onIndicatorAdded);
		on(AchievementEditEventTypes.COMPUTE_INDICATOR_ADDED, onComputeIndicatorAdded);
		return () => {
			off(AchievementEditEventTypes.INDICATOR_ADDED, onIndicatorAdded);
			off(AchievementEditEventTypes.COMPUTE_INDICATOR_ADDED, onComputeIndicatorAdded);
		};
	}, [on, off, fireAchievement, achievement, state.trigger]);
	useEffect(() => {
		const onIndicatorRemoved = (aAchievement: Achievement, achievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement) {
				return;
			}
			fireAchievement(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
			setState(state => {
				return {
					initialized: true,
					trigger: NodesChangeTrigger.ADD,
					data: state.data.filter(inc => inc.nav !== achievementIndicator)
				};
			});
		};
		on(AchievementEditEventTypes.INDICATOR_REMOVED, onIndicatorRemoved);
		return () => {
			off(AchievementEditEventTypes.INDICATOR_REMOVED, onIndicatorRemoved);
		};
	}, [on, off, fireAchievement, achievement]);
	useLayoutEffect(() => {
		if (state.trigger === NodesChangeTrigger.ADD) {
			// show last node
			const id = state.data[state.data.length - 1]?.id;
			if (id != null) {
				const node = document.getElementById(id);
				node != null && node.scrollIntoView({behavior: 'smooth'});
			}
			fire(AchievementEditEventTypes.REPAINT);
			setState(state => ({initialized: true, data: state.data}));
		} else if (state.trigger === NodesChangeTrigger.REMOVE) {
			fire(AchievementEditEventTypes.REPAINT);
			setState(state => ({initialized: true, data: state.data}));
		}
	}, [fire, state.trigger, state.data]);

	if (!state.initialized) {
		return null;
	}

	return <>
		{state.data.map(picked => {
			return <PickedIndicator paletteId={paletteId} parentId={rootId}
			                        achievement={achievement} achievementIndicator={picked.nav}
			                        indicator={picked.indicator}
			                        id={picked.id}
			                        key={picked.id}/>;
		})}
	</>;
};
