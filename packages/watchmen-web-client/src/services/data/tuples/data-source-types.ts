import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export enum DataSourceType {
	MYSQL = 'mysql',
	ORACLE = 'oracle',
	MONGODB = 'mongodb',
	MSSQL = 'mssql',
	POSTGRESQL = 'postgresql',
	AWS_S3 = 's3',
	ALI_OSS = 'oss',
	AZURE_BLOB_STORAGE = 'azure_blob_storage',
	SNOWFLAKE = 'snowflake',
	REDSHIFT = 'redshift',
}

export interface DataSourceParam {
	name: string;
	value: string;
}

export type DataSourceId = string;

export interface DataSource extends Tuple, OptimisticLock {
	dataSourceId: DataSourceId;
	dataSourceCode: string;
	dataSourceType: DataSourceType;
	host: string;
	port: string;
	name: string;
	username: string;
	password: string;
	url: string;
	params: Array<DataSourceParam>;
	tenantId?: TenantId;
}
