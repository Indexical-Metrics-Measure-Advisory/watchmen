import {Indicator} from '@/services/data/tuples/indicator-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {fetchUserGroupsByIds} from '@/services/data/tuples/user-group';
import {UserGroupId} from '@/services/data/tuples/user-group-types';
import {isFakedUuid} from '@/services/data/tuples/utils';
import {noop} from '@/services/utils';
import {ICON_DELETE, ICON_USER_GROUP} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect, useState} from 'react';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorsEventTypes} from '../../indicators-event-bus-types';
import {AssignedIndicatorUserGroup, AssignedIndicatorUserGroupsContainer} from './widgets';

export const AssignedIndicatorUserGroups = (props: { indicator: Indicator }) => {
	const {indicator} = props;

	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useIndicatorsEventBus();
	const [userGroups, setUserGroups] = useState<Array<QueryUserGroupForHolder>>([]);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onUserGroupPicked = (anIndicator: Indicator, userGroup: QueryUserGroupForHolder) => {
			if (anIndicator !== indicator) {
				return;
			}
			// eslint-disable-next-line
			if (userGroups.every(b => b.userGroupId != userGroup.userGroupId)) {
				setUserGroups([...userGroups, userGroup]);
			} else {
				forceUpdate();
			}
		};
		on(IndicatorsEventTypes.USER_GROUP_ASSIGNED, onUserGroupPicked);
		return () => {
			off(IndicatorsEventTypes.USER_GROUP_ASSIGNED, onUserGroupPicked);
		};
	}, [on, off, forceUpdate, indicator, userGroups]);
	useEffect(() => {
		if (indicator.userGroupIds == null || indicator.userGroupIds.length === 0) {
			return;
		}

		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchUserGroupsByIds(indicator.userGroupIds!),
			(userGroups: Array<QueryUserGroupForHolder>) => setUserGroups(userGroups));
	}, [fireGlobal, indicator]);

	const onRemoveClicked = (userGroupId: UserGroupId) => () => {
		if (indicator.userGroupIds == null) {
			return;
		}
		// eslint-disable-next-line
		const index = indicator.userGroupIds.findIndex(existsUserGroupId => existsUserGroupId == userGroupId);
		if (index !== -1) {
			indicator.userGroupIds.splice(index, 1);
			forceUpdate();
			fire(IndicatorsEventTypes.USER_GROUP_UNASSIGNED, indicator, userGroupId);
			if (!isFakedUuid(indicator)) {
				fire(IndicatorsEventTypes.SAVE_INDICATOR, indicator, noop);
			}
		}
	};

	return <AssignedIndicatorUserGroupsContainer>
		{(indicator.userGroupIds || []).map(userGroupId => {
			// eslint-disable-next-line
			const userGroup = userGroups.find(userGroup => userGroup.userGroupId == userGroupId);
			return <AssignedIndicatorUserGroup key={userGroupId}>
				<FontAwesomeIcon icon={ICON_USER_GROUP}/>
				<span>{userGroup?.name || 'Noname User Group'}</span>
				<span onClick={onRemoveClicked(userGroupId)}>
					<FontAwesomeIcon icon={ICON_DELETE}/>
				</span>
			</AssignedIndicatorUserGroup>;
		})}
	</AssignedIndicatorUserGroupsContainer>;
};