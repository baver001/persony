// Utility for robust client-side audio processing and WAV encoding
// Ensures 100% compatibility with Gemini audio understanding & transcription

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
  for (let i = 0; i < len; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

/**
 * Converts any audio Blob (WebM, MP4, OGG, etc.) recorded by the browser
 * into a clean 16kHz mono 16-bit PCM WAV.
 */
export async function audioBlobToWav(
  blob: Blob
): Promise<{ wavBlob: Blob; wavBase64: string; duration: number }> {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass({ sampleRate: 16000 });

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const channelData = new Float32Array(length);

    // Downmix to mono if stereo
    if (numChannels === 1) {
      channelData.set(audioBuffer.getChannelData(0));
    } else {
      const ch0 = audioBuffer.getChannelData(0);
      const ch1 = audioBuffer.getChannelData(1);
      for (let i = 0; i < length; i++) {
        channelData[i] = (ch0[i] + ch1[i]) / 2;
      }
    }

    // 16-bit PCM WAV (44-byte header)
    const wavBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(wavBuffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate (16000)
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, length * 2, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const wavBlob = new Blob([view], { type: 'audio/wav' });
    const wavBase64 = arrayBufferToBase64(wavBuffer);
    const duration = Math.max(1, Math.round(audioBuffer.duration));

    return { wavBlob, wavBase64, duration };
  } finally {
    try {
      await audioCtx.close();
    } catch {
      // ignore
    }
  }
}
