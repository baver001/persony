import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BatterySnapshot } from '../lib/api/battery';
import { BatteryIndicator } from './BatteryIndicator';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  battery: BatterySnapshot | null;
};

export const BatterySheet: React.FC<Props> = ({ isOpen, onClose, battery }) => {
  const { t } = useTranslation('battery');

  if (!isOpen) return null;

  const pct = battery?.percentage ?? 100;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">{t('sheetTitle')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              aria-label={t('close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex justify-center">
              <div className="text-4xl font-semibold tabular-nums text-white">{pct}%</div>
            </div>
            <div className="flex justify-center py-2">
              <BatteryIndicator battery={battery} variant="vertical" />
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 space-y-2 text-xs text-zinc-300">
              <p className="leading-relaxed">{t('sheetHint')}</p>
              <p className="text-zinc-500">{t('fullRechargeEta', { hours: 8 })}</p>
            </div>

            {battery?.status === 'empty' && (
              <p className="text-xs text-amber-300/90">{t('emptyHint')}</p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
