import { describe, expect, it } from 'vitest';
import {
  countLiveWaveformBars,
  resampleWaveformLevels,
  tailWaveformLevels,
  WAVEFORM_MIN_LEVEL,
} from './audioWaveform';

describe('audioWaveform', () => {
  it('counts live bars from container width', () => {
    expect(countLiveWaveformBars(0)).toBeGreaterThanOrEqual(32);
    expect(countLiveWaveformBars(320)).toBeGreaterThan(32);
  });

  it('tails levels with quiet padding on the left', () => {
    const bars = tailWaveformLevels([0.4, 0.8], 5);
    expect(bars).toHaveLength(5);
    expect(bars[0]).toBe(WAVEFORM_MIN_LEVEL);
    expect(bars[4]).toBe(0.8);
  });

  it('resamples peaks without losing max amplitude', () => {
    const source = [0.1, 0.9, 0.2, 0.3];
    const out = resampleWaveformLevels(source, 2);
    expect(out).toHaveLength(2);
    expect(Math.max(...out)).toBeGreaterThanOrEqual(0.9);
  });
});
