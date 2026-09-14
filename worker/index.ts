import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import type { WSContext } from 'hono/ws';
import type { Env, LiveSessionHandle } from './lib/gemini';
import { formatCleanErrorMessage } from './lib/errors';
import { handleChat, handleGenerateCharacter, handleTranscribe, initLiveSession } from './lib/gemini';

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', cors());

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'persony',
    hasApiKey: !!c.env.GEMINI_API_KEY,
    timestamp: Date.now(),
  });
});

app.post('/api/chat', async (c) => {
  const body = await c.req.json<{
    character?: { systemPrompt?: string };
    messages?: Array<{ sender: string; text: string }>;
  }>();
  if (!body.messages || !Array.isArray(body.messages)) {
    return c.json({ error: 'Invalid messages payload' }, 400);
  }

  const stream = await handleChat(c.env.GEMINI_API_KEY, body.character, body.messages);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

app.post('/api/transcribe', async (c) => {
  try {
    const { audioBase64, mimeType } = await c.req.json<{ audioBase64?: string; mimeType?: string }>();
    if (!audioBase64) {
      return c.json({ error: 'audioBase64 is required' }, 400);
    }
    const result = await handleTranscribe(c.env.GEMINI_API_KEY, audioBase64, mimeType);
    return c.json(result);
  } catch (err) {
    return c.json({ error: formatCleanErrorMessage(err) }, 500);
  }
});

app.post('/api/generate-character', async (c) => {
  try {
    const { prompt } = await c.req.json<{ prompt?: string }>();
    if (!prompt) {
      return c.json({ error: 'Prompt is required' }, 400);
    }
    const result = await handleGenerateCharacter(c.env.GEMINI_API_KEY, prompt);
    return c.json(result);
  } catch (err) {
    return c.json({ error: formatCleanErrorMessage(err) }, 500);
  }
});

function toLiveSocket(ws: WSContext<WebSocket>) {
  return {
    send: (data: string) => ws.send(data),
    readyState: ws.readyState,
  };
}

app.get(
  '/api/live',
  upgradeWebSocket((c) => {
    let session: LiveSessionHandle | null = null;
    let isConnected = false;

    return {
      async onMessage(event, ws) {
        try {
          const msg = JSON.parse(String(event.data));

          if (msg.type === 'init') {
            try {
              session = await initLiveSession(c.env.GEMINI_API_KEY, toLiveSocket(ws), {
                characterName: msg.characterName,
                systemPrompt: msg.systemPrompt,
                voiceName: msg.voiceName,
                recentChatContext: msg.recentChatContext,
              });
              isConnected = true;
              ws.send(JSON.stringify({ type: 'connected' }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: formatCleanErrorMessage(err) }));
            }
          } else if (msg.type === 'audio' && session && isConnected) {
            session.sendAudio(msg.data);
          } else if (msg.type === 'text' && session && isConnected) {
            session.sendText(msg.text);
          }
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', message: formatCleanErrorMessage(err) }));
        }
      },
      onClose() {
        session?.close();
        session = null;
        isConnected = false;
      },
    };
  })
);

export default app;
