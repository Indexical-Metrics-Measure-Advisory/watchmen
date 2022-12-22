import {BucketId} from '@/services/data/tuples/bucket-types';
import {BucketObjectiveParameter} from '@/services/data/tuples/objective-types';
import {isBlank} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';

export const useBucket = (parameter: BucketObjectiveParameter) => {
	const {fire} = useParameterEventBus();
	const forceUpdate = useForceUpdate();

	const {bucketId, segmentName} = parameter;

	const onBucketChange = (option: DropdownOption) => {
		if (isBlank(option.value)) {
			parameter.bucketId = '';
			parameter.segmentName = '';
		} else {
			// eslint-disable-next-line
			if (parameter.bucketId == option.value) {
				return;
			} else {
				parameter.bucketId = option.value as BucketId;
				parameter.segmentName = '';
			}
		}
		forceUpdate();
		fire(ParameterEventTypes.BUCKET_CHANGED, parameter);
	};
	const onSegmentChange = (option: DropdownOption) => {
		if (isBlank(option.value)) {
			parameter.segmentName = '';
		} else {
			parameter.segmentName = option.value as string;
		}
		forceUpdate();
		fire(ParameterEventTypes.BUCKET_SEGMENT_CHANGED, parameter);
	};

	return {onBucketChange, onSegmentChange, bucketId, segmentName};
};