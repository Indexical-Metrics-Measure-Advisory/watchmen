import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {listUserGroups} from '@/services/data/tuples/user-group';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../convergences-event-bus';
import {ConvergencesEventTypes} from '../convergences-event-bus-types';

interface AllUserGroupsState {
	loaded: boolean;
	data: Array<QueryUserGroupForHolder>;
}

export const useAllUserGroups = () => {
	const {on, off} = useConvergencesEventBus();
	const [userGroups, setUserGroups] = useState<AllUserGroupsState>({loaded: false, data: []});
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
		on(ConvergencesEventTypes.ASK_ALL_USER_GROUPS, onAskUserGroups);
		return () => {
			off(ConvergencesEventTypes.ASK_ALL_USER_GROUPS, onAskUserGroups);
		};
	}, [on, off, userGroups]);
};