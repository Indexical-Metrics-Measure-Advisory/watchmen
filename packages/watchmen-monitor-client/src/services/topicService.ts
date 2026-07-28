// Topic catalog service — read-only consumption for the Monitor console.
// Source router: packages/watchmen-rest-doll/.../admin/topic_router.py (+ topic_yaml_router)
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import type { Pageable, DataPage } from '@/models/api.models';
import type { Topic, QueryTopicDataPage } from '@/models/topic.models';

class TopicService {
  /** GET /topic — load one topic by id. */
  async getTopic(topicId: string): Promise<Topic> {
    const url = `${API_BASE_URL}/topic?topic_id=${encodeURIComponent(topicId)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** POST /topic/name — paginated name search. */
  async searchTopics(queryName: string | null, pageable: Pageable): Promise<QueryTopicDataPage> {
    const url = `${API_BASE_URL}/topic/name?query_name=${encodeURIComponent(queryName ?? '')}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(pageable),
    });
    return checkResponse(res);
  }

  /** GET /topic/list/name — typeahead list (optional exclude_types). */
  async listTopicsByName(queryName: string | null, excludeTypes?: string): Promise<Topic[]> {
    const qs = new URLSearchParams();
    if (queryName) qs.set('query_name', queryName);
    if (excludeTypes) qs.set('exclude_types', excludeTypes);
    const res = await fetch(`${API_BASE_URL}/topic/list/name?${qs.toString()}`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    return checkResponse(res);
  }

  /** GET /topic/all — all topics for the tenant. */
  async getAllTopics(): Promise<Topic[]> {
    const res = await fetch(`${API_BASE_URL}/topic/all`, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** POST /topic/ids — bulk resolve topics by ids. */
  async getTopicsByIds(topicIds: string[]): Promise<Topic[]> {
    if (topicIds.length === 0) return [];
    const res = await fetch(`${API_BASE_URL}/topic/ids`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(topicIds),
    });
    return checkResponse(res);
  }

  /** GET /topic/name/yaml — YAML for a topic (raw text). */
  async getTopicYamlByName(queryName: string): Promise<string> {
    const url = `${API_BASE_URL}/topic/name/yaml?query_name=${encodeURIComponent(queryName)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch topic yaml: ${res.status}`);
    }
    return res.text();
  }

  /** GET /topic/all — typed as a DataPage-less list (kept for compatibility). */
  async listAll(): Promise<DataPage<Topic>> {
    const data = await this.getAllTopics();
    return { data, itemCount: data.length, pageCount: 1 };
  }
}

export const topicService = new TopicService();
export default topicService;
