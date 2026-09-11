import {DataSource} from './data-source-types';
import {QueryTuple, QueryTupleForHolder} from './tuple-types';

export interface QueryDataSource extends Pick<DataSource, 'dataSourceId' | 'dataSourceType' | 'dataSourceCode' | 'name' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
	tenantName: string;
}

export interface QueryDataSourceForHolder extends Pick<DataSource, 'dataSourceId' | 'dataSourceCode' | 'dataSourceType'>, QueryTupleForHolder {
}
