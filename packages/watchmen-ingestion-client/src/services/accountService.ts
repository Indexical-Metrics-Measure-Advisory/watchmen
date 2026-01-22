import {Buffer} from 'buffer/';
import { User } from './authService';


export const base64Encode = (str: string): string => {
	return Buffer.from(str, 'utf-8').toString('base64');
};

export const base64Decode = (str: string): string => {
	return Buffer.from(str, 'base64').toString('utf-8');
};

export const ACCOUNT_KEY_IN_SESSION = 'IMMA-ACCOUNT';
export const ACCOUNT_TOKEN = 'IMMA-ACCOUNT-TOKEN';

export interface SessionAccount {
	name: string;
	admin: boolean;
	super: boolean;
	tenantId?: string;
}

export const saveAccountIntoSession = ({name, admin, super: superAdmin, tenantId}: SessionAccount) => {
	sessionStorage.setItem(
		ACCOUNT_KEY_IN_SESSION,
		base64Encode(
			JSON.stringify({
				name,
				admin,
				super: superAdmin,
				tenantId
			})
		)
	);
};

export const findAccount = (): SessionAccount | undefined => {
	const value = sessionStorage.getItem(ACCOUNT_KEY_IN_SESSION);
	if (value) {
		try {
			return JSON.parse(base64Decode(value));
		} catch {
			return void 0;
		}
	}

	return void 0;
};

export const isAdmin = (): boolean => {
	const account = findAccount();
	return !!account && account.admin;
};

export const isSuperAdmin = (): boolean => {
	const account = findAccount();
	return !!account && account.super;
};

export const saveTokenIntoSession = (token: string) => {
	sessionStorage.setItem(ACCOUNT_TOKEN, token);
};

export const findToken = (): string | null => {
	return sessionStorage.getItem(ACCOUNT_TOKEN) || '';
};


export const quit = () => {
	sessionStorage.clear();
};