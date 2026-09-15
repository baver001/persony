import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import type { WSContext } from 'hono/ws';
import type { LiveSessionHandle } from './lib/gemini';
import { formatCleanErrorMessage } from './lib/errors';
import { initLiveSession } from './lib/gemini';
import { liveInitSchema } from './lib/validation';
import { apiCors } from './middleware/cors';
import { requireAIEntitlement } from './middleware/ai-entitlement';
import { AuthRequiredError } from './middleware/auth';
import { apiRoutes } from './routes/api';
import { PersonaNotFoundError, resolvePersonaForInference } from './services/persona-service';
import type { PersonyEnv } from './types/env';

const app = new Hono<{ Bindings: PersonyEnv }>();

app.use('/api/*', apiCors);
app.route('/api', apiRoutes);

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
            const parsed = liveInitSchema.safeParse(msg);
            if (!parsed.success) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid live init payload' }));
              return;
            }

            try {
              let userId: string;
              try {
                userId = await requireAIEntitlement(c);
              } catch (authErr) {
                if (authErr instanceof AuthRequiredError) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
                  return;
                }
                throw authErr;
              }

              const persona = await resolvePersonaForInference(
                c.env,
                parsed.data.personaId,
                userId
              );

              session = await initLiveSession(c.env.GEMINI_API_KEY, toLiveSocket(ws), {
                characterName: parsed.data.characterName || persona.name,
                systemPrompt: persona.systemPrompt,
                voiceName: parsed.data.voiceName || persona.voice,
                recentChatContext: parsed.data.recentChatContext,
              });
              isConnected = true;
              ws.send(JSON.stringify({ type: 'connected' }));
            } catch (err) {
              const message =
                err instanceof PersonaNotFoundError
                  ? err.message
                  : formatCleanErrorMessage(err);
              ws.send(JSON.stringify({ type: 'error', message }));
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
