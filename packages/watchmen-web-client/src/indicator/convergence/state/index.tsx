import {Fragment} from 'react';
import {useAllBuckets} from './use-all-buckets';
import {useAllUserGroups} from './use-all-user-groups';
import {useBucketDetail} from './use-bucket-detail';
import {useConvergenceList} from './use-convergence-list';
import {useEditConvergence} from './use-edit-convergence';
import {useSaveConvergence} from './use-save-convergence';

export const ConvergencesState = () => {
	useConvergenceList();
	useEditConvergence();
	useAllBuckets();
	useAllUserGroups();
	useSaveConvergence();
	useBucketDetail();

	return <Fragment/>;
};