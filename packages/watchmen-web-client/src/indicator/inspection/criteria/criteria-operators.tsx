import {IndicatorCriteria} from '@/services/data/tuples/indicator-criteria-types';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {noop} from '@/services/utils';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes} from '../inspection-event-bus-types';
import {InspectionCriteriaButton, InspectionCriteriaButtons} from './widgets';

export const CriteriaOperators = (props: {
	inspection: Inspection;
	criteria: IndicatorCriteria;
}) => {
	const {inspection, criteria} = props;

	const {fire} = useInspectionEventBus();

	const onDeleteClicked = () => {
		const index = (inspection.criteria || []).indexOf(criteria);
		if (index === -1) {
			return;
		}

		(inspection.criteria || []).splice(index, 1);
		fire(InspectionEventTypes.INDICATOR_CRITERIA_REMOVED, inspection, criteria);
		fire(InspectionEventTypes.SAVE_INSPECTION, inspection, noop);
	};

	const canBeDeleted = (inspection.criteria || []).includes(criteria);

	return <InspectionCriteriaButtons>
		{canBeDeleted
			? <InspectionCriteriaButton onClick={onDeleteClicked}>
				<FontAwesomeIcon icon={ICON_DELETE}/>
			</InspectionCriteriaButton>
			: null}
	</InspectionCriteriaButtons>;
};