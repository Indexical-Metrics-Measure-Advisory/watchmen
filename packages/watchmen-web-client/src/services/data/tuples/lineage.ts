import {Apis, get} from '../apis';
import {fetchMockFactorConsanguinity} from '../mock/tuples/mock-lineage';
import {isMockService} from '../utils';
import {FactorId} from './factor-types';
import {FactorConsanguinity} from './lineage-types';
import {TopicId} from './topic-types';

export const fetchFactorConsanguinity = async (options: {
	topicId: TopicId;
	factorId: FactorId;
}): Promise<FactorConsanguinity> => {
	const {topicId, factorId} = options;
	if (isMockService()) {
		return await fetchMockFactorConsanguinity({topicId, factorId});
	} else {
		return get({
			api: Apis.TOPIC_FACTOR_CONSANGUINITY,
			search: {topicId, factorId}
		});
	}
};
