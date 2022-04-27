import {Apis, post} from '../apis';
import {MonitorRules} from '../data-quality/rule-types';
import {tryToMockImportTopicsAndPipelines} from '../mock/data-import/import-data';
import {Bucket} from '../tuples/bucket-types';
import {ConnectedSpace} from '../tuples/connected-space-types';
import {Indicator} from '../tuples/indicator-types';
import {Pipeline} from '../tuples/pipeline-types';
import {Space} from '../tuples/space-types';
import {Topic} from '../tuples/topic-types';
import {isMockService} from '../utils';
import {ImportDataResponse} from './import-data-types';

export enum ImportTPSCSType {
	NON_REDUNDANT = 'non-redundant',
	REPLACE = 'replace',
	FORCE_NEW = 'force-new'
}

export const tryToImportTopicsAndPipelines = async (options: {
	topics: Array<Topic>;
	pipelines: Array<Pipeline>;
	spaces: Array<Space>;
	connectedSpaces: Array<ConnectedSpace>;
	monitorRules: MonitorRules;
	indicators: Array<Indicator>;
	buckets: Array<Bucket>;
	importType: ImportTPSCSType;
}): Promise<ImportDataResponse> => {
	if (isMockService()) {
		return await tryToMockImportTopicsAndPipelines(options);
	} else {
		const response = await post({
			api: Apis.IMPORT_TOPICS_AND_PIPELINES,
			data: options
		});

		return {
			passed: response.passed,
			topics: response.topics,
			pipelines: response.pipelines
		};
	}
};