import {fetchBucket, fetchBucketsByIds, listBuckets} from '@/services/data/tuples/bucket';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {fetchObjective, saveObjective} from '@/services/data/tuples/objective';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {listUserGroups} from '@/services/data/tuples/user-group';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import React, {Fragment, useEffect, useState} from 'react';
import {useObjectivesEventBus} from './objectives-event-bus';
import {ObjectivesEventTypes} from './objectives-event-bus-types';
import {createObjective} from './utils';

export const ObjectiveState = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectivesEventBus();
	const [editOne, setEditOne] = useState<Objective | null>(null);
	const [allBuckets, setAllBuckets] = useState<{ loaded: boolean, data: Array<QueryBucket> }>({
		loaded: false, data: []
	});
	const [buckets, setBuckets] = useState<Array<Bucket>>([]);
	const [userGroups, setUserGroups] = useState<{ loaded: boolean, data: Array<QueryUserGroupForHolder> }>({
		loaded: false, data: []
	});
	const saveQueue = useThrottler();

	useEffect(() => {
		const onCreateObjective = (onCreated: (objective: Objective) => void) => {
			const objective = createObjective();
			setEditOne(objective);
			onCreated(objective);
		};
		on(ObjectivesEventTypes.CREATE_OBJECTIVE, onCreateObjective);
		return () => {
			off(ObjectivesEventTypes.CREATE_OBJECTIVE, onCreateObjective);
		};
	}, [on, off]);
	useEffect(() => {
		const onPickObjective = async (objectiveId: ObjectiveId, onData: (objective: Objective) => void) => {
			try {
				const objective = await fetchObjective(objectiveId);
				setEditOne(objective);
				onData(objective);
			} catch {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					{Lang.INDICATOR.OBJECTIVE.FAILED_TO_LOAD_OBJECTIVE}
				</AlertLabel>);
			}
		};
		on(ObjectivesEventTypes.PICK_OBJECTIVE, onPickObjective);
		return () => {
			off(ObjectivesEventTypes.PICK_OBJECTIVE, onPickObjective);
		};
	}, [on, off, fireGlobal]);
	useEffect(() => {
		const onAskObjective = (onData: (objective?: Objective) => void) => {
			onData(editOne == null ? (void 0) : editOne);
		};
		on(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		return () => {
			off(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		};
	}, [on, off, editOne]);
	useEffect(() => {
		const onAskBuckets = async (onData: (buckets: Array<QueryBucket>) => void) => {
			if (!allBuckets.loaded) {
				const data = (await listBuckets({search: '', pageNumber: 1, pageSize: 9999})).data;
				setAllBuckets({loaded: true, data});
				onData(data);
			} else {
				onData(allBuckets.data);
			}
		};
		on(ObjectivesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		return () => {
			off(ObjectivesEventTypes.ASK_ALL_BUCKETS, onAskBuckets);
		};
	}, [on, off, allBuckets]);
	useEffect(() => {
		const onAskBucketDetails = async (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => {
			if (bucketIds.length === 0) {
				onData([]);
			} else {
				// filter the bucket which didn't load yet
				// eslint-disable-next-line
				const lackedBucketIds = bucketIds.filter(bucketId => buckets.every(bucket => bucket.bucketId != bucketId));
				const lackedBuckets = await fetchBucketsByIds(lackedBucketIds);
				const all = [...lackedBuckets, ...buckets];
				setBuckets(all);
				const map = all.reduce((map, bucket) => {
					map[`${bucket.bucketId}`] = bucket;
					return map;
				}, {} as Record<BucketId, Bucket>);
				onData(bucketIds.map(bucketId => map[bucketId]).filter(bucket => bucket != null));
			}
		};
		const onAskBucket = async (bucketId: BucketId, onData: (bucket: Bucket) => void) => {
			// eslint-disable-next-line
			const found = buckets.find(bucket => bucket.bucketId == bucketId);
			if (found != null) {
				onData(found);
			} else {
				const {bucket} = await fetchBucket(bucketId);
				setBuckets([...buckets, bucket]);
				onData(bucket);
			}
		};
		on(ObjectivesEventTypes.ASK_BUCKETS_DETAILS, onAskBucketDetails);
		on(ObjectivesEventTypes.ASK_BUCKET, onAskBucket);
		return () => {
			off(ObjectivesEventTypes.ASK_BUCKETS_DETAILS, onAskBucketDetails);
			off(ObjectivesEventTypes.ASK_BUCKET, onAskBucket);
		};
	}, [on, off, buckets]);
	useEffect(() => {
		const onAskUserGroups = async (onData: (groups: Array<QueryUserGroupForHolder>) => void) => {
			if (!userGroups.loaded) {
				const data = (await listUserGroups({search: '', pageNumber: 1, pageSize: 9999})).data;
				setUserGroups({loaded: true, data});
				onData(data);
			} else {
				onData(userGroups.data);
			}
		};
		on(ObjectivesEventTypes.ASK_USER_GROUPS, onAskUserGroups);
		return () => {
			off(ObjectivesEventTypes.ASK_USER_GROUPS, onAskUserGroups);
		};
	}, [on, off, userGroups]);
	useEffect(() => {
		const onSaveObjective = (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void) => {
			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await saveObjective(objective),
					() => {
						fire(ObjectivesEventTypes.OBJECTIVE_SAVED, objective);
						onSaved(objective, true);
					},
					() => onSaved(objective, false));
			}, 500);
		};
		on(ObjectivesEventTypes.SAVE_OBJECTIVE, onSaveObjective);
		return () => {
			off(ObjectivesEventTypes.SAVE_OBJECTIVE, onSaveObjective);
		};
	}, [on, off, fire, fireGlobal, saveQueue]);

	return <Fragment/>;
};
