import {DataSource, DataSourceType} from '@/services/data/tuples/data-source-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createDataSource = (): DataSource => {
	return {
		dataSourceId: generateUuid(),
		dataSourceCode: '',
		dataSourceType: DataSourceType.MYSQL,
		host: '',
		port: '',
		name: '',
		username: '',
		password: '',
		url: '',
		params: [],
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
