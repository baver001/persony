// Web Audio helper for bidirectional Gemini Live PCM16 streaming
// Optimized for mobile: resampling, jitter buffer, batched uplink, no mic→speaker loop

import {
  GEMINI_INPUT_SAMPLE_RATE,
  GEMINI_OUTPUT_SAMPLE_RATE,
  arrayBufferToBase64,
  base64ToFloat32Pcm16,
  concatFloat32,
  floatTo16BitPCM,
  isMobileDevice,
  resampleFloat32,
} from './pcmAudio';
import { callDiagnostics } from './callDiagnostics';

export class AudioStreamer {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private silentGain: GainNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  private readonly isMobile = isMobileDevice();
  private readonly jitterBufferSec = this.isMobile ? 0.14 : 0.08;
  private readonly uplinkFlushMs = this.isMobile ? 120 : 80;
  private readonly processorBufferSize = this.isMobile ? 2048 : 4096;

  private pendingUplink: Float32Array[] = [];
  private uplinkFlushTimer: number | null = null;
  private pendingPlayback: Float32Array[] = [];
  private playbackFlushTimer: number | null = null;

  private lastMicVolumeTick = 0;
  private lastSpeakerVolumeTick = 0;

  public inputAnalyser: AnalyserNode | null = null;
  public outputAnalyser: AnalyserNode | null = null;

  public onMicVolumeChange?: (volume: number) => void;
  public onSpeakerVolumeChange?: (volume: number) => void;

