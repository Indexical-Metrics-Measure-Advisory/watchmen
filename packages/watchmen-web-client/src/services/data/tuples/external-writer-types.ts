import {Token} from '../types';
import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum ExternalWriterType {
	STANDARD_WRITER = 'standard-writer',
	ELASTIC_SEARCH_WRITER = 'elastic-search-writer'
}

export type ExternalWriterId = string;

export interface ExternalWriter extends Tuple, OptimisticLock {
	writerId: ExternalWriterId;
	writerCode: string;
	name: string;
	type: ExternalWriterType;
	pat?: Token;
	url: string;
	tenantId?: TenantId;
}
