import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import type { WSContext } from 'hono/ws';
import type { LiveSessionHandle } from './lib/gemini';
import { formatCleanErrorMessage } from './lib/errors';
import { initLiveSession } from './lib/gemini';
import {
  liveAudioSchema,
  liveInitSchema,
  liveTextSchema,
  MAX_WS_JSON_BYTES,
} from './lib/validation';
import { apiCors } from './middleware/cors';
import { AuthRequiredError, resolveAuthContext } from './middleware/auth';
import { apiRoutes } from './routes/api';
import { generateId } from './lib/ids';
import { ConversationAccessError } from './services/chat-service';
import {
  assertBatteryAllowsAI,
  BatteryEmptyError,
  releaseEnergyForInference,
  reserveEnergyForInference,
  settleEnergyForInference,
} from './services/energy-service';
import { resolveLiveConversationContext } from './services/live-context-service';
import { PersonaNotFoundError } from './services/persona-service';
import type { PersonyEnv } from './types/env';

const LIVE_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

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
    let initDone = false;
    let initInProgress = false;
    let sessionTimeout: ReturnType<typeof setTimeout> | null = null;
    let malformedCount = 0;
    let liveChargeKey: string | null = null;
    let liveUserId: string | null = null;

    const cleanup = () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
      }
      session?.close();
      session = null;
      isConnected = false;
      initDone = false;
      initInProgress = false;
    };

    const armSessionTimeout = (ws: WSContext<WebSocket>) => {
      if (sessionTimeout) clearTimeout(sessionTimeout);
      sessionTimeout = setTimeout(() => {
        ws.send(JSON.stringify({ type: 'error', message: 'Session timed out' }));
        cleanup();
        ws.close();
      }, LIVE_SESSION_TIMEOUT_MS);
    };

    return {
      async onMessage(event, ws) {
        try {
          const raw = String(event.data);
          if (raw.length > MAX_WS_JSON_BYTES) {
            ws.send(JSON.stringify({ type: 'error', message: 'Message too large' }));
            return;
          }

          const msg = JSON.parse(raw);

          if (msg.type === 'init') {
            if (initDone || initInProgress) {
              ws.send(JSON.stringify({ type: 'error', message: 'Session already initialized' }));
              return;
            }

            initInProgress = true;

            const parsed = liveInitSchema.safeParse(msg);
            if (!parsed.success) {
              initInProgress = false;
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid live init payload' }));
              return;
            }

            try {
              const auth = await resolveAuthContext(c.env, {
                bearerToken: parsed.data.authToken,
                devUserId: parsed.data.devUserId,
              });

              if (!auth.isAuthenticated || !auth.userId) {
                throw new AuthRequiredError();
              }

              if (c.env.DB) {
                await assertBatteryAllowsAI(c.env.DB, auth.userId);
                const chargeKey =
                  parsed.data.callSessionId ||
                  `live:${parsed.data.conversationId || parsed.data.personaId}:${generateId()}`;
                await reserveEnergyForInference(
                  c.env.DB,
                  auth.userId,
                  chargeKey,
                  'voice_call'
                );
                liveChargeKey = chargeKey;
                liveUserId = auth.userId;
              }

              const liveContext = await resolveLiveConversationContext(
                c.env,
                auth.userId,
                parsed.data.personaId,
                parsed.data.conversationId
              );

              session = await initLiveSession(c.env.GEMINI_API_KEY, toLiveSocket(ws), {
                characterName: parsed.data.characterName || liveContext.persona.name,
                systemPrompt: liveContext.compiledSystemPrompt,
                voiceName: parsed.data.voiceName || liveContext.persona.voice,
                recentChatContext: liveContext.recentChatContext,
              });

              initDone = true;
              isConnected = true;
              armSessionTimeout(ws);
              ws.send(JSON.stringify({ type: 'connected' }));
            } catch (err) {
              if (c.env.DB && liveChargeKey && liveUserId) {
                void releaseEnergyForInference(
                  c.env.DB,
                  liveUserId,
                  liveChargeKey,
                  'live_voice_init_failed'
                );
                liveChargeKey = null;
                liveUserId = null;
              }
              const message =
                err instanceof AuthRequiredError
                  ? 'Authentication required'
                  : err instanceof BatteryEmptyError
                    ? 'Battery is empty'
                  : err instanceof ConversationAccessError
                    ? 'Conversation access denied'
                  : err instanceof PersonaNotFoundError
                    ? err.message
                    : formatCleanErrorMessage(err);
              ws.send(
                JSON.stringify({
                  type: 'error',
                  message,
                  code: err instanceof BatteryEmptyError ? 'BATTERY_EMPTY' : undefined,
                })
              );
            } finally {
              initInProgress = false;
            }
            return;
          }

          if (!initDone || !session || !isConnected) {
            if (initInProgress) return;
            ws.send(JSON.stringify({ type: 'error', message: 'Send init before audio or text' }));
            return;
          }

          if (msg.type === 'audio') {
            const parsed = liveAudioSchema.safeParse(msg);
            if (!parsed.success) {
              malformedCount += 1;
              if (malformedCount > 20) {
                ws.send(JSON.stringify({ type: 'error', message: 'Too many invalid messages' }));
                cleanup();
                ws.close();
              }
              return;
            }
            session.sendAudio(parsed.data.data);
            return;
          }

          if (msg.type === 'text') {
            const parsed = liveTextSchema.safeParse(msg);
            if (!parsed.success) {
              malformedCount += 1;
              return;
            }
            session.sendText(parsed.data.text);
          }
        } catch {
          malformedCount += 1;
          ws.send(JSON.stringify({ type: 'error', message: 'Malformed message' }));
        }
      },
      onClose() {
        if (c.env.DB && liveChargeKey && liveUserId) {
          void settleEnergyForInference(
            c.env.DB,
            liveUserId,
            liveChargeKey,
            'voice_call'
          ).catch(() =>
            releaseEnergyForInference(c.env.DB!, liveUserId!, liveChargeKey!, 'live_voice_close')
          );
          liveChargeKey = null;
          liveUserId = null;
        }
        cleanup();
      },
    };
  })
);

export default app;