  public async resumeContexts(): Promise<void> {
    try {
      if (this.inputAudioCtx?.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      if (this.outputAudioCtx?.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }
      callDiagnostics.inputCtxState = this.inputAudioCtx?.state ?? 'n/a';
      callDiagnostics.outputCtxState = this.outputAudioCtx?.state ?? 'n/a';
    } catch {
      // ignore
    }
  }

  public async configureAudioSession(): Promise<void> {
    try {
      const nav = navigator as Navigator & {
        audioSession?: { type: string };
      };
      if (nav.audioSession) {
        nav.audioSession.type = 'play-and-record';
      }
    } catch {
      // iOS Safari — optional
    }
  }

  public async startRecording(onAudioChunk: (base64Pcm: string) => void): Promise<void> {
    await this.configureAudioSession();

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.inputAudioCtx = new AudioContextClass({
      latencyHint: 'interactive',
    });
    await this.resumeContexts();

    const inputRate = this.inputAudioCtx.sampleRate;
    callDiagnostics.inputSampleRate = inputRate;
    callDiagnostics.isMobile = this.isMobile;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(this.isMobile ? {} : { sampleRate: GEMINI_INPUT_SAMPLE_RATE }),
      },
    });

    this.source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

    this.inputAnalyser = this.inputAudioCtx.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.source.connect(this.inputAnalyser);

    this.silentGain = this.inputAudioCtx.createGain();
    this.silentGain.gain.value = 0;
    this.silentGain.connect(this.inputAudioCtx.destination);

    const inputDataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);

    const pushMicSamples = (channelData: Float32Array) => {
      const now = performance.now();
      if (this.inputAnalyser && this.onMicVolumeChange && now - this.lastMicVolumeTick > 100) {
        this.inputAnalyser.getByteFrequencyData(inputDataArray);
        let sum = 0;
        for (let i = 0; i < inputDataArray.length; i++) sum += inputDataArray[i];
        this.onMicVolumeChange(Math.min(1, sum / inputDataArray.length / 80));
        this.lastMicVolumeTick = now;
      }

      const resampled = resampleFloat32(channelData, inputRate, GEMINI_INPUT_SAMPLE_RATE);
      if (resampled.length > 0) {
        this.pendingUplink.push(resampled);
      }
    };

    try {
      await this.inputAudioCtx.audioWorklet.addModule('/audio-capture-processor.js');
      this.workletNode = new AudioWorkletNode(this.inputAudioCtx, 'persony-capture-processor');
      this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (event.data instanceof Float32Array) {
          pushMicSamples(event.data);
        }
      };
      this.source.connect(this.workletNode);
      this.workletNode.connect(this.silentGain);
    } catch (workletErr) {
      console.warn('[Persony Call] AudioWorklet unavailable, falling back to ScriptProcessor:', workletErr);
      this.processor = this.inputAudioCtx.createScriptProcessor(this.processorBufferSize, 1, 1);
      this.source.connect(this.processor);
      this.processor.connect(this.silentGain);
      this.processor.onaudioprocess = (e) => {
        pushMicSamples(e.inputBuffer.getChannelData(0));
      };
    }

    this.uplinkFlushTimer = window.setInterval(() => {
      if (this.pendingUplink.length === 0) return;
      const merged = concatFloat32(this.pendingUplink);
      this.pendingUplink = [];
      const pcm16 = floatTo16BitPCM(merged);
      onAudioChunk(arrayBufferToBase64(pcm16));
      callDiagnostics.chunksSent += 1;
    }, this.uplinkFlushMs);
  }

  public initPlayback(): void {
    if (!this.outputAudioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.outputAudioCtx = new AudioContextClass({ latencyHint: 'interactive' });
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);
      callDiagnostics.outputSampleRate = this.outputAudioCtx.sampleRate;
    }

    void this.resumeContexts();
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime + this.jitterBufferSec;
    }
  }

  public playChunk(base64Pcm: string): void {
    if (!this.outputAudioCtx || !this.outputAnalyser) {
      this.initPlayback();
    }
    if (!this.outputAudioCtx || !this.outputAnalyser) return;

    const float32 = base64ToFloat32Pcm16(base64Pcm);
    if (float32.length === 0) return;

    this.pendingPlayback.push(float32);

    if (!this.playbackFlushTimer) {
      const flushDelay = this.isMobile ? 50 : 30;
      this.playbackFlushTimer = window.setTimeout(() => {
        this.flushPlaybackQueue();
        this.playbackFlushTimer = null;
      }, flushDelay);
    }
  }

  private flushPlaybackQueue(): void {
    if (!this.outputAudioCtx || !this.outputAnalyser || this.pendingPlayback.length === 0) return;

    void this.resumeContexts();

    const merged = concatFloat32(this.pendingPlayback);
    this.pendingPlayback = [];

    const ctxRate = this.outputAudioCtx.sampleRate;
    const playable = resampleFloat32(merged, GEMINI_OUTPUT_SAMPLE_RATE, ctxRate);

    try {
      const buffer = this.outputAudioCtx.createBuffer(1, playable.length, ctxRate);
      buffer.getChannelData(0).set(playable);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputAnalyser);

      const now = this.outputAudioCtx.currentTime;

      if (this.nextPlayTime < now) {
        callDiagnostics.underruns += 1;
        this.nextPlayTime = now + this.jitterBufferSec;
      }

      const startTime = this.nextPlayTime;
      source.start(startTime);
      this.nextPlayTime = startTime + buffer.duration;

      callDiagnostics.chunksPlayed += 1;
      callDiagnostics.playbackQueueMs = Math.max(0, (this.nextPlayTime - now) * 1000);
      callDiagnostics.outputCtxState = this.outputAudioCtx.state;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) this.activeSources.splice(idx, 1);
        if (this.activeSources.length === 0 && this.onSpeakerVolumeChange) {
          this.onSpeakerVolumeChange(0);
        }
      };

      const tick = performance.now();
      if (this.onSpeakerVolumeChange && tick - this.lastSpeakerVolumeTick > 100) {
        let maxVal = 0;
        for (let i = 0; i < playable.length; i += 12) {
          maxVal = Math.max(maxVal, Math.abs(playable[i]));
        }
        this.onSpeakerVolumeChange(Math.min(1, maxVal * 2));
        this.lastSpeakerVolumeTick = tick;
      }
    } catch (err) {
      console.error('Failed to play audio chunk:', err);
    }
  }

  public stopAllPlayback(): void {
    if (this.playbackFlushTimer) {
      clearTimeout(this.playbackFlushTimer);
      this.playbackFlushTimer = null;
    }
    this.pendingPlayback = [];

    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];

    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime + this.jitterBufferSec;
    }
    if (this.onSpeakerVolumeChange) {
      this.onSpeakerVolumeChange(0);
    }
    callDiagnostics.playbackQueueMs = 0;
  }

  public stop(): void {
    if (this.uplinkFlushTimer) {
      clearInterval(this.uplinkFlushTimer);
      this.uplinkFlushTimer = null;
    }
    if (this.playbackFlushTimer) {
      clearTimeout(this.playbackFlushTimer);
      this.playbackFlushTimer = null;
    }
    this.pendingUplink = [];
    this.pendingPlayback = [];

    this.stopAllPlayback();

    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
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
}
