import {Achievement} from '@/services/data/tuples/achievement-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ICON_EXPAND_NODES} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCategory} from '../category';
import {IndicatorCategoryContent} from '../types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {
	MoreIndicatorsColumn,
	MoreIndicatorsContainer,
	MoreIndicatorsCurve,
	MoreIndicatorsNode,
	MoreIndicatorsNodeContainer
} from './widgets';

export const MoreIndicators = (props: {
	paletteId: string;
	parentId: string;
	achievement: Achievement;
	candidates: Array<IndicatorCategoryContent>;
	showText?: boolean;
}) => {
	const {paletteId, parentId, achievement, candidates, showText = false} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);
	const [id] = useState(v4());
	const [expanded, setExpanded] = useState(false);
	useEffect(() => {
		fire(AchievementEditEventTypes.REPAINT);
	}, [fire, expanded]);

	const onMoreClicked = () => {
		if (candidates.length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{Lang.INDICATOR.ACHIEVEMENT.NO_INDICATOR_CANDIDATE}
			</AlertLabel>);
			return;
		}

		setExpanded(!expanded);
	};

	return <MoreIndicatorsContainer>
		<MoreIndicatorsColumn>
			<MoreIndicatorsNodeContainer>
				<MoreIndicatorsNode id={id} showText={showText} onClick={onMoreClicked} ref={ref}>
					<FontAwesomeIcon icon={ICON_EXPAND_NODES}/>
					{showText ? Lang.INDICATOR.ACHIEVEMENT.ADD_PREDEFINED_INDICATOR : null}
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
		{expanded
			? <MoreIndicatorsColumn>
				{candidates.map(candidate => {
					return <IndicatorCategory paletteId={paletteId} parentId={id} achievement={achievement}
					                          category={candidate}
					                          key={candidate.name}/>;
				})}
			</MoreIndicatorsColumn>
			: null}
	</MoreIndicatorsContainer>;
};