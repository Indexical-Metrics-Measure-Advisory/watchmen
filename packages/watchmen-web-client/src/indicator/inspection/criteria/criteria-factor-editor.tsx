import {FactorId} from '@/services/data/tuples/factor-types';
import {IndicatorCriteria} from '@/services/data/tuples/indicator-criteria-types';
import {
	isAchievementIndicatorCriteriaOnBucket,
	isAchievementIndicatorCriteriaOnExpression
} from '@/services/data/tuples/indicator-criteria-utils';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes} from '../inspection-event-bus-types';
import {IndicatorCriteriaDefData} from './types';
import {findAvailableBuckets} from './utils';
import {InspectionCriteriaFactor} from './widgets';

export const CriteriaFactorEditor = (props: {
	inspection: Inspection;
	criteria: IndicatorCriteria;
	defData: IndicatorCriteriaDefData;
	indicator: Indicator;
	factorCandidates: Array<DropdownOption>;
}) => {
	const {inspection, criteria, defData, indicator, factorCandidates} = props;

	const {fire} = useInspectionEventBus();
	const forceUpdate = useForceUpdate();

	const onCriteriaFactorChanged = (criteria: IndicatorCriteria) => (option: DropdownOption) => {
		criteria.factorId = option.value as FactorId;
		if (inspection.criteria == null) {
			inspection.criteria = [];
		}
		if (!inspection.criteria.includes(criteria)) {
			// new criteria
			inspection.criteria.push(criteria);
			fire(InspectionEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, inspection, criteria);
			fire(InspectionEventTypes.INDICATOR_CRITERIA_ADDED, inspection, criteria);
		} else {
			// existing criteria
			if (isAchievementIndicatorCriteriaOnExpression(criteria)) {
				// operator and value is for all expression criteria
				// do nothing
			} else if (isAchievementIndicatorCriteriaOnBucket(criteria)) {
				const availableBuckets = findAvailableBuckets(criteria, indicator, defData);
				// eslint-disable-next-line
				if (availableBuckets.every(bucket => bucket.bucketId != criteria.bucketId)) {
					// bucket cannot be used on new factor, clear it
					delete criteria.bucketId;
					delete criteria.bucketSegmentName;
				}
			}
			fire(InspectionEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, inspection, criteria);
			fire(InspectionEventTypes.INDICATOR_CRITERIA_CHANGED, inspection, criteria);
		}
		fire(InspectionEventTypes.SAVE_INSPECTION, inspection, noop);
		forceUpdate();
	};

	return <InspectionCriteriaFactor>
		<Dropdown value={criteria.factorId} options={factorCandidates}
		          onChange={onCriteriaFactorChanged(criteria)}
		          please={Lang.INDICATOR.INSPECTION.PLEASE_SELECT_CRITERIA_FACTOR}/>
	</InspectionCriteriaFactor>;
};