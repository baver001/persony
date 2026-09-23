import { useEffect, useRef, useState } from 'react';
import {
  LIVE_QUIET_THRESHOLD,
  WAVEFORM_BAR_COUNT,
  WAVEFORM_MIN_LEVEL,
  countLiveWaveformBars,
  resampleWaveformLevels,
  tailWaveformLevels,
} from '../utils/audioWaveform';

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

function playbackBarHeight(level: number): number {
  return 5 + level * 18;
}

function liveBarHeight(level: number): number {
  const shaped = Math.pow(Math.min(1, level), 0.82);
  return 4 + shaped * 14;
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

    const update = () => setBarCount(countLiveWaveformBars(el.clientWidth));

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [barCountProp, variant]);

  const bars =
    variant === 'live'
      ? tailWaveformLevels(levels, barCount)
      : resampleWaveformLevels(levels, barCount);

  const variantClass = variant === 'live' ? 'py-waveform-bars--live' : 'py-waveform-bars--playback';

  return (
    <div
      ref={containerRef}
      className={`py-waveform-bars ${variantClass} ${fadeFromLeft ? 'py-waveform-bars--fade-left' : ''} ${className ?? ''}`}
      aria-hidden
    >
      {bars.map((level, index) => {
        const isQuiet = variant === 'live' && level <= LIVE_QUIET_THRESHOLD;

        if (isQuiet) {
          return <span key={index} className="py-waveform-dot" />;
        }

        const height = variant === 'live' ? liveBarHeight(level) : playbackBarHeight(level);
        const opacity = variant === 'live' ? 0.9 : 0.65 + level * 0.35;

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
  return liveBarHeight(Math.max(WAVEFORM_MIN_LEVEL, level));
}
