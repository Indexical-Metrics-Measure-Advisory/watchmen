import {TenantId} from '../tuples/tenant-types';

export interface Account {
	name?: string;
	credential?: string;
}

export interface LoginResponse {
	pass: boolean;
	admin: boolean;
	super: boolean;
	tenantId?: TenantId;
	error?: string;
}

export enum LoginMethod {
	DOLL = 'doll',
	SAML2 = 'saml2'
}

export interface LoginConfig {
	method: LoginMethod;
	url?: string;
}

export interface Saml2LoginRequest {
	// has value only on mock process
	mockUserName?: string;
	data: string;
	signature: string;
	algorithm: string;
	relayState: string;
}

export interface SSOLoginResponse extends LoginResponse {
	accountName?: string;
}
