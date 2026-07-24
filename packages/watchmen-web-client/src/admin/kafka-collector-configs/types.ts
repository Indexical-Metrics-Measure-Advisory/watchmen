import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';
import {HoldByTuple} from '@/widgets/tuple-workbench/tuple-event-bus-types';

export interface HoldByKafkaCollectorConfig extends HoldByTuple {
	tenants?: Array<QueryTenantForHolder>;
}
