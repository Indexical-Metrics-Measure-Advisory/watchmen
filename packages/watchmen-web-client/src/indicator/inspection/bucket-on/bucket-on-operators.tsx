import {Inspection, InspectMeasureOn} from '@/services/data/tuples/inspection-types';
import {noop} from '@/services/utils';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes} from '../inspection-event-bus-types';
import {BucketOnButton, BucketOnButtons} from './widgets';

export const BucketOnOperators = (props: {
	inspection: Inspection;
	measure: InspectMeasureOn;
}) => {
	const {inspection, measure} = props;

	const {fire} = useInspectionEventBus();

	const onDeleteClicked = () => {
		const index = (inspection.measures || []).indexOf(measure);
		if (index === -1) {
			return;
		}

		(inspection.measures || []).splice(index, 1);
		fire(InspectionEventTypes.BUCKET_ON_REMOVED, inspection, measure);
		fire(InspectionEventTypes.SAVE_INSPECTION, inspection, noop);
	};

	const canBeDeleted = (inspection.measures || []).includes(measure);

	return <BucketOnButtons>
		{canBeDeleted
			? <BucketOnButton onClick={onDeleteClicked}>
				<FontAwesomeIcon icon={ICON_DELETE}/>
			</BucketOnButton>
			: null}
	</BucketOnButtons>;
};