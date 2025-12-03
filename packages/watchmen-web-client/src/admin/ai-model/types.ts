
import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';

export interface HoldByAiModel {
	tenants: Array<QueryTenantForHolder>;
}
