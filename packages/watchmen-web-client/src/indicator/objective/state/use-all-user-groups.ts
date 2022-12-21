import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {listUserGroups} from '@/services/data/tuples/user-group';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

interface AllUserGroupsState {
	loaded: boolean;
	data: Array<QueryUserGroupForHolder>;
}

export const useAllUserGroups = () => {
	const {on, off} = useObjectivesEventBus();
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
		on(ObjectivesEventTypes.ASK_ALL_USER_GROUPS, onAskUserGroups);
		return () => {
			off(ObjectivesEventTypes.ASK_ALL_USER_GROUPS, onAskUserGroups);
		};
	}, [on, off, userGroups]);
};