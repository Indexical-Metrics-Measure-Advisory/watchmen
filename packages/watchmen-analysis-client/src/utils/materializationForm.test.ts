import { describe, it, expect } from 'vitest';
import {
  isTimeDimensionOption,
  resolveTargetTopicIdOnLoad,
} from '@/utils/materializationForm';

describe('isTimeDimensionOption', () => {
  it('uses the backend type when present, case-insensitively', () => {
    expect(isTimeDimensionOption({ name: 'region', type: 'TIME' })).toBe(true);
    expect(isTimeDimensionOption({ name: 'order_date', type: 'time' })).toBe(true);
    expect(isTimeDimensionOption({ name: 'statdate', type: 'CATEGORICAL' })).toBe(false);
    expect(isTimeDimensionOption({ name: 'accident_time', type: 'entity' })).toBe(false);
  });

  it('falls back to the name heuristic when the type is missing', () => {
    expect(isTimeDimensionOption({ name: 'notification_date' })).toBe(true);
    expect(isTimeDimensionOption({ name: 'region' })).toBe(false);
  });
});

describe('resolveTargetTopicIdOnLoad', () => {
  it("keeps 'auto' for auto-create rows even after a run persisted the topic id", () => {
    expect(
      resolveTargetTopicIdOnLoad({ targetTopicId: '1555259123422906368', autoCreateTopic: true }),
    ).toBe('auto');
  });

  it("keeps 'auto' when no topic id is stored", () => {
    expect(resolveTargetTopicIdOnLoad({ autoCreateTopic: true })).toBe('auto');
    expect(resolveTargetTopicIdOnLoad({ targetTopicId: null as unknown as string, autoCreateTopic: true })).toBe('auto');
    expect(resolveTargetTopicIdOnLoad({ targetTopicId: '', autoCreateTopic: false })).toBe('auto');
  });

  it('shows the stored topic for rows bound to an existing topic', () => {
    expect(
      resolveTargetTopicIdOnLoad({ targetTopicId: '1422229872751102976', autoCreateTopic: false }),
    ).toBe('1422229872751102976');
  });

  it('shows the stored topic when the flag is absent (older rows)', () => {
    expect(resolveTargetTopicIdOnLoad({ targetTopicId: 'topic-9' })).toBe('topic-9');
  });
});
