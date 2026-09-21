import { useEffect, useRef, useState } from 'react';
import { WAVEFORM_MIN_LEVEL, resampleWaveformLevels } from '../utils/audioWaveform';

const QUIET_THRESHOLD = 0.14;

type Props = {
  levels: number[];
  barCount?: number;
  isPlaying?: boolean;
  barClassName?: string;
  fadeFromLeft?: boolean;
  quietAsDots?: boolean;
  className?: string;
};

export function VoiceWaveformBars({
  levels,
  barCount: barCountProp,
  isPlaying = false,
  barClassName,
  fadeFromLeft = false,
  quietAsDots = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [barCount, setBarCount] = useState(barCountProp ?? 56);

  useEffect(() => {
    if (barCountProp) {
      setBarCount(barCountProp);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      setBarCount(Math.max(36, Math.min(96, Math.floor(width / 2.4))));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [barCountProp]);

  const bars = resampleWaveformLevels(levels, barCount);

  return (
    <div
      ref={containerRef}
      className={`py-waveform-bars ${fadeFromLeft ? 'py-waveform-bars--fade-left' : ''} ${className ?? ''}`}
      aria-hidden
    >
      {bars.map((level, index) => {
        const progress = barCount > 1 ? index / (barCount - 1) : 1;
        const height = 3 + level * 16;
        const opacity = fadeFromLeft ? 0.15 + progress * 0.85 : 0.5 + level * 0.5;
        const isDot = quietAsDots && level <= QUIET_THRESHOLD;

        if (isDot) {
          return (
            <span
              key={index}
              className={`py-waveform-dot ${barClassName ?? ''}`}
              style={{ opacity }}
            />
          );
        }

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
  return 3 + Math.max(WAVEFORM_MIN_LEVEL, level) * 16;
}
