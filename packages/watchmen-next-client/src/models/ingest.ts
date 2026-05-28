import { HealthStatus } from "./common";

export type DataSourceType =
	| "mysql"
	| "oracle"
	| "mongodb"
	| "mssql"
	| "postgresql"
	| "snowflake"
	| "oss"
	| "s3"
	| "adls";

export type DataSource = {
	dataSourceId: string;
	dataSourceCode: string;
	dataSourceType: DataSourceType;
	host?: string;
	port?: string;
	username?: string;
	name: string;
	url?: string;
	healthStatus: HealthStatus;
	lastSync?: string;
	recordCount?: number;
	domain?: string;
};