import { API_BASE_URL, getDefaultHeaders, checkResponse, omitNil } from '@/utils/apiConfig';
import type { DataPage, Pageable } from '@/models/api.models';

/** Operation type values mirror AuditOperationType in watchmen_model/system/audit_log.py. */
export type AuditOperationType =
  | 'query'
  | 'config-edit'
  | 'execute'
  | 'import'
  | 'export'
  | 'login'
  | 'logout';

export const AUDIT_OPERATION_TYPES: ReadonlyArray<AuditOperationType> = [
  'query',
  'config-edit',
  'execute',
  'import',
  'export',
  'login',
  'logout',
];

/** One audit record returned by POST /audit/log. Mirrors watchmen_model.system.AuditLog. */
export interface AuditLogItem {
  auditId: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
  operationType?: string;
  /** Configuration resource the operation acted on, e.g. topic / pipeline / datasource. */
  resource?: string;
  /** Business detail of the operation, e.g. the saved topic's name and id. */
  detail?: string;
  method?: string;
  path?: string;
  queryString?: string;
  success?: boolean;
  durationMs?: number;
  clientIp?: string;
  userAgent?: string;
  occurredAt?: string;
}

/** Query criteria for POST /audit/log; extend Pageable with the supported filters. */
export interface AuditLogCriteria extends Pageable {
  accounts?: string[];
  operationTypes?: string[];
  resources?: string[];
  keyword?: string;
  success?: boolean | null;
  start?: string | null;
  end?: string | null;
}

export class AuditServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'AuditServiceError';
  }
}

export class AuditService {
  /** Paged audit log query (matches server endpoint: POST /audit/log). */
  async queryAuditLogs(criteria: AuditLogCriteria): Promise<DataPage<AuditLogItem>> {
    const response = await fetch(`${API_BASE_URL}/audit/log`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(omitNil(criteria as unknown as Record<string, unknown>)),
    });
    if (!response.ok) {
      throw new AuditServiceError(
        `Failed to query audit logs: ${response.status} ${response.statusText}`,
        response.status,
      );
    }
    return checkResponse(response);
  }

  /** Distinct account names for the filter dropdown (matches: GET /audit/log/accounts). */
  async getAccounts(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/audit/log/accounts`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    if (!response.ok) {
      throw new AuditServiceError(
        `Failed to list audit accounts: ${response.status} ${response.statusText}`,
        response.status,
      );
    }
    return checkResponse(response);
  }

  /** Distinct operation types present in the log (matches: GET /audit/log/operation-types). */
  async getOperationTypes(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/audit/log/operation-types`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    if (!response.ok) {
      throw new AuditServiceError(
        `Failed to list audit operation types: ${response.status} ${response.statusText}`,
        response.status,
      );
    }
    return checkResponse(response);
  }
}

export const auditService = new AuditService();
export default auditService;
