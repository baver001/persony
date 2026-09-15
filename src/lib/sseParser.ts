export type SseEvent = {
  event?: string;
  data: string;
};

/**
 * Incremental SSE parser with a persistent buffer.
 * Handles network chunks that split mid-event.
 */
export class SseStreamParser {
  private buffer = '';

  push(chunk: string): SseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, '\n');
    const events: SseEvent[] = [];

    while (true) {
      const boundary = this.buffer.indexOf('\n\n');
      if (boundary === -1) break;

      const rawBlock = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);

      const parsed = parseSseBlock(rawBlock);
      if (parsed) events.push(parsed);
    }

    return events;
  }

  reset(): void {
    this.buffer = '';
  }

  /** Remaining partial data (for diagnostics/tests). */
  get pending(): string {
    return this.buffer;
  }
}

function parseSseBlock(block: string): SseEvent | null {
  if (!block.trim()) return null;

  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}
