// Topic profile service.
// Source router: packages/watchmen-rest-dqc/.../topic_profile/topic_profile_router.py
// (GET /dqc/topic/profile?topic_id=&date=).
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';
import type { TopicProfile } from '@/models/topicProfile';

class TopicProfileService {
	/** Corresponds to: GET /dqc/topic/profile?topic_id=&date= */
	async findProfile(topicId: string, date?: string): Promise<TopicProfile> {
		const qs = new URLSearchParams();
		qs.set('topic_id', topicId);
		if (date) qs.set('date', date);
		const res = await fetch(`${API_BASE_URL}/dqc/topic/profile?${qs.toString()}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}
}

export const topicProfileService = new TopicProfileService();
export default topicProfileService;
