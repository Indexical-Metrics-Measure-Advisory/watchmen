import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect} from 'react';
import {ComputeIndicatorCalculation} from '../compute-indicator-calculation';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {Expandable, useIndicatorPartExpandable} from '../use-indicator-part-expandable';
import {computeCurvePath} from '../utils';
import {ComputeIndicatorNameEditor} from './indicator-name-editor';
import {
	ComputeIndicatorCurve,
	ComputeIndicatorNameEditContentContainer,
	ComputeIndicatorNode,
	ComputeIndicatorNodeContainer,
	ComputeIndicatorNodeIndex,
	ComputeIndicatorNodeName,
	ComputeIndicatorNodeRemover
} from './widgets';

const InternalComputeIndicator = (props: {
	parentId: string;
	id: string;
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
}) => {
	const {parentId, id, achievement, achievementIndicator} = props;

	const {on, off, fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);
	const {containerRef, expanded} = useIndicatorPartExpandable({
		achievement,
		achievementIndicator,
		expandable: Expandable.NAME
	});
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

	const onMouseEnter = () => {
		fire(AchievementEditEventTypes.EXPAND_NAME, achievement, achievementIndicator);
	};
	const onClicked = () => {
		fire(AchievementEditEventTypes.EXPAND_NAME, achievement, achievementIndicator);
	};
	const onRemoveClicked = () => {
		const index = (achievement.indicators || []).indexOf(achievementIndicator);
		if (index !== -1) {
			(achievement.indicators || []).splice(index, 1);
			fire(AchievementEditEventTypes.INDICATOR_REMOVED, achievement, achievementIndicator);
		}
	};

	const index = achievement.indicators.indexOf(achievementIndicator) + 1;
	const name = (achievementIndicator.name || '').trim().length === 0 ?
		Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.COMPUTE_INDICATOR_NODE_LABEL
		: (achievementIndicator.name || '').trim();

	return <>
		<ComputeIndicatorNode id={id} expanded={expanded}
		                      onMouseEnter={onMouseEnter} onClick={onClicked} ref={ref}>
			<ComputeIndicatorNodeIndex>{index}.</ComputeIndicatorNodeIndex>
			<ComputeIndicatorNodeName>
				{name}
			</ComputeIndicatorNodeName>
			<ComputeIndicatorNodeRemover>
				<span onClick={onRemoveClicked}><FontAwesomeIcon icon={ICON_DELETE}/></span>
			</ComputeIndicatorNodeRemover>
		</ComputeIndicatorNode>
		{curve == null
			? null
			: <ComputeIndicatorCurve rect={curve}>
				<g>
					<path d={computeCurvePath(curve)}/>
				</g>
			</ComputeIndicatorCurve>}
		<ComputeIndicatorNameEditContentContainer expanded={expanded} ref={containerRef}>
			<ComputeIndicatorNameEditor achievement={achievement} achievementIndicator={achievementIndicator}/>
		</ComputeIndicatorNameEditContentContainer>
	</>;
};

export const ComputeIndicator = (props: {
	parentId: string;
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	id: string;
}) => {
	const {parentId, achievement, achievementIndicator, id} = props;

	return <ComputeIndicatorNodeContainer>
		<InternalComputeIndicator parentId={parentId} id={id}
		                          achievement={achievement} achievementIndicator={achievementIndicator}/>
		<ComputeIndicatorCalculation id={id} achievement={achievement} achievementIndicator={achievementIndicator}/>
	</ComputeIndicatorNodeContainer>;
};