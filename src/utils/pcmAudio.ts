/** Gemini Live PCM rates */
export const GEMINI_INPUT_SAMPLE_RATE = 16000;
export const GEMINI_OUTPUT_SAMPLE_RATE = 24000;

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.maxTouchPoints > 1 && window.innerWidth < 1024;
}

/** Linear resampling between sample rates. */
export function resampleFloat32(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (!input.length || fromRate === toRate) return input;

  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const idx = Math.floor(srcIndex);
    const frac = srcIndex - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
    output[i] = s0 + (s1 - s0) * frac;
  }

  return output;
}

export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return window.btoa(binary);
}

export function base64ToFloat32Pcm16(base64: string): Float32Array {
  try {
    const binary = window.atob(base64);
    const sampleCount = Math.floor(binary.length / 2);
    if (sampleCount === 0) return new Float32Array(0);

    const buffer = new ArrayBuffer(sampleCount * 2);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < sampleCount * 2; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const view = new DataView(buffer);
    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      float32[i] = view.getInt16(i * 2, true) / 32768;
    }
    return float32;
  } catch {
    return new Float32Array(0);
  }
}

export function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
