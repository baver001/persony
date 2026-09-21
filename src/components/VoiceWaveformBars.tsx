import { useEffect, useRef, useState } from 'react';
import { WAVEFORM_BAR_COUNT, WAVEFORM_MIN_LEVEL, resampleWaveformLevels } from '../utils/audioWaveform';

const LIVE_SLOT_PX = 4; // 2px bar + ~2px distributed gap via space-between
const LIVE_MIN_BARS = 40;
const LIVE_MAX_BARS = 128;
const LIVE_QUIET_THRESHOLD = 0.18;

type Variant = 'live' | 'playback';

type Props = {
  levels: number[];
  variant?: Variant;
  barCount?: number;
  isPlaying?: boolean;
  barClassName?: string;
  fadeFromLeft?: boolean;
  className?: string;
};

function barHeight(level: number, variant: Variant): number {
  if (variant === 'live' && level <= LIVE_QUIET_THRESHOLD) return 3;
  const min = variant === 'live' ? 4 : 5;
  const scale = variant === 'live' ? 14 : 18;
  return min + level * scale;
}

export function VoiceWaveformBars({
  levels,
  variant = 'playback',
  barCount: barCountProp,
  isPlaying = false,
  barClassName,
  fadeFromLeft = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [barCount, setBarCount] = useState(barCountProp ?? WAVEFORM_BAR_COUNT);

  useEffect(() => {
    if (barCountProp) {
      setBarCount(barCountProp);
      return;
    }
    if (variant !== 'live') {
      setBarCount(WAVEFORM_BAR_COUNT);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      setBarCount(
        Math.max(LIVE_MIN_BARS, Math.min(LIVE_MAX_BARS, Math.floor(width / LIVE_SLOT_PX)))
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [barCountProp, variant]);

  const bars = resampleWaveformLevels(levels, barCount);
  const variantClass = variant === 'live' ? 'py-waveform-bars--live' : 'py-waveform-bars--playback';

  return (
    <div
      ref={containerRef}
      className={`py-waveform-bars ${variantClass} ${fadeFromLeft ? 'py-waveform-bars--fade-left' : ''} ${className ?? ''}`}
      aria-hidden
    >
      {bars.map((level, index) => {
        const height = barHeight(level, variant);
        const opacity =
          variant === 'live'
            ? level <= LIVE_QUIET_THRESHOLD
              ? 0.42
              : 0.68 + level * 0.32
            : 0.65 + level * 0.35;

        return (
          <span
            key={index}
            className={`py-waveform-bar ${isPlaying ? 'py-waveform-bar--playing' : ''} ${barClassName ?? ''}`}
            style={{
              height: `${height}px`,
              opacity,
              animationDelay: isPlaying ? `${(index % 7) * 0.06}s` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export function micLevelToBarHeight(level: number): number {
  return barHeight(Math.max(WAVEFORM_MIN_LEVEL, level), 'live');
}
