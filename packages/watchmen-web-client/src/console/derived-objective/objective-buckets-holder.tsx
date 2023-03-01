import {Fragment} from 'react';
import {useAllBuckets} from './hooks/use-all-buckets';
import {useBucketDetail} from './hooks/use-bucket-detail';

export const ObjectiveBucketsHolder = () => {
	useAllBuckets();
	useBucketDetail();

	return <Fragment/>;
};
