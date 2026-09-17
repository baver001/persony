import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BatterySnapshot } from '../lib/api/battery';

type Props = {
  battery: BatterySnapshot | null;
  compact?: boolean;
  onClick?: () => void;
};

function barColor(status: BatterySnapshot['status'], isDark: boolean): string {
  switch (status) {
    case 'critical':
    case 'empty':
      return 'bg-amber-500';
    case 'low':
      return 'bg-yellow-500';
    case 'recharging':
      return isDark ? 'bg-emerald-400' : 'bg-emerald-500';
    default:
      return isDark ? 'bg-py-accent' : 'bg-emerald-600';
  }
}

export const BatteryIndicator: React.FC<Props> = ({ battery, compact = false, onClick }) => {
  const { t } = useTranslation('battery');
  const pct = battery?.enabled ? battery.percentage : 100;
  const status = battery?.status ?? 'full';
  const isDark = document.documentElement.classList.contains('dark');

  const label = t('ariaLabel', { percent: pct });

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-py-text-muted hover:text-py-text hover:bg-py-input transition-colors"
        aria-label={label}
      >
        <span aria-hidden>🔋</span>
        <span className="tabular-nums">{pct}%</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-py-input transition-colors group"
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-medium text-py-text-muted group-hover:text-py-text">
          {t('title')}
        </span>
        <span className="text-[11px] tabular-nums text-py-text-muted">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-py-input overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(status, isDark)} ${
            status === 'recharging' ? 'animate-pulse' : ''
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {battery?.isRecharging && (
        <p className="text-[10px] text-py-text-muted mt-1">{t('recharging')}</p>
      )}
    </button>
  );
};
