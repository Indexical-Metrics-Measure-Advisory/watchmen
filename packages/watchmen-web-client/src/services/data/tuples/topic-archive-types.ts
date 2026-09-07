import {ParameterJoint} from './factor-calculator-types';
import {DataSourceId} from './data-source-types';
import {TenantId} from './tenant-types';
import {TopicId} from './topic-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum ArchiveBatchStatus {
	COPYING = 'copying',
	COPIED = 'copied',
	VERIFIED = 'verified',
	PURGED = 'purged',
	FAILED = 'failed'
}

export type TopicArchivePolicyId = string;
export type ArchiveBatchId = string;

export interface TopicArchivePolicy extends Tuple, OptimisticLock {
	policyId: TopicArchivePolicyId;
	topicId: TopicId;
	enabled: boolean;
	hotDays: number;
	// archived data is kept forever when cold days is null
	coldDays?: number | null;
	archiveDataSourceId: DataSourceId;
	batchSize: number;
	// only topic data matching the filter is archived, null means all
	filter?: ParameterJoint;
	destroyRequiresApproval: boolean;
	tenantId?: TenantId;
}

export interface ArchiveBatch extends Tuple {
	batchId: ArchiveBatchId;
	policyId: TopicArchivePolicyId;
	topicId: TopicId;
	timeFrom?: string;
	timeTo?: string;
	rowCount: number;
	checksum?: string;
	storageUri?: string;
	status: ArchiveBatchStatus;
	errorMessage?: string;
	archivedAt?: string;
	tenantId?: TenantId;
}

export interface TopicArchiveResult {
	topicId: TopicId;
	topicName?: string;
	dryRun: boolean;
	cutoffTime?: string;
	totalRows: number;
	plannedBatches: number;
	batches: Array<ArchiveBatch>;
}
