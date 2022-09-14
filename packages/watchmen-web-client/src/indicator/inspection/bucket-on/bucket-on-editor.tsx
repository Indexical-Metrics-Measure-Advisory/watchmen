import {BucketId} from '@/services/data/tuples/bucket-types';
import {FactorId} from '@/services/data/tuples/factor-types';
import {Inspection, InspectMeasureOn, InspectMeasureOnType} from '@/services/data/tuples/inspection-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {v4} from 'uuid';
import {useInspectionEventBus} from '../inspection-event-bus';
import {IndicatorForInspection, InspectionEventTypes} from '../inspection-event-bus-types';
import {BucketOnOperators} from './bucket-on-operators';
import {Buckets} from './types';
import {buildBucketOptions, buildMeasureOnOptions} from './utils';
import {BucketOnDropdown, BucketOnRow} from './widgets';

const safeGetMeasureOn = (measure?: InspectMeasureOn): InspectMeasureOnType | FactorId | undefined => {
	if (measure == null || measure.type == null) {
		return InspectMeasureOnType.NONE;
	} else if (measure.type === InspectMeasureOnType.OTHER) {
		return measure.factorId;
	} else {
		return measure.type;
	}
};

export const BucketOnEditor = (props: {
	inspection: Inspection;
	measure: InspectMeasureOn;
	indicator: IndicatorForInspection;
	buckets: Buckets;
}) => {
	const {inspection, measure, indicator, buckets} = props;

	const {fire} = useInspectionEventBus();
	const forceUpdate = useForceUpdate();

	const onMeasureOnChange = (option: DropdownOption) => {
		if (option.value === InspectMeasureOnType.NONE) {
			if (measure.type === InspectMeasureOnType.NONE) {
				return;
			}
			measure.type = InspectMeasureOnType.NONE;
			delete measure.factorId;
			delete measure.bucketId;
		} else if (option.value === InspectMeasureOnType.VALUE) {
			if (measure.type === InspectMeasureOnType.VALUE) {
				return;
			}
			measure.type = InspectMeasureOnType.VALUE;
			delete measure.factorId;
			delete measure.bucketId;
		} else {
			// eslint-disable-next-line
			if (measure.type === InspectMeasureOnType.OTHER && measure.factorId == option.value) {
				return;
			}
			measure.factorId = option.value;
			measure.type = InspectMeasureOnType.OTHER;
			const bucketOptions = buildBucketOptions({
				measure,
				topic: indicator!.topic,
				subject: indicator!.subject,
				buckets: buckets.data
			});
			if (bucketOptions.available && bucketOptions.options.length > 0) {
				measure.bucketId = bucketOptions.options[0].value;
			} else {
				delete measure.bucketId;
			}
		}
		if (!(inspection.measures || []).includes(measure)) {
			if (inspection.measures == null) {
				inspection.measures = [];
			}
			inspection.measures.push(measure);
			fire(InspectionEventTypes.BUCKET_ON_TYPE_CHANGED, inspection, measure);
			fire(InspectionEventTypes.BUCKET_ON_ADDED, inspection, measure);
		} else {
			fire(InspectionEventTypes.BUCKET_ON_TYPE_CHANGED, inspection, measure);
			fire(InspectionEventTypes.BUCKET_ON_CHANGED, inspection, measure);
		}
		forceUpdate();
	};
	const onBucketChange = (option: DropdownOption) => {
		const value = option.value;
		if (!value) {
			delete measure?.bucketId;
		} else {
			measure!.bucketId = value as BucketId;
		}
		fire(InspectionEventTypes.BUCKET_ON_BUCKET_CHANGED, inspection, measure);
		fire(InspectionEventTypes.BUCKET_ON_CHANGED, inspection, measure);
		forceUpdate();
	};

	const measureOn = safeGetMeasureOn(measure ?? (void 0));
	const measureOnOptions = buildMeasureOnOptions({
		indicator: indicator!.indicator,
		topic: indicator!.topic,
		subject: indicator!.subject,
		buckets: buckets.data,
		ignoreLabel: (inspection.measures || []).length === 0 ? Lang.INDICATOR.INSPECTION.NO_BUCKET_ON : Lang.INDICATOR.INSPECTION.MORE_BUCKET_ON
	});
	const selectedBucketId = (() => {
		if (measure.type === InspectMeasureOnType.NONE) {
			return (void 0);
		} else if (measure.type === InspectMeasureOnType.VALUE) {
			return measure.bucketId;
		} else {
			return measure.bucketId == null ? '' : measure.bucketId;
		}
	})();
	const bucketOptions = buildBucketOptions({
		measure,
		topic: indicator!.topic,
		subject: indicator!.subject,
		buckets: buckets.data
	});

	return <BucketOnRow key={v4()}>
		<BucketOnDropdown value={measureOn} options={measureOnOptions} onChange={onMeasureOnChange}
		                  please={Lang.PLAIN.DROPDOWN_PLACEHOLDER}/>
		{measureOn === InspectMeasureOnType.NONE
			? null
			: <BucketOnDropdown value={selectedBucketId}
			                    options={bucketOptions.options}
			                    onChange={onBucketChange}
			                    please={bucketOptions.available ? Lang.PLAIN.DROPDOWN_PLACEHOLDER : Lang.INDICATOR.INSPECTION.SELECT_MEASURE_ON_FIRST}/>
		}
		<BucketOnOperators inspection={inspection} measure={measure}/>
	</BucketOnRow>;
};