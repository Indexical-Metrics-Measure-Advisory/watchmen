import {Objective} from '@/services/data/tuples/objective-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {listUserGroupsForHolder} from '@/services/data/tuples/user-group';
import {UserGroupId} from '@/services/data/tuples/user-group-types';
import {noop} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import {TupleItemPicker} from '@/widgets/tuple-workbench/tuple-item-picker';
import React from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';

const hasUserGroup = (objective: Objective) => !!objective.userGroupIds && objective.userGroupIds.length > 0;
const getUserGroupIds = (objective: Objective): Array<UserGroupId> => objective.userGroupIds;
const findNameFromUserGroups = (userGroupId: UserGroupId, userGroups: Array<QueryUserGroupForHolder>): string => {
	// eslint-disable-next-line
	return userGroups.find(userGroup => userGroup.userGroupId == userGroupId)!.name;
};
const getIdOfUserGroup = (userGroup: QueryUserGroupForHolder) => userGroup.userGroupId;
const getNameOfUserGroup = (userGroup: QueryUserGroupForHolder) => userGroup.name;
// eslint-disable-next-line
const isUserGroupPicked = (objective: Objective) => (userGroup: QueryUserGroupForHolder) => objective.userGroupIds.some(userGroupId => userGroupId == userGroup.userGroupId);

export const UserGroupPicker = (props: { objective: Objective; codes: Array<QueryUserGroupForHolder> }) => {
	const {objective, codes} = props;

	const {fire} = useObjectivesEventBus();

	const removeUserGroup = (objective: Objective) => (userGroupOrId: string | QueryUserGroupForHolder) => {
		let userGroupId: UserGroupId;
		if (typeof userGroupOrId === 'string') {
			userGroupId = userGroupOrId;
		} else {
			userGroupId = userGroupOrId.userGroupId;
		}
		// eslint-disable-next-line
		const index = objective.userGroupIds.findIndex(id => id == userGroupId);
		if (index !== -1) {
			objective.userGroupIds.splice(index, 1);
			fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		}
	};
	const addUserGroup = (objective: Objective) => (userGroup: QueryUserGroupForHolder) => {
		const {userGroupId} = userGroup;
		// eslint-disable-next-line
		const index = objective.userGroupIds.findIndex(id => id == userGroupId);
		if (index === -1) {
			objective.userGroupIds.push(userGroupId);
			fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		}
	};

	return <TupleItemPicker actionLabel={Lang.INDICATOR.OBJECTIVE.GRANT_USER_GROUP}
	                        holder={objective} codes={codes}
	                        isHolding={hasUserGroup} getHoldIds={getUserGroupIds} getNameOfHold={findNameFromUserGroups}
	                        listCandidates={listUserGroupsForHolder} getIdOfCandidate={getIdOfUserGroup}
	                        getNameOfCandidate={getNameOfUserGroup} isCandidateHold={isUserGroupPicked(objective)}
	                        removeHold={removeUserGroup(objective)} addHold={addUserGroup(objective)}/>;
};
