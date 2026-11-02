import type { MaterializationFilter, MockDimensionOption } from '@/model/materialization';
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

const quoteFilterValue = (value: string): string => {
  const trimmed = value.trim();
  return /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed) || /^(?:true|false)$/i.test(trimmed)
    ? trimmed
    : `'${trimmed.replace(/'/g, "''")}'`;
};

export const buildMaterializationWhere = (filters: MaterializationFilter[]): string | undefined => {
  const conditions = filters
    .filter(filter => filter.field && filter.value.trim())
    .map(filter => {
      const value = filter.operator === 'IN'
        ? `(${filter.value.split(',').map(quoteFilterValue).join(', ')})`
        : quoteFilterValue(filter.value);
      return `{{ ${filter.referenceType}('${filter.field}') }} ${filter.operator} ${value}`;
    });
  return conditions.length > 0 ? conditions.join(' AND ') : undefined;
};

const splitFilterConditions = (where: string): string[] => {
  const parts: string[] = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < where.length; index += 1) {
    if (where[index] === "'") {
      if (quoted && where[index + 1] === "'") index += 1;
      else quoted = !quoted;
    } else if (!quoted && /\s/i.test(where[index]) && where.slice(index).match(/^\s+AND\s+/i)) {
      const match = where.slice(index).match(/^\s+AND\s+/i)!;
      parts.push(where.slice(start, index));
      start = index + match[0].length;
      index = start - 1;
    }
  }
  parts.push(where.slice(start));
  return parts;
};

const unquoteFilterValue = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")
    ? trimmed.slice(1, -1).replace(/''/g, "'")
    : trimmed;
};

export const parseMaterializationWhere = (where?: string): MaterializationFilter[] => {
  if (!where?.trim()) return [];
  return splitFilterConditions(where).flatMap(condition => {
    const match = condition.match(
      /^\s*\{\{\s*(Dimension|Entity|TimeDimension|Metric)\s*\(\s*'([^']+)'\s*(?:,\s*'[^']*'\s*)?\)\s*\}\}\s*(=|!=|>=|<=|>|<|IN)\s*(.+?)\s*$/i,
    );
    if (!match) return [];
    const operator = match[3].toUpperCase() as MaterializationFilter['operator'];
    const rawValue = match[4].trim();
    const value = operator === 'IN' && rawValue.startsWith('(') && rawValue.endsWith(')')
      ? rawValue.slice(1, -1).split(',').map(unquoteFilterValue).join(', ')
      : unquoteFilterValue(rawValue);
    return [{
      field: match[2],
      referenceType: match[1].toLowerCase() === 'metric' ? 'Metric' as const : 'Dimension' as const,
      operator,
      value,
    }];
  });
};
