import {Router} from '@/routes/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AlertLabel} from '../alert/widgets';
import {ICON_LOADING} from '../basic/constants';
import {useForceUpdate} from '../basic/utils';
import {useEventBus} from '../events/event-bus';
import {EventTypes} from '../events/types';
import {Lang} from '../langs';
import {RemoteRequestContainer} from './widgets';

export const RemoteRequest = () => {
	const navigate = useNavigate();
	const {on, off, fire} = useEventBus();
	const [count] = useState<{ value: number }>({value: 0});
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const on401 = () => {
			fire(EventTypes.SHOW_ALERT, <AlertLabel>{Lang.ERROR.UNAUTHORIZED}</AlertLabel>, () => {
				navigate(Router.LOGIN, {replace: true});
			});
		};
		const on403 = () => {
			fire(EventTypes.SHOW_ALERT, <AlertLabel>{Lang.ERROR.ACCESS_DENIED}</AlertLabel>, () => {
				navigate(Router.LOGIN, {replace: true});
			});
		};
		const onOtherError = () => {
			fire(EventTypes.SHOW_ALERT, <AlertLabel>{Lang.ERROR.UNPREDICTED}</AlertLabel>);
		};
		const onInvokeRemoteRequest = async (request: () => Promise<any>, success?: (data?: any) => void, failure?: (error?: any) => void, disableAlert?: boolean) => {
			// console.trace();
			count.value = count.value + 1;
			forceUpdate();
			try {
				const data = await request();
				success && success(data);
			} catch (e: any) {
				console.error(e);
				if (!disableAlert) {
					if (e.status === 401) {
						on401();
						return;
					} else if (e.status === 403) {
						on403();
					} else {
						onOtherError();
					}
				}
				failure && failure(e);
			} finally {
				count.value = count.value - 1;
				forceUpdate();
			}
		};
		on(EventTypes.INVOKE_REMOTE_REQUEST, onInvokeRemoteRequest);
		return () => {
			off(EventTypes.INVOKE_REMOTE_REQUEST, onInvokeRemoteRequest);
		};
	}, [on, off, fire, forceUpdate, navigate, count]);

	return <RemoteRequestContainer visible={count.value > 0}>
		<FontAwesomeIcon icon={ICON_LOADING} spin={true}/>
	</RemoteRequestContainer>;
};