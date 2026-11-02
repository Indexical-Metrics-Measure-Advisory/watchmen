import type {
	MetricBucket,
	MetricBucketPageQuery,
	MetricBucketPageResult
} from '@/model/metricBucket';
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';

const BASE_URL = `${API_BASE_URL}/metricflow/buckets`;

class MetricBucketService {
	private static instance: MetricBucketService;

	private constructor() {}

	public static getInstance(): MetricBucketService {
		if (!MetricBucketService.instance) {
			MetricBucketService.instance = new MetricBucketService();
		}
		return MetricBucketService.instance;
	}

	async pageBuckets(query: MetricBucketPageQuery): Promise<MetricBucketPageResult> {
		const response = await fetch(`${BASE_URL}/page`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify({
				...query,
				query_name: query.query_name?.trim() || undefined
			})
		});
		return checkResponse(response);
	}

	async getBucket(bucketId: string): Promise<MetricBucket> {
		const response = await fetch(`${BASE_URL}/${encodeURIComponent(bucketId)}`, {
			headers: getDefaultHeaders()
		});
		return checkResponse(response);
	}

	async saveBucket(bucket: Partial<MetricBucket>): Promise<MetricBucket> {
		const response = await fetch(BASE_URL, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(bucket)
		});
		return checkResponse(response);
	}

	async listNumericValueBuckets(queryName?: string): Promise<MetricBucket[]> {
		const params = new URLSearchParams();
		if (queryName?.trim()) {
			params.set('query_name', queryName.trim());
		}
		const query = params.toString();
		const response = await fetch(`${BASE_URL}/numeric-value${query ? `?${query}` : ''}`, {
			headers: getDefaultHeaders()
		});
		const result = await checkResponse(response);
		if (Array.isArray(result)) {
			return result;
		}
		return result?.data ?? result?.buckets ?? [];
	}
}

export const metricBucketService = MetricBucketService.getInstance();
