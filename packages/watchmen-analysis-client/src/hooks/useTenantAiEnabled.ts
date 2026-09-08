import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTenant } from '@/services/tenantService';

// one lookup per tenant per session, shared by every consumer of the hook;
// a failed lookup is dropped so the next consumer retries
const cache = new Map<string, Promise<boolean>>();

const askAiEnabled = (tenantId: string): Promise<boolean> => {
  let cached = cache.get(tenantId);
  if (!cached) {
    cached = getTenant(tenantId)
      .then((tenant) => tenant.enableAI === true)
      .catch((error) => {
        cache.delete(tenantId);
        console.error('Error loading tenant AI flag:', error);
        return false;
      });
    cache.set(tenantId, cached);
  }
  return cached;
};

/**
 * Whether the current user's tenant has AI enabled (`enableAI` on the tenant tuple).
 * Stays false while unresolved, so AI features stay hidden unless the flag is explicitly true.
 */
export const useTenantAiEnabled = (): { aiEnabled: boolean; isLoading: boolean } => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    askAiEnabled(tenantId).then((enabled) => {
      if (!cancelled) {
        setAiEnabled(enabled);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return { aiEnabled, isLoading };
};
