import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'persony-server/1.0',
      },
    },
  });
}

// Clean and unwrap nested JSON error messages from @google/genai SDK
function formatCleanErrorMessage(rawError: any): string {
  if (!rawError) return 'Произошла ошибка при обращении к модели.';

  let msg = typeof rawError === 'string' ? rawError : rawError.message || String(rawError);

  // Recursively unwrap nested JSON strings often returned by Gemini SDK errors
  for (let depth = 0; depth < 4; depth++) {
    if (typeof msg === 'string') {
      const trimmed = msg.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || trimmed.includes('{"error"')) {
        try {
          const jsonStart = trimmed.indexOf('{');
          const jsonEnd = trimmed.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
            if (parsed.error?.message) {
              msg = parsed.error.message;
              continue;
            } else if (parsed.message) {
              msg = parsed.message;
              continue;
            }
          }
        } catch {
          // not JSON, proceed
        }
      }
    }
    break;
  }

  const lower = String(msg).toLowerCase();
  if (
    lower.includes('503') ||
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('service unavailable')
  ) {
    return 'Серверы модели временно перегружены запросами. Пожалуйста, отправьте сообщение ещё раз через пару секунд.';
  }
  if (lower.includes('quota') || lower.includes('429') || lower.includes('rate limit')) {
    return 'Превышен лимит запросов к модели. Пожалуйста, подождите немного и повторите отправку.';
  }
  if (
    lower.includes('api_key') ||
    lower.includes('apikey') ||
    lower.includes('unauthenticated') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'Ошибка авторизации API ключа Gemini. Проверьте настройки ключа в проекте.';
  }

  // Remove any remaining raw JSON markers
  if (msg.includes('{"error":') || msg.includes('"code":')) {
    return 'Сервис временно недоступен. Пожалуйста, повторите попытку через пару секунд.';
  }

  return msg.length > 250 ? msg.slice(0, 250) + '...' : msg;
}

