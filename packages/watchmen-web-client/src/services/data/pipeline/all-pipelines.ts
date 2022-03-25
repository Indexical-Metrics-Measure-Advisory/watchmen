import {Dayjs} from 'dayjs';
import {Apis, get, post} from '../apis';
import {fetchMockAllPipelines} from '../mock/pipeline/mock-all-pipelines';
import {Pipeline} from '../tuples/pipeline-types';
import {isMockService} from '../utils';

export const fetchAllPipelines = async (): Promise<Array<Pipeline>> => {
	if (isMockService()) {
		return fetchMockAllPipelines();
	} else {
		return await get({api: Apis.PIPELINE_ALL});
	}
};

export const fetchUpdatedPipelines = async (lastModifiedTime: Dayjs): Promise<Array<Pipeline>> => {
	if (isMockService()) {
		return fetchMockAllPipelines();
	} else {
		return await post({api: Apis.PIPELINE_UPDATED, data: {at: lastModifiedTime.format('YYYY/MM/DD HH:mm:ss')}});
	}
};