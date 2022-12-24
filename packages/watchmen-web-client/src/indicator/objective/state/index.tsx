import {Fragment} from 'react';
import {useAllBuckets} from './use-all-buckets';
import {useAllIndicators} from './use-all-indicators';
import {useAllUserGroups} from './use-all-user-groups';
import {useBucketDetail} from './use-bucket-detail';
import {useEditObjective} from './use-edit-objective';
import {useObjectiveList} from './use-objective-list';
import {useSaveObjective} from './use-save-objective';
import {useSubjectDetail} from './use-subject-detail';
import {useTopicDetail} from './use-topic-detail';

export const ObjectivesState = () => {
	useObjectiveList();
	useEditObjective();
	useAllBuckets();
	useAllUserGroups();
	useAllIndicators();
	useSaveObjective();
	useBucketDetail();
	useTopicDetail();
	useSubjectDetail();

	return <Fragment/>;
};