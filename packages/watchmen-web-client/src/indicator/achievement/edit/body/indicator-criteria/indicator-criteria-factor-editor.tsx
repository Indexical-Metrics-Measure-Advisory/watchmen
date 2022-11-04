import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {FactorId} from '@/services/data/tuples/factor-types';
import {IndicatorCriteria} from '@/services/data/tuples/indicator-criteria-types';
import {
	isIndicatorCriteriaOnBucket,
	isIndicatorCriteriaOnExpression
} from '@/services/data/tuples/indicator-criteria-utils';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {findAvailableBuckets} from './utils';
import {IndicatorCriteriaFactor} from './widgets';

export const IndicatorCriteriaFactorEditor = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	criteria: IndicatorCriteria;
	defData: IndicatorCriteriaDefData;
	indicator: Indicator;
	factorCandidates: Array<DropdownOption>;
}) => {
	const {achievement, achievementIndicator, criteria, defData, indicator, factorCandidates} = props;

	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();

	const onCriteriaFactorChanged = (criteria: IndicatorCriteria) => (option: DropdownOption) => {
		criteria.factorId = option.value as FactorId;
		if (achievementIndicator.criteria == null) {
			achievementIndicator.criteria = [];
		}
		if (!achievementIndicator.criteria.includes(criteria)) {
			// new criteria
			achievementIndicator.criteria.push(criteria);
			fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, achievement, achievementIndicator, criteria);
			fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, achievement, achievementIndicator);
		} else {
			// existing criteria
			if (isIndicatorCriteriaOnExpression(criteria)) {
				// operator and value is for all expression criteria
				// do nothing
			} else if (isIndicatorCriteriaOnBucket(criteria)) {
				const availableBuckets = findAvailableBuckets(criteria, indicator, defData);
				// eslint-disable-next-line
				if (availableBuckets.every(bucket => bucket.bucketId != criteria.bucketId)) {
					// bucket cannot be used on new factor, clear it
					delete criteria.bucketId;
					delete criteria.bucketSegmentName;
				}
			}
			fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, achievement, achievementIndicator, criteria);
			fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, achievement, achievementIndicator);
		}
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		forceUpdate();
	};

	return <IndicatorCriteriaFactor>
		<Dropdown value={criteria.factorId} options={factorCandidates}
		          onChange={onCriteriaFactorChanged(criteria)}
		          please={Lang.INDICATOR.ACHIEVEMENT.PLEASE_SELECT_CRITERIA_FACTOR}/>
	</IndicatorCriteriaFactor>;
};