import {Objective} from '@/services/data/tuples/objective-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {UserGroupPicker} from './user-group-picker';

export const UserGroup = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useObjectivesEventBus();
	const [userGroups, setUserGroups] = useState<{ loaded: boolean; data: Array<QueryUserGroupForHolder> }>({
		loaded: false, data: []
	});
	useEffect(() => {
		if (!userGroups.loaded) {
			fire(ObjectivesEventTypes.ASK_ALL_USER_GROUPS, (groups: Array<QueryUserGroupForHolder>) => {
				setUserGroups({loaded: true, data: groups});
			});
		}
	}, [fire, userGroups.loaded]);

	if (objective.userGroupIds == null) {
		objective.userGroupIds = [];
	}

	return <EditStep index={ObjectiveDeclarationStep.USER_GROUP} title={Lang.INDICATOR.OBJECTIVE.USER_GROUP_TITLE}>
		<UserGroupPicker objective={objective} codes={userGroups.data}/>
	</EditStep>;
};