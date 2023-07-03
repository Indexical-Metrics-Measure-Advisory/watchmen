import {Convergence} from '@/services/data/tuples/convergence-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {EditStep} from '../edit-step';
import {ConvergenceDeclarationStep} from '../steps';
import {UserGroupPicker} from './user-group-picker';

export const UserGroup = (props: { convergence: Convergence }) => {
	const {convergence} = props;

	const {fire} = useConvergencesEventBus();
	const [userGroups, setUserGroups] = useState<{ loaded: boolean; data: Array<QueryUserGroupForHolder> }>({
		loaded: false, data: []
	});
	useEffect(() => {
		if (!userGroups.loaded) {
			fire(ConvergencesEventTypes.ASK_ALL_USER_GROUPS, (groups: Array<QueryUserGroupForHolder>) => {
				setUserGroups({loaded: true, data: groups});
			});
		}
	}, [fire, userGroups.loaded]);

	if (convergence.userGroupIds == null) {
		convergence.userGroupIds = [];
	}

	return <EditStep index={ConvergenceDeclarationStep.USER_GROUP} title={Lang.INDICATOR.CONVERGENCE.USER_GROUP_TITLE}>
		{userGroups.loaded
			? <UserGroupPicker convergence={convergence} codes={userGroups.data}/>
			: null}
	</EditStep>;
};