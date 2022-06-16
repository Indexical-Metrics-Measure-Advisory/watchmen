import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {ICON_USE_INDICATOR} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {createAchievementIndicator} from '../../../utils';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {
	IndicatorCandidateContainer,
	IndicatorCandidateCurve,
	IndicatorCandidateNode,
	UseIndicatorCandidate
} from './widgets';

export const IndicatorCandidate = (props: {
	paletteId: string;
	parentId: string;
	achievement: Achievement;
	indicator: Indicator
}) => {
	const {parentId, achievement, indicator} = props;

	const {fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);

	const onUseClicked = () => {
		const achievementIndicator = createAchievementIndicator(achievement, indicator);
		fire(AchievementEditEventTypes.INDICATOR_ADDED, achievement, achievementIndicator, indicator);
	};

	return <IndicatorCandidateContainer>
		<IndicatorCandidateNode ref={ref}>
			<span>{indicator.name || 'Noname Indicator'}</span>
			<UseIndicatorCandidate onClick={onUseClicked}>
				<FontAwesomeIcon icon={ICON_USE_INDICATOR}/>
			</UseIndicatorCandidate>
		</IndicatorCandidateNode>
		{curve == null
			? null
			: <IndicatorCandidateCurve rect={curve}>
				<g>
					<path d={computeCurvePath(curve)}/>
				</g>
			</IndicatorCandidateCurve>}
	</IndicatorCandidateContainer>;
};