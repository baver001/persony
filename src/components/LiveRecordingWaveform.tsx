import { useEffect, useRef, useState } from 'react';
import { VoiceWaveformBars } from './VoiceWaveformBars';
import { WAVEFORM_MIN_LEVEL, normalizeWaveformLevel } from '../utils/audioWaveform';

const BUFFER_SIZE = 128;
const SAMPLE_MS = 72;

type Props = {
  stream: MediaStream | null;
  active: boolean;
  onLevelsChange?: (levels: number[]) => void;
};

function readMicLevel(analyser: AnalyserNode, buffer: Uint8Array): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const sample = (buffer[i] - 128) / 128;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / buffer.length);
  return normalizeWaveformLevel(rms * 4.2);
}

export function LiveRecordingWaveform({ stream, active, onLevelsChange }: Props) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: BUFFER_SIZE }, () => WAVEFORM_MIN_LEVEL)
  );
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const lastSampleRef = useRef(0);
  const bufferRef = useRef<Uint8Array | null>(null);
  const onLevelsChangeRef = useRef(onLevelsChange);
  onLevelsChangeRef.current = onLevelsChange;

  useEffect(() => {
    onLevelsChangeRef.current?.(levels);
  }, [levels]);

  useEffect(() => {
    if (!active) {
      setLevels(Array.from({ length: BUFFER_SIZE }, () => WAVEFORM_MIN_LEVEL));
    }
  }, [active]);

  useEffect(() => {
    if (!stream || !active) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.62;
    source.connect(analyser);
    analyserRef.current = analyser;
    bufferRef.current = new Uint8Array(analyser.fftSize);

    const tick = (now: number) => {
      const node = analyserRef.current;
      const buffer = bufferRef.current;
      if (node && buffer && now - lastSampleRef.current >= SAMPLE_MS) {
        lastSampleRef.current = now;
        const level = readMicLevel(node, buffer);
        setLevels((prev) => [...prev.slice(1), level]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      void ctx.close();
      analyserRef.current = null;
      bufferRef.current = null;
    };
  }, [stream, active]);

  return (
    <VoiceWaveformBars
      levels={levels}
      variant="live"
      className="flex-1 min-w-0 w-full h-[1.5rem]"
    />
  );
}
