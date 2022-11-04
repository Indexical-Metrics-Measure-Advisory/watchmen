import {Router} from '@/routes/types';
import {findAccount, quit} from '@/services/data/account';
import {matchPath, useLocation, useNavigate} from 'react-router-dom';
import {useEventBus} from '../../events/event-bus';
import {EventTypes} from '../../events/types';
import {MOCK_ACCOUNT_NAME} from '../constants';

export const useSideMenuRoutes = (bye: string) => {
	const navigate = useNavigate();
	const location = useLocation();
	const {fire} = useEventBus();

	const navigateTo = (path: string) => () => {
		if (!matchPath({path}, location.pathname)) {
			navigate(path);
		}
	};
	const logout = () => {
		fire(EventTypes.SHOW_YES_NO_DIALOG, bye, () => {
			fire(EventTypes.HIDE_DIALOG);
			quit();
			navigate(Router.LOGIN);
		}, () => fire(EventTypes.HIDE_DIALOG));
	};
	const account = findAccount() || {name: MOCK_ACCOUNT_NAME};

	return {account, navigateTo, logout};
};