import {isSuperAdmin} from '@/services/data/account';
import {QueryTenant} from '@/services/data/tuples/query-tenant-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {User, UserRole} from '@/services/data/tuples/user-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyCheckBox, TuplePropertyDropdown, TuplePropertyInput, TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {listUsers} from '@/services/data/tuples/user';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useLanguage} from '@/widgets/langs';
import React, {ChangeEvent, useEffect, useState} from 'react';
import {HoldByUser} from './types';
import {UserGroupPicker} from './user-group-picker';

const UserEditor = (props: { user: User, codes?: HoldByUser }) => {
	const {
		user,
		codes: {
			groups = [] as Array<QueryUserGroupForHolder>,
			tenants = [] as Array<QueryTenant>
		} = {}
	} = props;

	const {fire} = useTupleEventBus();
	const forceUpdate = useForceUpdate();
	const {fire: fireGlobal} = useEventBus();
	const language = useLanguage();
	const [originalName, setOriginalName] = useState(user.name);
	useEffect(() => {
		setOriginalName(user.name);
	}, [user]);

	const onPropChange = (prop: 'name' | 'nickName' | 'password' | 'email') => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (user[prop] !== event.target.value) {
			user[prop] = event.target.value;
			fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
			forceUpdate();
		}
	};
	const onRoleChange = (option: DropdownOption) => {
		user.role = option.value as UserRole;
		fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
		forceUpdate();
	};
	const onTenantChange = (option: DropdownOption) => {
		user.tenantId = option.value as string;
		fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
		forceUpdate();
	};
	const onIsActiveChange = (value: boolean) => {
		user.isActive = value;
		fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
		forceUpdate();
	};
	const onNameBlur = async () => {
		const newName = user.name?.trim();
		if (newName === originalName) {
			return;
		}

		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await listUsers({search: newName, pageSize: 9999}),
			(page: any) => {
				// eslint-disable-next-line
				const found = page.data.find((u: any) => u.name === newName && u.tenantId == user.tenantId && u.userId !== user.userId);
				if (found) {
					fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{language.PLAIN.USER_NAME_EXIST}</AlertLabel>);
					user.name = originalName;
					fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
					forceUpdate();
				} else {
					setOriginalName(newName);
				}
			}
		);
	};

	// guard data
	user.userGroupIds = user.userGroupIds || [];
	const roleOptions: Array<DropdownOption> = [
		{label: 'Console User', value: UserRole.CONSOLE},
		{label: 'Administrator', value: UserRole.ADMIN}
	];
	const tenantOptions: Array<DropdownOption> = tenants.map(tenant => {
		return {label: tenant.name, value: tenant.tenantId};
	});

	return <>
		<TuplePropertyLabel>User Name:</TuplePropertyLabel>
		<TuplePropertyInput value={user.name || ''} onChange={onPropChange('name')} onBlur={onNameBlur}/>
		<TuplePropertyLabel>Nick Name:</TuplePropertyLabel>
		<TuplePropertyInput value={user.nickName || ''} onChange={onPropChange('nickName')}/>
		<TuplePropertyLabel>Password:</TuplePropertyLabel>
		<TuplePropertyInput value={user.password || ''} onChange={onPropChange('password')}
		                    placeholder="Leave empty if keep password"/>
		<TuplePropertyLabel>Email:</TuplePropertyLabel>
		<TuplePropertyInput value={user.email || ''} onChange={onPropChange('email')}/>
		<TuplePropertyLabel>User Role:</TuplePropertyLabel>
		<TuplePropertyDropdown value={user.role || UserRole.CONSOLE} options={roleOptions} onChange={onRoleChange}/>
		{isSuperAdmin()
			? <>
				<TuplePropertyLabel>Is Active:</TuplePropertyLabel>
				<TuplePropertyCheckBox value={user.isActive !== false} onChange={onIsActiveChange}/>
				<TuplePropertyLabel>Data Zone:</TuplePropertyLabel>
				<TuplePropertyDropdown value={user.tenantId} options={tenantOptions} onChange={onTenantChange}/>
			</>
			: <>
				<TuplePropertyLabel>Groups:</TuplePropertyLabel>
				<UserGroupPicker label="Join Group" user={user} codes={groups}/>
			</>}
	</>;
};
export const renderEditor = (user: User, codes?: HoldByUser) => {
	return <UserEditor user={user} codes={codes}/>;
};
