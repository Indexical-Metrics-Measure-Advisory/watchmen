import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {IndicatorCriteria} from '@/services/data/tuples/indicator-criteria-types';
import {noop} from '@/services/utils';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaButton, IndicatorCriteriaButtons} from './widgets';

export const IndicatorCriteriaOperators = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	criteria: IndicatorCriteria;
}) => {
	const {achievement, achievementIndicator, criteria} = props;

	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();

	const onDeleteClicked = () => {
		const index = (achievementIndicator.criteria || []).indexOf(criteria);
		if (index === -1) {
			return;
		}

		(achievementIndicator.criteria || []).splice(index, 1);
		fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, achievement, achievementIndicator);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};

	const canBeDeleted = (achievementIndicator.criteria || []).includes(criteria);

	return <IndicatorCriteriaButtons>
		{canBeDeleted
			? <IndicatorCriteriaButton onClick={onDeleteClicked}>
				<FontAwesomeIcon icon={ICON_DELETE}/>
			</IndicatorCriteriaButton>
			: null}
	</IndicatorCriteriaButtons>;
};