import React, { useEffect, useState } from 'react';
import { Battery, BatteryLow, BatteryWarning } from 'lucide-react';
import { fetchWallet } from '../lib/api/billing';

export const BatteryIndicator: React.FC<{ onRecharge?: () => void }> = ({ onRecharge }) => {
  const [percent, setPercent] = useState<number | null>(null);
  const [reserve, setReserve] = useState(0);

  useEffect(() => {
    void fetchWallet().then((w) => {
      if (w) {
        setPercent(w.batteryPercent);
        setReserve(w.reserveBatteries);
      }
    });
  }, []);

  if (percent === null) return null;

  const Icon = percent <= 5 ? BatteryWarning : percent <= 15 ? BatteryLow : Battery;
  const color =
    percent <= 5 ? 'text-red-400' : percent <= 15 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <button
      type="button"
      onClick={onRecharge}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium hover:bg-py-hover ${color}`}
      title={reserve > 0 ? `Reserve: ${reserve} full batteries` : 'Energy balance'}
    >
      <Icon size={14} />
      <span>{percent}%</span>
      {reserve > 0 && <span className="text-py-text-muted">+{reserve}R</span>}
    </button>
  );
};
