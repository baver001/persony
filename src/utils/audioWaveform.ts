export const WAVEFORM_MIN_LEVEL = 0.12;
export const WAVEFORM_BAR_COUNT = 40;

export const LIVE_BAR_WIDTH_PX = 3;
export const LIVE_BAR_GAP_PX = 3;
export const LIVE_QUIET_THRESHOLD = 0.2;

export function countLiveWaveformBars(containerWidth: number): number {
  const slot = LIVE_BAR_WIDTH_PX + LIVE_BAR_GAP_PX;
  return Math.max(32, Math.floor((containerWidth + LIVE_BAR_GAP_PX) / slot));
}

/** Keep the most recent samples aligned to the right edge of the track. */
export function tailWaveformLevels(levels: number[], barCount: number): number[] {
  if (barCount <= 0) return [];
  if (levels.length >= barCount) return levels.slice(-barCount);
  return [
    ...Array.from({ length: barCount - levels.length }, () => WAVEFORM_MIN_LEVEL),
    ...levels,
  ];
}

export function normalizeWaveformLevel(value: number): number {
  return Math.min(1, Math.max(WAVEFORM_MIN_LEVEL, value));
}

/** Bucket-max resampling keeps peaks visible and avoids moiré from single-sample picks. */
export function resampleWaveformLevels(levels: number[], targetCount: number): number[] {
  if (targetCount <= 0) return [];
  if (levels.length === 0) {
    return Array.from({ length: targetCount }, () => WAVEFORM_MIN_LEVEL);
  }
  if (levels.length === targetCount) return levels;

  const out: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor((i / targetCount) * levels.length);
    const end = Math.floor(((i + 1) / targetCount) * levels.length);
    let peak = WAVEFORM_MIN_LEVEL;
    for (let j = start; j < end; j++) {
      peak = Math.max(peak, levels[j]);
    }
    out.push(peak);
  }
  return out;
}

function enhanceWaveformContrast(levels: number[]): number[] {
  const max = Math.max(...levels, WAVEFORM_MIN_LEVEL);
  const floor = 0.22;
  return levels.map((level) => normalizeWaveformLevel(floor + (level / max) * (1 - floor)));
}

export async function decodeWaveformPeaks(
  src: string,
  barCount = WAVEFORM_BAR_COUNT
): Promise<number[]> {
  const response = await fetch(src);
  const buffer = await response.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(buffer.slice(0));
    const channel = audio.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / barCount));
    const peaks: number[] = [];

    for (let i = 0; i < barCount; i++) {
      const start = i * blockSize;
      const end = Math.min(channel.length, start + blockSize);
      let sum = 0;
      for (let j = start; j < end; j++) {
        const sample = channel[j];
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / Math.max(1, end - start));
      peaks.push(normalizeWaveformLevel(rms * 3.8));
    }

    return enhanceWaveformContrast(peaks);
  } finally {
    await ctx.close();
  }
}
