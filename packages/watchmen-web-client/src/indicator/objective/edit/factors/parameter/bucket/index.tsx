import {Bucket} from '@/services/data/tuples/bucket-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	BucketObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {isBlank} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {isBucketParameter} from '../../../param-utils';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {useBucket} from './use-bucket';
import {BucketDropdown, BucketEditContainer, IncorrectOptionLabel, SegmentDropdown} from './widgets';

const RealBucketEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parameter: BucketObjectiveParameter; buckets: Array<Bucket>;
}) => {
	const {parameter, buckets} = props;

	const {onBucketChange, onSegmentChange, bucketId, segmentName} = useBucket(parameter);

	// build bucket options
	const bucketOptions: Array<DropdownOption> = (buckets || []).map(bucket => {
		return {value: bucket.bucketId, label: bucket.name || ''};
	}).sort((f1: DropdownOption, f2: DropdownOption) => {
		return (f1.label as string).toLowerCase().localeCompare((f2.label as string).toLowerCase());
	});

	// valid means no selection, or selection found
	// eslint-disable-next-line
	const bucketValid = isBlank(bucketId) || bucketOptions.find(b => b.value == bucketId) != null;
	if (!bucketValid) {
		// invalid, means selection not found
		bucketOptions.push({
			value: bucketId || '', label: () => {
				return {
					node:
						<IncorrectOptionLabel>{Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_FILTER_ON_INCORRECT_BUCKET}</IncorrectOptionLabel>,
					label: ''
				};
			}
		});
	} else if (bucketOptions.length === 0) {
		// no option available but valid, means no selection
		bucketOptions.push({
			value: '', label: Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_FILTER_NO_AVAILABLE_BUCKET
		});
	}

	const segmentOptions: Array<DropdownOption> = [];
	// find selected bucket
	// eslint-disable-next-line
	const selectedBucket = buckets.find(b => b.bucketId == bucketId);
	if (selectedBucket != null) {
		// build segment options
		segmentOptions.push(...selectedBucket.segments.map(segment => {
			return {value: segment.name || '', label: segment.name || ''};
		}));
	}
	// valid means not selection, or selection found
	const segmentValid = isBlank(segmentName) || segmentOptions.find(s => s.value === segmentName) != null;
	if (!segmentValid) {
		// invalid means selection not found
		segmentOptions.push({
			value: segmentName, label: () => {
				return {
					node: <IncorrectOptionLabel>{segmentName}</IncorrectOptionLabel>,
					label: segmentName
				};
			}
		});
	} else if (segmentOptions.length === 0) {
		// no option available but valid, means no selection
		if (isBlank(bucketId)) {
			segmentOptions.push({
				value: '', label: Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_FILTER_BUCKET_FIRST
			});
		} else {
			segmentOptions.push({
				value: '', label: Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_FILTER_NO_AVAILABLE_BUCKET_SEGMENT
			});
		}
	}

	return <BucketEditContainer>
		<BucketDropdown value={bucketId || ''} options={bucketOptions} onChange={onBucketChange}
		                please={Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_FILTER_BUCKET_PLACEHOLDER}
		                valid={bucketValid}/>
		<SegmentDropdown value={segmentName || ''} options={segmentOptions} onChange={onSegmentChange}
		                 please={Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_FILTER_BUCKET_SEGMENT_PLACEHOLDER}
		                 valid={segmentValid}/>
	</BucketEditContainer>;
};

export const BucketEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parameter: ObjectiveParameter; buckets: Array<Bucket>;
}) => {
	const {objective, factor, indicator, parameter, buckets} = props;

	useParameterFromChanged();

	if (!isBucketParameter(parameter)) {
		return null;
	}

	return <RealBucketEditor objective={objective} factor={factor} indicator={indicator}
	                         parameter={parameter} buckets={buckets}/>;
};
