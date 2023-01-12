import {isSaml2MockEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {getWebContext} from '@/routes/utils';
import {saveTokenIntoSession} from '../account';
import {Apis, get, post} from '../apis';
import {mockLogin} from '../mock/mock-login';
import {UserRole} from '../tuples/user-types';
import {doFetch, getServiceHost, isMockService} from '../utils';
import {Account, LoginConfig, LoginMethod, LoginResponse, Saml2LoginRequest, SSOLoginResponse} from './types';

const isAdmin = (loginResult: any) => {
	return loginResult.role === UserRole.ADMIN || loginResult.role === UserRole.SUPER_ADMIN;
};
const isSuperAdmin = (loginResult: any) => {
	return loginResult.role === UserRole.SUPER_ADMIN;
};

export const login = async (account: Account): Promise<LoginResponse> => {
	if (isMockService()) {
		return mockLogin(account);
	} else {
		const data: Record<string, string> = {
			username: account.name || '',
			password: account.credential || '',
			grant_type: 'password'
		};
		const body = Object.keys(data).reduce((pairs, key) => {
			pairs.push(`${key}=${encodeURIComponent(data[key])}`);
			return pairs;
		}, [] as Array<string>).join('&');
		const response = await doFetch(`${getServiceHost()}${Apis.LOGIN}`, {
			method: 'POST',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			body
		});

		const result = await response.json();
		saveTokenIntoSession(result.accessToken ?? result.access_token);

		return {pass: true, admin: isAdmin(result), super: isSuperAdmin(result), tenantId: result.tenantId};
	}
};

const getSaml2MockUrl = (): string => {
	const protocol = window.location.protocol;
	const host = window.location.host;

	return `${protocol}//${host}${getWebContext()}${Router.MOCK_SAML2_LOGIN}`;
};

export const askLoginConfig = async (): Promise<LoginConfig> => {
	if (isMockService()) {
		if (isSaml2MockEnabled()) {
			return {method: LoginMethod.SAML2, url: getSaml2MockUrl()};
		} else {
			return {method: LoginMethod.DOLL};
		}
	} else {
		try {
			return await get({api: Apis.LOGIN_CONFIG});
		} catch {
			return {method: LoginMethod.DOLL};
		}
	}
};

export const saveCurrentURL = () => {
	const url = sessionStorage.getItem('entry-point');
	if (url == null || url.trim().length === 0) {
		sessionStorage.setItem('entry-point', window.location.href);
	}
};

export const removeSSOTriggerURL = () => {
	sessionStorage.removeItem('entry-point');
};
export const getSSOTriggerURL = (): string | null => {
	const url = sessionStorage.getItem('entry-point');
	removeSSOTriggerURL();
	return url;
};

export const getSaml2CallbackUrl = (): string => {
	const protocol = window.location.protocol;
	const host = window.location.host;

	return `${protocol}//${host}${getWebContext()}${Router.SAML2_CALLBACK}`;
};

export const exchangeOnSaml2 = async (request: Saml2LoginRequest): Promise<SSOLoginResponse> => {
	if (isMockService()) {
		const mocked = await mockLogin({name: request.mockUserName});
		return {
			...mocked,
			accountName: request.mockUserName
		};
	} else {
		delete request.mockUserName;
		const response = await post({api: Apis.EXCHANGE_SAML2_TOKEN, data: request});
		saveTokenIntoSession(response.accessToken ?? response.access_token);
		return {
			pass: true,
			accountName: response.accountName,
			admin: isAdmin(response),
			super: isSuperAdmin(response),
			tenantId: response.tenantId
		};
	}
};