// Multi-tier stream fallback cascade:
// Tries gemini-3.8-flash -> gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-2.5-flash
async function streamGeminiWithFallback(
  ai: ReturnType<typeof getAIClient>,
  contents: any[],
  config: any,
  onChunk: (text: string) => void
) {
  const CANDIDATE_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash',
  ];

  let streamedAny = false;
  let lastError: any = null;

  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const model = CANDIDATE_MODELS[i];
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          streamedAny = true;
          onChunk(text);
        }
      }

      // Stream finished successfully
      return;
    } catch (err: any) {
      console.warn(`[Fallback Cascade] Model "${model}" failed (streamedAny=${streamedAny}):`, err?.message || err);
      lastError = err;

      // If we already sent partial tokens to client, do not restart stream to avoid repetition
      if (streamedAny) {
        throw err;
      }

      // If failed before any tokens streamed, wait briefly and cascade to next model
      if (i < CANDIDATE_MODELS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: Date.now(),
    });
  });

  // Text Chat with Persona (Streaming SSE)
  app.post('/api/chat', async (req, res) => {
    const { character, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages payload' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const ai = getAIClient();

      // Convert messages to Gemini contents structure
      const systemPrompt = character?.systemPrompt || 'You are a helpful and intelligent AI character in a messenger.';
      
      const contents = messages.map((m: { sender: string; text: string }) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const streamConfig = {
        systemInstruction: `${systemPrompt}\n\n[ВАЖНО ДЛЯ ФОРМАТИРОВАНИЯ В МЕССЕНДЖЕРЕ]:
- Отвечай в стиле мессенджера Persony: лаконично, естественно, без лишней "роботизированности", живым человеческим языком персонажа.
- Сохраняй характер, тон и словарный запас персонажа в каждом сообщении.
- Если сообщение пользователя начинается с расшифровки голосового сообщения, отвечай так, будто ты его только что услышал и понял каждое слово.
- Отвечай на том же языке, на котором пишет собеседник (по умолчанию русский).
- Используй эмодзи и абзацы уместно.`,
        temperature: 0.85,
      };

      // Call multi-tier fallback stream: gemini-3.8-flash -> gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-2.5-flash
      await streamGeminiWithFallback(ai, contents, streamConfig, (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      const cleanErrorMessage = formatCleanErrorMessage(error);
      res.write(`data: ${JSON.stringify({ error: cleanErrorMessage })}\n\n`);
      res.end();
    }
  });

  // Audio Voice Note Transcription with Multi-Model Fallback Cascade
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required' });
      }

      // Detect WAV header if base64 begins with 'UklGR' (RIFF)
      let cleanMime = 'audio/wav';
      if (typeof mimeType === 'string' && mimeType.trim()) {
        cleanMime = mimeType.split(';')[0].trim();
      }
      if (audioBase64.startsWith('UklGR')) {
        cleanMime = 'audio/wav';
      }

      const ai = getAIClient();
      const audioPart = {
        inlineData: {
          mimeType: cleanMime,
          data: audioBase64,
        },
      };

      const TRANSCRIBE_MODELS = [
        'gemini-3.8-flash',
        'gemini-3.5-transcribe',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
      ];

      let transcript = '';
      let lastErr = null;

      for (const model of TRANSCRIBE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [
                audioPart,
                {
                  text: 'Ты — система распознавания речи. Внимательно прослушай эту аудиозапись и выведи исключительно распознанную речь пользователя (на русском или языке собеседника). Не добавляй пояснений, кавычек, приветствий или рассуждений. Только дословный текст речи. Если звучит тишина или шум без слов, ничего не пиши.',
                },
              ],
            },
          });
          transcript = response.text?.trim() || '';
          if (transcript) {
            break;
          }
        } catch (tErr: any) {
          console.warn(`[Fallback] Transcribe model "${model}" failed:`, tErr?.message || tErr);
          lastErr = tErr;
        }
      }

      res.json({ transcript });
    } catch (err: any) {
      console.error('Error in /api/transcribe:', err);
      res.status(500).json({ error: formatCleanErrorMessage(err) });
    }
  });

  // AI Persona Generator: Generates a full character profile with model fallback
  app.post('/api/generate-character', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const ai = getAIClient();
      const promptText = `Создай уникального agentic-персонажа для общения в мессенджере Persony по следующей идее: "${prompt}".

Верни СТРОГИЙ JSON со следующей структурой (без markdown оберток):
{
  "name": "Имя персонажа с эпитетом или ником",
  "tagline": "Короткий броский статус/профессия (3-5 слов)",
  "description": "Описание характера и того, чем полезен (2 предложения)",
  "systemPrompt": "Детальный системный промпт для модели: кто он, какой тон, особенности речи, как реагирует на пользователя, манеры, правила поведения.",
  "voice": "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr" | "Aoede",
  "category": "tech" | "philosophy" | "creative" | "mentor" | "fantasy" | "custom",
  "color": "#71717a",
  "badge": "Метка (1-2 слова, например 'Hacker', 'Mentor', 'AI')",
  "starterMessages": ["Первое приветствие 1", "Первое приветствие 2"]
}

Выбери подходящий голос из списка:
- Puck (бодрый, энергичный)
- Charon (глубокий, низкий, кибер)
- Kore (загадочный, мягкий, поэтичный)
- Fenrir (уверенный, лидерский)
- Zephyr (спокойный, душевный, эмпатичный)
- Aoede (интеллектуальный, элегантный)`;

      const GENERATOR_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
      let parsed = null;
      let lastErr = null;

      for (const model of GENERATOR_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: promptText,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.9,
            },
          });

          const rawText = response.text || '{}';
          parsed = JSON.parse(rawText);
          if (parsed && parsed.name) {
            break;
          }
        } catch (genErr: any) {
          console.warn(`[Fallback] Generate character model "${model}" failed:`, genErr?.message || genErr);
          lastErr = genErr;
        }
      }

      if (!parsed) {
        throw lastErr || new Error('Не удалось сгенерировать персонажа');
      }

      res.json(parsed);
    } catch (err: any) {
      console.error('Error in /api/generate-character:', err);
      res.status(500).json({ error: formatCleanErrorMessage(err) });
    }
  });

  // Setup WebSocket Server on /api/live for Gemini 3.1 Flash Live real-time audio
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Let other requests pass (or close if not handled)
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    let liveSession: any = null;
    let isConnected = false;

    console.log('Client connected to Live API WebSocket');

    clientWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'init') {
          const { characterName, systemPrompt, voiceName, recentChatContext } = msg;
          console.log(`Initializing Live API session for character: ${characterName}, voice: ${voiceName}`);

          try {
            const ai = getAIClient();

            let contextSnippet = '';
            if (recentChatContext && Array.isArray(recentChatContext) && recentChatContext.length > 0) {
              const formattedMsgs = recentChatContext
                .slice(-6)
                .map((m: any) => `${m.sender === 'user' ? 'Пользователь' : characterName}: ${m.text}`)
                .join('\n');
              contextSnippet = `\n\n[КОНТЕКСТ НЕДАВНЕЙ ТЕКСТОВОЙ ПЕРЕПИСКИ В ЧАТЕ]:
Вы только что общались с пользователем в текстовом мессенджере. Вот последние реплики:
${formattedMsgs}
Ты помнишь этот диалог! Можешь продолжить беседу с того места, где вы остановились, или органично упомянуть затронутые темы.`;
            }

            const fullSystemInstruction = `${systemPrompt || 'You are an intelligent voice companion.'}
            
[ИНСТРУКЦИЯ ДЛЯ ГОЛОСОВОГО ЗВОНКА]:
- Ты общаешься в прямом эфире по голосовому звонку.
- ВАЖНЕЙШЕЕ ПРАВИЛО: Ты ВСЕГДА начинаешь разговор первым сразу при соединении! Не жди, пока пользователь заговорит — сразу тепло, естественно и живо поприветствуй его в своем образе ${characterName || ''}, задай приветственный вопрос или начни диалог.
- Отвечай естественно, лаконично, как живой собеседник по телефону. Реплики в 1-2 предложения.
- Не говори длинными лекциями или монологами, веди естественную беседу.
- Отвечай на том же языке, на котором говорит собеседник (по умолчанию русский).
- Полностью держи образ и характер персонажа ${characterName || ''}!${contextSnippet}`;

            liveSession = await ai.live.connect({
              model: 'gemini-3.1-flash-live-preview',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voiceName || 'Puck',
                    },
                  },
                },
                systemInstruction: fullSystemInstruction,
                // Request transcriptions so UI can show live captions
                outputAudioTranscription: {},
                inputAudioTranscription: {},
              },
              callbacks: {
                onmessage: (serverMessage: LiveServerMessage) => {
                  if (clientWs.readyState !== WebSocket.OPEN) return;

                  // 1. Audio data from model
                  const audioPart = serverMessage.serverContent?.modelTurn?.parts?.find(
                    (p: any) => p.inlineData && p.inlineData.data
                  );
                  if (audioPart?.inlineData?.data) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'audio',
                        data: audioPart.inlineData.data,
                      })
                    );
                  }

                  // 2. Interruption handling
                  if (serverMessage.serverContent?.interrupted) {
                    clientWs.send(JSON.stringify({ type: 'interrupted' }));
                  }

                  // 3. Live Transcriptions / Subtitles
                  const textPart = serverMessage.serverContent?.modelTurn?.parts?.find((p: any) => p.text);
                  if (textPart?.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'model_transcript',
                        text: textPart.text,
                      })
                    );
                  }

                  const outputTrans = (serverMessage.serverContent as any)?.outputAudioTranscription?.text;
                  if (outputTrans) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'model_transcript',
                        text: outputTrans,
                      })
                    );
                  }

                  const inputTrans = (serverMessage.serverContent as any)?.inputAudioTranscription?.text;
                  if (inputTrans) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'user_transcript',
                        text: inputTrans,
                      })
                    );
                  }

                  // 4. Turn Complete
                  if (serverMessage.serverContent?.turnComplete) {
                    clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                  }
                },
                onerror: (err: any) => {
                  console.error('Gemini Live API error:', err);
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'error',
                        message: formatCleanErrorMessage(err),
                      })
                    );
                  }
                },
                onclose: () => {
                  console.log('Gemini Live session closed');
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'session_closed' }));
                  }
                },
              },
            });

            isConnected = true;
            clientWs.send(JSON.stringify({ type: 'connected' }));

            // Immediately prompt the agent to start speaking first as requested by the user
            setTimeout(async () => {
              if (liveSession && isConnected) {
                try {
                  await liveSession.send({
                    clientContent: {
                      turns: [
                        {
                          role: 'user',
                          parts: [
                            {
                              text: `[Системный сигнал: Пользователь поднял трубку. Начни разговор первым! Поздоровайся живо и кратко в своем образе ${characterName || ''} и задай вопрос собеседнику.]`,
                            },
                          ],
                        },
                      ],
                      turnComplete: true,
                    },
                  });
                } catch (firstTurnErr) {
                  try {
                    await liveSession.sendRealtimeInput({
                      text: `[Звонок начался. Поздоровайся первым в своем образе ${characterName || ''}!]`,
                    });
                  } catch (e) {
                    console.error('Failed to trigger initial live greeting:', e);
                  }
                }
              }
            }, 300);
          } catch (connErr: any) {
            console.error('Failed to connect to Gemini Live API:', connErr);
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: formatCleanErrorMessage(connErr),
              })
            );
          }
        } else if (msg.type === 'audio') {
          // Client streaming raw PCM16 mic data
          if (liveSession && isConnected) {
            liveSession.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (msg.type === 'text') {
          // Text prompt injected into live session
          if (liveSession && isConnected) {
            liveSession.sendRealtimeInput({
              text: msg.text,
            });
          }
        }
      } catch (parseErr) {
        console.error('Error handling WS message:', parseErr);
      }
    });

    clientWs.on('close', () => {
      console.log('Client WS disconnected, cleaning up Live session');
      if (liveSession) {
        try {
          liveSession.close?.();
        } catch (e) {
          // ignore close errors
        }
        liveSession = null;
      }
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Persony server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
