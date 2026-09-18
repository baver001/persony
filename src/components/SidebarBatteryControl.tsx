import React, { useState } from 'react';
import { usePersonyAuth } from './PersonyAuthProvider';
import { useBattery } from '../hooks/useBattery';
import { BatteryIndicator } from './BatteryIndicator';
import { BatterySheet } from './BatterySheet';

type Props = {
  className?: string;
};

export const SidebarBatteryControl: React.FC<Props> = ({ className }) => {
  const { isSignedIn } = usePersonyAuth();
  const { battery, refresh } = useBattery(30_000);
  const [showBatterySheet, setShowBatterySheet] = useState(false);

  if (!isSignedIn || !battery?.enabled) return null;

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
