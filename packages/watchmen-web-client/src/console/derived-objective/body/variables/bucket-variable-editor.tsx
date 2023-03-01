import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Objective, ObjectiveVariableOnBucket} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {isNotBlank, noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {buildBucketOptions} from '@/widgets/objective/utils';
import React, {useEffect, useState} from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {BucketVariableContainer} from './widgets';

interface Buckets {
	initialized: boolean;
	all: Array<QueryBucket>;
	selected?: Bucket;
}

export const BucketVariableEditor = (props: { objective: Objective; variable: ObjectiveVariableOnBucket }) => {
	const {variable} = props;

	const {fire} = useObjectiveEventBus();
	const [buckets, setBuckets] = useState<Buckets>({initialized: false, all: []});
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		if (buckets.initialized) {
			return;
		}
		fire(ObjectiveEventTypes.ASK_ALL_BUCKETS, (all: Array<QueryBucket>) => {
			const bucketId = variable.bucketId;
			if (!isNotBlank(bucketId)) {
				setBuckets({initialized: true, all});
			} else {
				fire(ObjectiveEventTypes.ASK_BUCKET, bucketId!, (bucket?: Bucket) => {
					setBuckets({initialized: true, all, selected: bucket});
				});
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fire, buckets.initialized]);

	const onBucketChanged = (option: DropdownOption) => {
		const bucketId = option.value as BucketId;
		// eslint-disable-next-line
		if (bucketId == variable.bucketId || bucketId === '') {
			return;
		}

		variable.bucketId = bucketId;
		delete variable.segmentName;

		fire(ObjectiveEventTypes.ASK_BUCKET, bucketId, (bucket?: Bucket) => {
			setBuckets(buckets => ({initialized: buckets.initialized, all: buckets.all, selected: bucket}));
			fire(ObjectiveEventTypes.SAVE, noop);
			forceUpdate();
		});
	};
	const onSegmentChanged = (option: DropdownOption) => {
		const segmentName = option.value as string;
		if (segmentName === '') {
			return;
		}
		variable.segmentName = segmentName;
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};

	const {
		buckets: bucketOptions, segments: segmentOptions
	} = buildBucketOptions(variable, buckets.all, buckets.selected ?? null);

	return <BucketVariableContainer>
		<Dropdown value={variable.bucketId} options={bucketOptions} onChange={onBucketChanged}
		          please={Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_PLACEHOLDER}/>
		<Dropdown value={variable.segmentName} options={segmentOptions} onChange={onSegmentChanged}
		          please={Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SEGMENT_PLACEHOLDER}/>
	</BucketVariableContainer>;
};