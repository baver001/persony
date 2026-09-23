import React, { useState } from 'react';
import { useBattery } from '../hooks/useBattery';
import { BatteryIndicator } from './BatteryIndicator';
import { BatterySheet } from './BatterySheet';

type Props = {
  className?: string;
};

export const SidebarBatteryControl: React.FC<Props> = ({ className }) => {
  const { battery, refresh, isLoading, shouldFetch } = useBattery(30_000);
  const [showBatterySheet, setShowBatterySheet] = useState(false);

  if (!shouldFetch) return null;
  if (battery && !battery.enabled) return null;
  if (!battery) {
    if (!isLoading) return null;
    return (
      <div
        className={`w-[22px] h-[38px] rounded-[4px] border-2 border-zinc-600/60 bg-zinc-900/40 animate-pulse ${className ?? ''}`}
        aria-hidden
      />
    );
  }

  const openSheet = () => {
    void refresh();
    setShowBatterySheet(true);
  };

  return (
    <>
      <BatteryIndicator
        battery={battery}
        variant="vertical"
        onClick={openSheet}
        className={className}
      />
      <BatterySheet
        isOpen={showBatterySheet}
        onClose={() => setShowBatterySheet(false)}
        battery={battery}
      />
    </>
  );
};
