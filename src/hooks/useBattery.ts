import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatterySnapshot, fetchBatterySnapshot } from '../lib/api/battery';
import { usePersonyAuth } from '../components/PersonyAuthProvider';

function canFetchBatterySnapshot(
  isSignedIn: boolean,
  apiAuthReady: boolean,
  clerkEnabled: boolean
): boolean {
  if (clerkEnabled && !apiAuthReady) return false;
  if (isSignedIn) return true;
  // Local dev: guest session via X-Persony-Dev-User-Id when Clerk has no session.
  return import.meta.env.DEV;
}

export function useBattery(pollMs = 60_000) {
  const { isSignedIn, apiAuthReady, clerkEnabled } = usePersonyAuth();
  const [battery, setBattery] = useState<BatterySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const shouldFetch = useMemo(
    () => canFetchBatterySnapshot(isSignedIn, apiAuthReady, clerkEnabled),
    [apiAuthReady, clerkEnabled, isSignedIn]
  );

  const refresh = useCallback(async () => {
    if (!shouldFetch) {
      setBattery(null);
      return;
    }
    setIsLoading(true);
    try {
      const snapshot = await fetchBatterySnapshot();
      if (snapshot !== null) {
        setBattery(snapshot);
      }
    } catch {
      // keep last known snapshot
    } finally {
      setIsLoading(false);
    }
  }, [shouldFetch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!shouldFetch || pollMs <= 0) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh, shouldFetch]);

  return { battery, isLoading, refresh, shouldFetch };
}
