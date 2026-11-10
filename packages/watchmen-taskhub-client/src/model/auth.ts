export enum SSOTypes {
  DOLL = 'doll',
  SAML2 = 'saml2',
  OIDC = 'oidc'
}

export interface LoginConfiguration {
  method: SSOTypes;
  url?: string;
}

export interface Token {
  accessToken: string;
  tokenType: string;
  role: string;
  tenantId: string;
}

export interface User {
  userId: string;
  name: string;
  email?: string;
  role: string;
  tenantId: string;
  isActive: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
