// User + token models (subset of watchmen-model admin/user.py and the doll
// authenticate router's token response).

export interface Token {
	accessToken: string;
	tokenType: string;
	role: string;
	tenantId: string;
}

export interface User {
	userId?: string;
	id?: string;
	name: string;
	email?: string;
	role: string;
	tenantId?: string;
	isActive?: boolean;
}

export interface LoginCredentials {
	username: string;
	password: string;
}
