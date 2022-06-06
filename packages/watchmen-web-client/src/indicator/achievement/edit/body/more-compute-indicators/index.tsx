import {Achievement} from '@/services/data/tuples/achievement-types';
import {ICON_EXPAND_NODES} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {createAchievementManualComputeIndicator} from '../../../utils';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {useShowAddIndicator} from '../use-show-add-indicator';
import {computeCurvePath} from '../utils';
import {
	MoreIndicatorsColumn,
	MoreIndicatorsContainer,
	MoreIndicatorsCurve,
	MoreIndicatorsNode,
	MoreIndicatorsNodeContainer
} from './widgets';

export const MoreComputeIndicators = (props: {
	paletteId: string;
	parentId: string;
	achievement: Achievement;
}) => {
	const {parentId, achievement} = props;

	const {fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);
	const [id] = useState(v4());
	const visible = useShowAddIndicator(achievement);
	useEffect(() => {
		fire(AchievementEditEventTypes.REPAINT);
	}, [fire]);

	if (!visible) {
		return null;
	}

	const onMoreClicked = () => {
		const achievementIndicator = createAchievementManualComputeIndicator(achievement);
		fire(AchievementEditEventTypes.COMPUTE_INDICATOR_ADDED, achievement, achievementIndicator);
	};

	return <MoreIndicatorsContainer>
		<MoreIndicatorsColumn>
			<MoreIndicatorsNodeContainer>
				<MoreIndicatorsNode id={id} onClick={onMoreClicked} ref={ref}>
					<FontAwesomeIcon icon={ICON_EXPAND_NODES}/>
					{Lang.INDICATOR.ACHIEVEMENT.ADD_COMPUTE_INDICATOR}
				</MoreIndicatorsNode>
				{curve == null
					? null
					: <MoreIndicatorsCurve rect={curve}>
						<g>
							<path d={computeCurvePath(curve)}/>
						</g>
					</MoreIndicatorsCurve>}
			</MoreIndicatorsNodeContainer>
		</MoreIndicatorsColumn>
	</MoreIndicatorsContainer>;
};