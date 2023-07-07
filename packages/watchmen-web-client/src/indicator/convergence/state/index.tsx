import {Fragment} from 'react';
import {useAllBuckets} from './use-all-buckets';
import {useAllObjectives} from './use-all-objectives';
import {useAllUserGroups} from './use-all-user-groups';
import {useBucketDetail} from './use-bucket-detail';
import {useConvergenceList} from './use-convergence-list';
import {useEditConvergence} from './use-edit-convergence';
import {useObjectiveDetail} from './use-objective-detail';
import {useSaveConvergence} from './use-save-convergence';

export const ConvergencesState = () => {
	useConvergenceList();
	useEditConvergence();
	useAllBuckets();
	useAllObjectives();
	useAllUserGroups();
	useSaveConvergence();
	useBucketDetail();
	useObjectiveDetail();

	return <Fragment/>;
};