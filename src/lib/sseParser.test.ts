import { describe, expect, it } from 'vitest';
import { SseStreamParser } from './sseParser';

describe('SseStreamParser', () => {
  it('parses a complete single event', () => {
    const parser = new SseStreamParser();
    const events = parser.push('data: {"text":"hi"}\n\n');
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].data)).toEqual({ text: 'hi' });
  });

  it('reassembles one event split across multiple network chunks', () => {
    const parser = new SseStreamParser();
    const first = parser.push('data: {"te');
    const second = parser.push('xt":"chunked"}\n\n');

    expect(first).toEqual([]);
    expect(second).toHaveLength(1);
    expect(JSON.parse(second[0].data)).toEqual({ text: 'chunked' });
    expect(parser.pending).toBe('');
  });

  it('parses multiple events in one chunk', () => {
    const parser = new SseStreamParser();
    const events = parser.push(
      'data: {"text":"a"}\n\ndata: {"text":"b"}\n\n'
    );
    expect(events).toHaveLength(2);
    expect(JSON.parse(events[0].data).text).toBe('a');
    expect(JSON.parse(events[1].data).text).toBe('b');
  });

  it('handles CRLF delimiters', () => {
    const parser = new SseStreamParser();
    const events = parser.push('data: {"done":true}\r\n\r\n');
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].data)).toEqual({ done: true });
  });
});
