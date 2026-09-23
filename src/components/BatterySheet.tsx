import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { BatterySnapshot } from '../lib/api/battery';
import {
  BATTERY_TOPUP_CLICK_EVENT,
  trackProductAnalyticsEvent,
} from '../lib/api/analytics';
import { BatteryIndicator } from './BatteryIndicator';

const CLOSE_DRAG_OFFSET = 56;
const CLOSE_VELOCITY = 380;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  battery: BatterySnapshot | null;
};

export const BatterySheet: React.FC<Props> = ({ isOpen, onClose, battery }) => {
  const { t } = useTranslation('battery');
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) setNotice(null);
  }, [isOpen]);

  const pct = battery?.percentage ?? 100;

  const handleTopUp = () => {
    void trackProductAnalyticsEvent(BATTERY_TOPUP_CLICK_EVENT, {
      source: 'battery_sheet',
      batteryPercent: pct,
      batteryStatus: battery?.status ?? 'unknown',
    }).catch(() => {});

    setNotice(t('topUpComingSoon'));
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2800);
  };

  const startSheetDrag = (event: React.PointerEvent<HTMLElement>) => {
    dragControls.start(event);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -CLOSE_DRAG_OFFSET || info.velocity.y < -CLOSE_VELOCITY) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          <motion.button
            type="button"
            aria-label={t('close')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] cursor-default"
            onClick={onClose}
          />

          <div className="absolute inset-x-0 top-0 flex flex-col items-center pointer-events-none">
            <motion.div
              role="dialog"
              aria-labelledby="battery-sheet-title"
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: -280, bottom: 0 }}
              dragElastic={{ top: 0.12, bottom: 0 }}
              onDragEnd={handleDragEnd}
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="pointer-events-auto relative w-full max-w-md bg-zinc-900 rounded-b-2xl shadow-2xl overflow-hidden pt-[env(safe-area-inset-top,0px)]"
            >
              <div
                className="px-5 pt-6 pb-1 flex flex-col items-center text-center gap-3.5 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={startSheetDrag}
              >
                <h2 id="battery-sheet-title" className="text-sm font-semibold text-white select-none">
                  {t('sheetTitle')}
                </h2>

                <div className="text-4xl font-semibold tabular-nums text-white select-none">{pct}%</div>

                <div className="pointer-events-none">
                  <BatteryIndicator battery={battery} variant="vertical" />
                </div>

                <button
                  type="button"
                  onClick={handleTopUp}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="py-battery-topup-btn touch-auto cursor-pointer"
                >
                  <span className="py-battery-topup-btn__label">{t('topUp')}</span>
                </button>
              </div>

              <div className="px-5 pb-2 pt-0">
                <button
                  type="button"
                  onClick={onClose}
                  onPointerDown={startSheetDrag}
                  className="mx-auto flex w-full items-center justify-center pb-1 pt-0.5 cursor-grab active:cursor-grabbing touch-none"
                  aria-label={t('close')}
                >
                  <span className="h-[3px] w-9 rounded-full bg-white/22" aria-hidden />
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {notice && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="pointer-events-none mt-3 w-[min(100%-2rem,28rem)] rounded-xl border border-white/10 bg-zinc-950/95 px-4 py-3 text-center text-xs leading-relaxed text-zinc-200 shadow-lg backdrop-blur-sm"
                  role="status"
                >
                  {notice}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
