import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { RechartsModule } from './types';

// Recharts Lazy Loading Module - shared across all chart instances
let rechartsModuleCache: RechartsModule | null = null;
let rechartsModulePromise: Promise<RechartsModule> | null = null;

const loadRechartsModule = (): Promise<RechartsModule> => {
  if (rechartsModuleCache) return Promise.resolve(rechartsModuleCache);
  if (!rechartsModulePromise) {
    rechartsModulePromise = import('recharts').then(mod => {
      rechartsModuleCache = mod;
      return mod;
    });
  }
  return rechartsModulePromise;
};

interface RechartsContextValue {
  lib: RechartsModule | null;
}

const RechartsContext = createContext<RechartsContextValue>({ lib: null });

// Stable fallback value for when lib is null
const NULL_CONTEXT_VALUE: RechartsContextValue = { lib: null };

export const RechartsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lib, setLib] = useState<RechartsModule | null>(rechartsModuleCache);

  useEffect(() => {
    if (rechartsModuleCache) {
      setLib(rechartsModuleCache);
      return;
    }
    let mounted = true;
    void loadRechartsModule().then(mod => {
      if (mounted) setLib(mod);
    });
    return () => { mounted = false; };
  }, []);

  // Memoize context value to prevent unnecessary consumer re-renders
  const value = useMemo<RechartsContextValue>(
    () => lib ? { lib } : NULL_CONTEXT_VALUE,
    [lib]
  );

  return (
    <RechartsContext.Provider value={value}>
      {children}
    </RechartsContext.Provider>
  );
};

export const useRechartsModule = (): RechartsModule | null => {
  return useContext(RechartsContext).lib;
};
