import type { MockDimensionOption } from '@/model/materialization';
import { isTimeDimensionByName } from '@/utils/dimensionQuery';

/**
 * Whether a dimension belongs to the time group of the dimension picker.
 * The backend dimension type wins; options without a type (mock data or
 * older responses) fall back to the shared name-based heuristic so the
 * grouping matches what buildGroupBy does with the same dimension.
 */
export const isTimeDimensionOption = (
  dim: Pick<MockDimensionOption, 'name' | 'type'>,
): boolean => (dim.type ? dim.type.toLowerCase() === 'time' : isTimeDimensionByName(dim.name));

/**
 * Which option the target-topic select must show when the dialog reopens a
 * stored row. Rows saved with auto-create keep `autoCreateTopic=true` even
 * after a run persisted the concrete topic id, so the flag wins; a concrete
 * id is only shown for rows explicitly bound to an existing topic.
 */
export const resolveTargetTopicIdOnLoad = (initial: {
  targetTopicId?: string;
  autoCreateTopic?: boolean;
}): string =>
  initial.targetTopicId && initial.autoCreateTopic !== true
    ? initial.targetTopicId
    : 'auto';
