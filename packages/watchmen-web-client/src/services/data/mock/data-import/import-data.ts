import {ImportTPSCSType} from '../../data-import/import-data';
import {ImportDataResponse} from '../../data-import/import-data-types';
import {MonitorRules} from '../../data-quality/rule-types';
import {Bucket} from '../../tuples/bucket-types';
import {ConnectedSpace} from '../../tuples/connected-space-types';
import {Indicator} from '../../tuples/indicator-types';
import {Pipeline} from '../../tuples/pipeline-types';
import {Space} from '../../tuples/space-types';
import {Topic} from '../../tuples/topic-types';

export const tryToMockImportTopicsAndPipelines = async (options: {
	topics: Array<Topic>;
	pipelines: Array<Pipeline>;
	spaces: Array<Space>;
	connectedSpaces: Array<ConnectedSpace>;
	monitorRules: MonitorRules;
	indicators: Array<Indicator>;
	buckets: Array<Bucket>;
	importType: ImportTPSCSType;
}): Promise<ImportDataResponse> => {
	return new Promise(resolve => {
		setTimeout(() => resolve({passed: true}), 1000);
	});
};