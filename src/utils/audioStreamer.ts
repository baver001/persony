// Web Audio helper for bidirectional Gemini Live PCM16 streaming

export class AudioStreamer {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  
  // Analysers for UI waveform
  public inputAnalyser: AnalyserNode | null = null;
  public outputAnalyser: AnalyserNode | null = null;

  public onMicVolumeChange?: (volume: number) => void;
  public onSpeakerVolumeChange?: (volume: number) => void;

  constructor() {}

  public async startRecording(onAudioChunk: (base64Pcm: string) => void): Promise<void> {
    // 16kHz for Gemini input
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
    
    if (this.inputAudioCtx.state === 'suspended') {
      await this.inputAudioCtx.resume();
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
    
    // Setup mic analyser
    this.inputAnalyser = this.inputAudioCtx.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.source.connect(this.inputAnalyser);

    // Buffer size 2048 or 4096 gives ~128ms - 256ms chunk size
    this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioCtx.destination);

    const inputDataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);

    this.processor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);
      
      // Compute mic volume
      if (this.inputAnalyser && this.onMicVolumeChange) {
        this.inputAnalyser.getByteFrequencyData(inputDataArray);
        let sum = 0;
        for (let i = 0; i < inputDataArray.length; i++) {
          sum += inputDataArray[i];
        }
        const avg = sum / inputDataArray.length;
        this.onMicVolumeChange(Math.min(1, avg / 80));
      }

      // Convert Float32 to Int16 PCM
      const pcm16 = this.floatTo16BitPCM(channelData);
      const base64 = this.arrayBufferToBase64(pcm16);
      onAudioChunk(base64);
    };
  }

  public initPlayback(): void {
    if (!this.outputAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // Output: 24kHz for Gemini Live model output
      this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume();
    }
  }

  public playChunk(base64Pcm: string): void {
    if (!this.outputAudioCtx || !this.outputAnalyser) {
      this.initPlayback();
    }
    if (!this.outputAudioCtx || !this.outputAnalyser) return;

    try {
      const float32 = this.base64ToFloat32(base64Pcm);
      if (float32.length === 0) return;

      const buffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputAnalyser);

      const now = this.outputAudioCtx.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + buffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) this.activeSources.splice(idx, 1);
        if (this.activeSources.length === 0 && this.onSpeakerVolumeChange) {
          this.onSpeakerVolumeChange(0);
        }
      };

      if (this.onSpeakerVolumeChange) {
        // approximate volume peak
        let maxVal = 0;
        for (let i = 0; i < float32.length; i += 10) {
          const abs = Math.abs(float32[i]);
          if (abs > maxVal) maxVal = abs;
        }
        this.onSpeakerVolumeChange(Math.min(1, maxVal * 2));
      }
    } catch (err) {
      console.error('Failed to play audio chunk:', err);
    }
  }

  public stopAllPlayback(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore already stopped
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
    if (this.onSpeakerVolumeChange) {
      this.onSpeakerVolumeChange(0);
    }
  }

  public stop(): void {
    this.stopAllPlayback();

    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
    this.inputAnalyser = null;
    this.outputAnalyser = null;
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return window.btoa(binary);
  }

  private base64ToFloat32(base64: string): Float32Array {
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
        float32[i] = view.getInt16(i * 2, true) / 32768.0;
      }
      return float32;
    } catch (e) {
      console.warn('Failed to parse PCM16 base64:', e);
      return new Float32Array(0);
    }
  }
}
