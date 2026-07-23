// Topic service — read-only topic/factor pickers for the rule editor, catalog
// editor and filters.
//
// NOTE: the DQC backend (watchmen-rest-dqc) exposes no topic-list endpoint, so
// topics are loaded from the doll admin topic router
// (packages/watchmen-rest-doll/.../admin/topic_router.py) on the auth service
// host — the same source used by watchmen-monitor-client's topicService.
import { checkResponse, getDefaultHeaders } from '@/utils/apiConfig';
import { getAuthServiceHost } from '@/utils/utils';
import type { Topic } from '@/models/topic';

const baseUrl = () => getAuthServiceHost();

class TopicService {
	/** GET /topic/all — all topics for the tenant (doll admin topic_router). */
	async getAllTopics(): Promise<Topic[]> {
		const res = await fetch(`${baseUrl()}/topic/all`, { method: 'GET', headers: getDefaultHeaders() });
		return checkResponse(res);
	}

	/** GET /topic?topic_id= — load one topic by id (doll admin topic_router). */
	async getTopic(topicId: string): Promise<Topic> {
		const res = await fetch(`${baseUrl()}/topic?topic_id=${encodeURIComponent(topicId)}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}
}

export const topicService = new TopicService();
export default topicService;
