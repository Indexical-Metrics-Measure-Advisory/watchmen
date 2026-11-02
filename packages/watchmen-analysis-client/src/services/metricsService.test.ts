import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetricsService } from '@/services/metricsService';

vi.mock('@/utils/apiConfig', () => ({
  API_BASE_URL: 'http://api',
  getDefaultHeaders: () => ({ 'Content-Type': 'application/json' })
}));

describe('MetricsService.getMetricValue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serializes valueBucketId as value_bucket_id without adding it to group_by', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ column_names: ['valueBucket', 'revenue'], data: [] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await new MetricsService().getMetricValue({
      metric: 'revenue',
      valueBucketId: 'bucket-1',
      group_by: ['region']
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      metric: 'revenue',
      value_bucket_id: 'bucket-1',
      group_by: ['region']
    });
    expect(body).not.toHaveProperty('valueBucketId');
  });
});
