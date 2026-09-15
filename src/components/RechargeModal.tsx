import React, { useEffect, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { fetchRechargePackages, type RechargePackage } from '../lib/api/billing';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose }) => {
  const [packages, setPackages] = useState<RechargePackage[]>([]);

  useEffect(() => {
    if (isOpen) void fetchRechargePackages().then(setPackages);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-py-border bg-py-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap size={18} className="text-py-accent" />
            Recharge
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-py-hover">
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 text-sm text-py-text-muted">
          Пополните Energy для продолжения AI-чата и звонков.
        </p>
        <div className="mt-4 space-y-2">
          {packages.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className="w-full rounded-xl border border-py-border px-4 py-3 text-left hover:bg-py-hover transition-colors"
              onClick={() => {
                alert(`Paddle checkout for $${pack.amountUsd} — configure PADDLE_API_KEY in production.`);
              }}
            >
              <div className="font-semibold">${pack.amountUsd}</div>
              <div className="text-xs text-py-text-muted">
                ≈ {Math.round(pack.energyUnits / 1_000_000)}× battery capacity
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
