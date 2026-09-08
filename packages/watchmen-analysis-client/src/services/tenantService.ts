import { WATCHMEN_API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';

export interface TenantInfo {
  tenantId: string;
  name?: string;
  enableAI?: boolean;
}

// tenant tuples live in the main watchmen rest app (rest-doll)
export const getTenant = async (tenantId: string): Promise<TenantInfo> => {
  const response = await fetch(
    `${WATCHMEN_API_BASE_URL}/tenant?tenant_id=${encodeURIComponent(tenantId)}`,
    { headers: getDefaultHeaders() }
  );
  return checkResponse(response);
};
