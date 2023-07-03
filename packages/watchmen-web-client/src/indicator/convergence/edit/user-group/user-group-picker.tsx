import {Convergence} from '@/services/data/tuples/convergence-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {listUserGroupsForHolder} from '@/services/data/tuples/user-group';
import {UserGroupId} from '@/services/data/tuples/user-group-types';
import {noop} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import {TupleEventBusProvider} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleItemPicker} from '@/widgets/tuple-workbench/tuple-item-picker';
import React from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';

const hasUserGroup = (convergence: Convergence) => !!convergence.userGroupIds && convergence.userGroupIds.length > 0;
const getUserGroupIds = (convergence: Convergence): Array<UserGroupId> => convergence.userGroupIds || [];
const findNameFromUserGroups = (userGroupId: UserGroupId, userGroups: Array<QueryUserGroupForHolder>): string => {
	// eslint-disable-next-line
	return (userGroups.find(userGroup => userGroup.userGroupId == userGroupId)?.name ?? Lang.ADMIN.UNKNOWN_USER_GROUP) || Lang.ADMIN.NONAME_USER_GROUP;
};
const getIdOfUserGroup = (userGroup: QueryUserGroupForHolder) => userGroup.userGroupId;
const getNameOfUserGroup = (userGroup: QueryUserGroupForHolder) => userGroup.name;
// eslint-disable-next-line
const isUserGroupPicked = (convergence: Convergence) => (userGroup: QueryUserGroupForHolder) => (convergence.userGroupIds || []).some(userGroupId => userGroupId == userGroup.userGroupId);

export const UserGroupPicker = (props: { convergence: Convergence; codes: Array<QueryUserGroupForHolder> }) => {
	const {convergence, codes} = props;

	const {fire} = useConvergencesEventBus();

	const removeUserGroup = (convergence: Convergence) => (userGroupOrId: string | QueryUserGroupForHolder) => {
		let userGroupId: UserGroupId;
		if (typeof userGroupOrId === 'string') {
			userGroupId = userGroupOrId;
		} else {
			userGroupId = userGroupOrId.userGroupId;
		}
		// eslint-disable-next-line
		const index = convergence.userGroupIds.findIndex(id => id == userGroupId);
		if (index !== -1) {
			convergence.userGroupIds.splice(index, 1);
			fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		}
	};
	const addUserGroup = (convergence: Convergence) => (userGroup: QueryUserGroupForHolder) => {
		const {userGroupId} = userGroup;
		// eslint-disable-next-line
		const index = convergence.userGroupIds.findIndex(id => id == userGroupId);
		if (index === -1) {
			convergence.userGroupIds.push(userGroupId);
			fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		}
	};

	return <TupleEventBusProvider>
		<TupleItemPicker actionLabel={Lang.INDICATOR.CONVERGENCE.GRANT_USER_GROUP}
		                 holder={convergence} codes={codes}
		                 isHolding={hasUserGroup} getHoldIds={getUserGroupIds} getNameOfHold={findNameFromUserGroups}
		                 listCandidates={listUserGroupsForHolder} getIdOfCandidate={getIdOfUserGroup}
		                 getNameOfCandidate={getNameOfUserGroup} isCandidateHold={isUserGroupPicked(convergence)}
		                 removeHold={removeUserGroup(convergence)} addHold={addUserGroup(convergence)}/>
	</TupleEventBusProvider>;
};
