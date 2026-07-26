// Topic lineage service — wraps GET /lineage/topic/consanguinity.
// Source router: packages/watchmen-lineage/.../router/lineage_router.py
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import type { TopicConsanguinity } from '@/models/lineage.models';

class LineageService {
  /** GET /lineage/topic/consanguinity — topic-level upstream lineage chain. */
  async getTopicConsanguinity(topicId: string): Promise<TopicConsanguinity> {
    const url = `${API_BASE_URL}/lineage/topic/consanguinity?topic_id=${encodeURIComponent(topicId)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }
}

export const lineageService = new LineageService();
export default lineageService;
