import { useCallback, useEffect, useRef, useState } from 'react';
import { hypothesisService } from '@/services/hypothesisService';
import { useTenantAiEnabled } from '@/hooks/useTenantAiEnabled';
import type { HypothesisType } from '@/model/Hypothesis';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type HypothesisWorstStatus = 'drafted' | 'testing' | 'validated' | 'rejected';

export interface HypothesisBadge {
  total: number;
  worstStatus: HypothesisWorstStatus;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const BADGE_CACHE_TTL = 30_000;

// Higher number = "worse" — the worst status across a metric's hypotheses wins.
const STATUS_PRIORITY: Record<HypothesisWorstStatus, number> = {
  testing: 3,
  drafted: 2,
  rejected: 1,
  validated: 0,
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const buildBadges = (hypotheses: HypothesisType[]): Record<string, HypothesisBadge> => {
  const badges: Record<string, HypothesisBadge> = {};
  (hypotheses ?? []).forEach(h => {
    (h.metrics ?? []).forEach(metric => {
      if (!metric) return;
      const status = (h.status ?? 'drafted') as HypothesisWorstStatus;
      const existing = badges[metric];
      if (!existing) {
        badges[metric] = { total: 1, worstStatus: status };
      } else {
        existing.total += 1;
        if (STATUS_PRIORITY[status] > STATUS_PRIORITY[existing.worstStatus]) {
          existing.worstStatus = status;
        }
      }
    });
  });
  return badges;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

/**
 * useHypothesisBadges loads all hypotheses once and aggregates them into
 * per-metric badges (count + worst status). Mirrors the caching idiom of
 * useCardDataLoader: ref-based cache with a 30s TTL plus in-flight dedupe.
 * Hypotheses live behind the AI service, so nothing is fetched (or refreshed)
 * unless the current tenant has AI enabled.
 */
export const useHypothesisBadges = () => {
  const { aiEnabled } = useTenantAiEnabled();
  const [badges, setBadges] = useState<Record<string, HypothesisBadge>>({});
  const [loading, setLoading] = useState(false);

  const badgeCacheRef = useRef<{ badges: Record<string, HypothesisBadge>; timestamp: number } | null>(null);
  const badgeInFlightRef = useRef<Promise<void> | null>(null);

  const loadBadges = useCallback(async (force = false): Promise<void> => {
    if (!aiEnabled) {
      return;
    }
    const cached = badgeCacheRef.current;
    if (!force && cached && Date.now() - cached.timestamp < BADGE_CACHE_TTL) {
      setBadges(cached.badges);
      return;
    }
    if (badgeInFlightRef.current) {
      return badgeInFlightRef.current;
    }
    const request = (async () => {
      setLoading(true);
      try {
        const hypotheses = await hypothesisService.getHypotheses();
        const next = buildBadges(hypotheses);
        badgeCacheRef.current = { badges: next, timestamp: Date.now() };
        setBadges(next);
      } catch (e) {
        console.warn('Failed to load hypothesis badges.', e);
      } finally {
        setLoading(false);
        badgeInFlightRef.current = null;
      }
    })();
    badgeInFlightRef.current = request;
    return request;
  }, [aiEnabled]);

  useEffect(() => {
    if (!aiEnabled) {
      return;
    }
    void loadBadges();
  }, [aiEnabled, loadBadges]);

  const refresh = useCallback(() => loadBadges(true), [loadBadges]);

  return { badges, loading, refresh };
};
