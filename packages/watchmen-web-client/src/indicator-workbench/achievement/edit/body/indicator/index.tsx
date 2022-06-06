import {Indicator} from '@/services/data/tuples/indicator-types';
import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {isManualComputeAchievementIndicator} from '@/services/data/tuples/achievement-utils';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ComputeIndicator} from '../compute-indicator';
import {IndicatorContent} from '../indicator-content';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {
	IndicatorCurve,
	IndicatorNode,
	IndicatorNodeContainer,
	IndicatorNodeIndex,
	IndicatorNodeName,
	IndicatorNodeRemover
} from './widgets';

const InternalPickedIndicator = (props: {
	parentId: string;
	id: string;
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	indicator?: Indicator;
}) => {
	const {parentId, id, achievement, achievementIndicator, indicator} = props;

	const {fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);

	const onRemoveClicked = () => {
		const index = (achievement.indicators || []).indexOf(achievementIndicator);
		if (index !== -1) {
			(achievement.indicators || []).splice(index, 1);
			fire(AchievementEditEventTypes.INDICATOR_REMOVED, achievement, achievementIndicator);
		}
	};

	const index = achievement.indicators.indexOf(achievementIndicator) + 1;

	return <>
		<IndicatorNode id={id} error={indicator == null} ref={ref}>
			<IndicatorNodeIndex>{index}.</IndicatorNodeIndex>
			<IndicatorNodeName>
				{indicator == null
					? Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.MISSED_INDICATOR
					: (indicator.name || 'Noname Indicator')}
			</IndicatorNodeName>
			<IndicatorNodeRemover>
				<span onClick={onRemoveClicked}><FontAwesomeIcon icon={ICON_DELETE}/></span>
			</IndicatorNodeRemover>
		</IndicatorNode>
		{curve == null
			? null
			: <IndicatorCurve rect={curve}>
				<g>
					<path d={computeCurvePath(curve)}/>
				</g>
			</IndicatorCurve>}
	</>;
};

export const PickedIndicator = (props: {
	paletteId: string;
	parentId: string;
	achievement: Achievement;
	id: string;
	achievementIndicator: AchievementIndicator;
	indicator?: Indicator;
}) => {
	const {parentId, achievement, id, achievementIndicator, indicator} = props;

	const isManualCompute = isManualComputeAchievementIndicator(achievementIndicator);

	if (isManualCompute) {
		return <ComputeIndicator parentId={parentId} id={id}
		                         achievement={achievement} achievementIndicator={achievementIndicator}/>;
	} else {
		return <IndicatorNodeContainer>
			<InternalPickedIndicator parentId={parentId} id={id}
			                         achievement={achievement} achievementIndicator={achievementIndicator}
			                         indicator={indicator}/>
			{indicator == null
				? null
				: <IndicatorContent id={id} achievement={achievement} achievementIndicator={achievementIndicator}
				                    indicator={indicator}/>}
		</IndicatorNodeContainer>;
	}
};