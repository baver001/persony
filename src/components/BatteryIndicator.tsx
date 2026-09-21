import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BatterySnapshot } from '../lib/api/battery';

type Props = {
  battery: BatterySnapshot | null;
  variant?: 'vertical' | 'horizontal';
  onClick?: () => void;
  className?: string;
};

function fillColor(status: BatterySnapshot['status'], isDark: boolean): string {
  switch (status) {
    case 'critical':
    case 'empty':
      return 'bg-rose-500';
    case 'low':
      return 'bg-amber-400';
    case 'recharging':
      return 'bg-py-accent';
    default:
      return 'bg-py-accent';
  }
}

function shellBorder(status: BatterySnapshot['status'], isDark: boolean): string {
  if (status === 'empty' || status === 'critical') {
    return isDark ? 'border-rose-400/70' : 'border-rose-400';
  }
  return isDark ? 'border-zinc-500' : 'border-zinc-400';
}

export const BatteryIndicator: React.FC<Props> = ({
  battery,
  variant = 'horizontal',
  onClick,
  className = '',
}) => {
  const { t } = useTranslation('battery');
  const pct = battery?.enabled ? battery.percentage : 100;
  const status = battery?.status ?? 'full';
  const isDark = document.documentElement.classList.contains('dark');
  const label = t('ariaLabel', { percent: pct });

  if (variant === 'vertical') {
    return (
      <div className={`relative group ${className}`}>
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col items-center p-1 rounded-lg hover:bg-py-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-py-accent/60"
          aria-label={label}
        >
          <div
            className={`w-[7px] h-[3px] rounded-t-[2px] border-x border-t ${shellBorder(status, isDark)} ${
              isDark ? 'bg-zinc-700' : 'bg-zinc-300'
            }`}
            aria-hidden
          />
          <div
            className={`relative w-[22px] h-[34px] rounded-[4px] border-2 ${shellBorder(status, isDark)} overflow-hidden ${
              isDark ? 'bg-zinc-900/80' : 'bg-zinc-100'
            }`}
            aria-hidden
          >
            <div className="absolute inset-[3px] flex flex-col justify-end overflow-hidden rounded-[1px]">
              <div
                className={`w-full rounded-[1px] transition-[height] duration-700 ease-out ${fillColor(
                  status,
                  isDark
                )} ${status === 'recharging' ? 'animate-pulse' : ''}`}
                style={{ height: `${pct}%` }}
              />
            </div>
          </div>
        </button>

        <div
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 px-2 py-1 rounded-md text-[11px] font-semibold tabular-nums whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 transition-all duration-150 ${
            isDark
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-lg'
              : 'bg-white text-zinc-900 border border-zinc-200 shadow-md'
          }`}
        >
          {pct}%
          {battery?.isRecharging && (
            <span className="block text-[9px] font-normal text-py-text-muted">{t('recharging')}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-py-input transition-colors group ${className}`}
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
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${fillColor(status, isDark)} ${
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
