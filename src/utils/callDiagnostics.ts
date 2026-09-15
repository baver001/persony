/** Lightweight live-call diagnostics (console + optional UI hook). */

export type CallDiagSnapshot = {
  underruns: number;
  chunksPlayed: number;
  chunksSent: number;
  inputSampleRate: number;
  outputSampleRate: number;
  playbackQueueMs: number;
  inputCtxState: string;
  outputCtxState: string;
  isMobile: boolean;
};

type Listener = (snapshot: CallDiagSnapshot) => void;

class CallDiagnostics {
  underruns = 0;
  chunksPlayed = 0;
  chunksSent = 0;
  inputSampleRate = 0;
  outputSampleRate = 0;
  playbackQueueMs = 0;
  inputCtxState = 'n/a';
  outputCtxState = 'n/a';
  isMobile = false;

  private listeners = new Set<Listener>();
  private logInterval: number | null = null;

  reset() {
    this.underruns = 0;
    this.chunksPlayed = 0;
    this.chunksSent = 0;
    this.playbackQueueMs = 0;
  }

  snapshot(): CallDiagSnapshot {
    return {
      underruns: this.underruns,
      chunksPlayed: this.chunksPlayed,
      chunksSent: this.chunksSent,
      inputSampleRate: this.inputSampleRate,
      outputSampleRate: this.outputSampleRate,
      playbackQueueMs: this.playbackQueueMs,
      inputCtxState: this.inputCtxState,
      outputCtxState: this.outputCtxState,
      isMobile: this.isMobile,
    };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }

  startConsoleLogging(intervalMs = 8000) {
    this.stopConsoleLogging();
    this.logInterval = window.setInterval(() => {
      const s = this.snapshot();
      if (s.chunksPlayed > 0 || s.chunksSent > 0) {
        console.info('[Persony Call]', s);
      }
    }, intervalMs);
  }

  stopConsoleLogging() {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
  }
}

export const callDiagnostics = new CallDiagnostics();
