import { useCallback, useEffect, useState } from 'react';
import { BatterySnapshot, fetchBatterySnapshot } from '../lib/api/battery';
import { usePersonyAuth } from '../components/PersonyAuthProvider';

export function useBattery(pollMs = 60_000) {
  const { isSignedIn } = usePersonyAuth();
  const [battery, setBattery] = useState<BatterySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setBattery(null);
      return;
    }
    setIsLoading(true);
    try {
      const snapshot = await fetchBatterySnapshot();
      setBattery(snapshot);
    } catch {
      // keep last known snapshot
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSignedIn || pollMs <= 0) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [isSignedIn, pollMs, refresh]);

  return { battery, isLoading, refresh };
}
