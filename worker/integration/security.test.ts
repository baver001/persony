import { describe, expect, it } from 'vitest';
import app from '../index';

const baseEnv = {
  GEMINI_API_KEY: 'test-key',
  ENVIRONMENT: 'production',
} as const;

describe('security integration', () => {
  it('does not allow evil CORS origin', async () => {
    const res = await app.request(
      'https://persony.example/api/personas',
      {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example' },
      },
      baseEnv
    );

    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('rejects anonymous transcribe', async () => {
    const res = await app.request(
      '/api/transcribe',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: 'YWJj' }),
      },
      baseEnv
    );

    expect(res.status).toBe(401);
  });

  it('rejects anonymous character generation', async () => {
    const res = await app.request(
      '/api/generate-character',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'wizard' }),
      },
      baseEnv
    );

    expect(res.status).toBe(401);
  });

  it('rejects anonymous conversation message', async () => {
    const res = await app.request(
      '/api/conversations/conv-1/messages',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'hello' }),
      },
      baseEnv
    );

    expect(res.status).toBe(401);
  });

  it('ignores dev auth header in production', async () => {
    const res = await app.request(
      '/api/conversations/conv-1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Persony-Dev-User-Id': 'dev_attacker',
        },
        body: JSON.stringify({ text: 'hello' }),
      },
      baseEnv
    );

    expect(res.status).toBe(401);
  });
});
