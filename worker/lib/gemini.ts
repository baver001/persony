import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { formatCleanErrorMessage } from './errors';
import {
  GEMINI_CHAT_MODELS,
  GEMINI_GENERATOR_MODELS,
  GEMINI_LIVE_MODEL,
  GEMINI_TRANSCRIBE_MODELS,
} from './models';
import { classifyProviderError, shouldFallbackToNextModel } from './provider-errors';

export interface Env {
  GEMINI_API_KEY: string;
}

export function getAIClient(apiKey: string): GoogleGenAI {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'persony-worker/1.0',
      },
    },
  });
}

export async function streamGeminiWithFallback(
  ai: GoogleGenAI,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  config: Record<string, unknown>,
  onChunk: (text: string) => void
): Promise<void> {
  let streamedAny = false;
  let lastError: unknown = null;

  for (let i = 0; i < GEMINI_CHAT_MODELS.length; i++) {
    const model = GEMINI_CHAT_MODELS[i];
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
      return;
    } catch (err) {
      lastError = err;
      const kind = classifyProviderError(err);
      if (!shouldFallbackToNextModel(kind, streamedAny)) throw err;
      if (i < GEMINI_CHAT_MODELS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw err;
    }
  }

  if (lastError) throw lastError;
}

export async function handleChat(
  apiKey: string,
  character: { systemPrompt?: string } | undefined,
  messages: Array<{ sender: string; text: string }>
): Promise<ReadableStream<Uint8Array>> {
  const ai = getAIClient(apiKey);
  const systemPrompt = character?.systemPrompt || 'You are a helpful AI character in a messenger.';

  const contents = messages.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  const streamConfig = {
    systemInstruction: `${systemPrompt}\n\n[ВАЖНО ДЛЯ ФОРМАТИРОВАНИЯ В МЕССЕНДЖЕРЕ]:
- Отвечай в стиле мессенджера Persony: лаконично, естественно, живым языком персонажа.
- Сохраняй характер, тон и словарный запас персонажа.
- Если сообщение — расшифровка голосового, отвечай так, будто только что услышал.
- Отвечай на языке собеседника (по умолчанию русский).
- Используй эмодзи и абзацы уместно.`,
    temperature: 0.85,
  };

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        await streamGeminiWithFallback(ai, contents, streamConfig, (text) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (error) {
        const clean = formatCleanErrorMessage(error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: clean })}\n\n`));
        controller.close();
      }
    },
  });
}

export async function handleTranscribe(
  apiKey: string,
  audioBase64: string,
  mimeType?: string
): Promise<{ transcript: string }> {
  const ai = getAIClient(apiKey);

  let cleanMime = 'audio/wav';
  if (typeof mimeType === 'string' && mimeType.trim()) {
    cleanMime = mimeType.split(';')[0].trim();
  }
  if (audioBase64.startsWith('UklGR')) {
    cleanMime = 'audio/wav';
  }

  const audioPart = {
    inlineData: { mimeType: cleanMime, data: audioBase64 },
  };

  for (const model of GEMINI_TRANSCRIBE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            audioPart,
            {
              text:
                'Ты — система распознавания речи. Выведи исключительно распознанную речь пользователя. Без пояснений и кавычек. Если тишина — ничего не пиши.',
            },
          ],
        },
      });
      const transcript = response.text?.trim() || '';
      if (transcript) return { transcript };
    } catch (err) {
      const kind = classifyProviderError(err);
      if (!shouldFallbackToNextModel(kind, false)) break;
    }
  }

  return { transcript: '' };
}

export async function handleGenerateCharacter(apiKey: string, prompt: string): Promise<Record<string, unknown>> {
  const ai = getAIClient(apiKey);

  const promptText = `Создай уникального agentic-персонажа для общения в мессенджере Persony по идее: "${prompt}".

Верни СТРОГИЙ JSON (без markdown):
{
  "name": "Имя",
  "tagline": "Статус 3-5 слов",
  "description": "2 предложения",
  "systemPrompt": "Детальный системный промпт",
  "voice": "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr" | "Aoede",
  "category": "tech" | "philosophy" | "creative" | "mentor" | "fantasy" | "custom",
  "color": "#71717a",
  "badge": "Метка",
  "starterMessages": ["Приветствие 1", "Приветствие 2"]
}`;

  let lastErr: unknown = null;

  for (const model of GEMINI_GENERATOR_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.9,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed?.name) return parsed;
    } catch (err) {
      lastErr = err;
      const kind = classifyProviderError(err);
      if (!shouldFallbackToNextModel(kind, false)) break;
    }
  }

  throw lastErr || new Error('Не удалось сгенерировать персонажа');
}

export type LiveClientSocket = {
  send: (data: string) => void;
  readyState: number;
};

export interface LiveSessionHandle {
  sendAudio: (data: string) => void;
  sendText: (text: string) => void;
  close: () => void;
}

export async function initLiveSession(
  apiKey: string,
  clientWs: LiveClientSocket,
  init: {
    characterName?: string;
    systemPrompt?: string;
    voiceName?: string;
    recentChatContext?: Array<{ sender: string; text: string }>;
  }
): Promise<LiveSessionHandle> {
  const ai = getAIClient(apiKey);
  const { characterName, systemPrompt, voiceName, recentChatContext } = init;

  let contextSnippet = '';
  if (recentChatContext?.length) {
    const formatted = recentChatContext
      .slice(-6)
      .map((m) => `${m.sender === 'user' ? 'Пользователь' : characterName}: ${m.text}`)
      .join('\n');
    contextSnippet = `\n\n[КОНТЕКСТ НЕДАВНЕЙ ПЕРЕПИСКИ]:\n${formatted}`;
  }

  const fullSystemInstruction = `${systemPrompt || 'You are an intelligent voice companion.'}

[ИНСТРУКЦИЯ ДЛЯ ГОЛОСОВОГО ЗВОНКА]:
- Общайся в прямом эфире по голосовому звонку.
- Начинай разговор первым — тепло поприветствуй в образе ${characterName || ''}.
- Реплики 1-2 предложения, естественно.
- Язык собеседника (по умолчанию русский).
- Держи образ ${characterName || ''}!${contextSnippet}`;

  const liveSession = await ai.live.connect({
    model: GEMINI_LIVE_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
        },
      },
      systemInstruction: fullSystemInstruction,
      outputAudioTranscription: {},
      inputAudioTranscription: {},
    },
    callbacks: {
      onmessage: (serverMessage: LiveServerMessage) => {
        if (clientWs.readyState !== 1) return;

        const audioPart = serverMessage.serverContent?.modelTurn?.parts?.find(
          (p) => p.inlineData?.data
        );
        if (audioPart?.inlineData?.data) {
          clientWs.send(JSON.stringify({ type: 'audio', data: audioPart.inlineData.data }));
        }

        if (serverMessage.serverContent?.interrupted) {
          clientWs.send(JSON.stringify({ type: 'interrupted' }));
        }

        const outputTrans = (serverMessage.serverContent as { outputTranscription?: { text?: string } })
          ?.outputTranscription?.text
          ?? (serverMessage.serverContent as { outputAudioTranscription?: { text?: string } })
            ?.outputAudioTranscription?.text;
        if (outputTrans) {
          clientWs.send(JSON.stringify({ type: 'model_transcript', text: outputTrans }));
        }

        const inputTrans = (serverMessage.serverContent as { inputTranscription?: { text?: string } })
          ?.inputTranscription?.text
          ?? (serverMessage.serverContent as { inputAudioTranscription?: { text?: string } })
            ?.inputAudioTranscription?.text;
        if (inputTrans) {
          clientWs.send(JSON.stringify({ type: 'user_transcript', text: inputTrans }));
        }

        if (serverMessage.serverContent?.turnComplete) {
          clientWs.send(JSON.stringify({ type: 'turn_complete' }));
        }
      },
      onerror: (err: unknown) => {
        if (clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ type: 'error', message: formatCleanErrorMessage(err) }));
        }
      },
      onclose: () => {
        if (clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ type: 'session_closed' }));
        }
      },
    },
  });

  setTimeout(async () => {
    try {
      await liveSession.sendRealtimeInput({
        text: `[Системный сигнал: Пользователь поднял трубку. Начни разговор первым в образе ${characterName || ''}!]`,
      });
    } catch {
      // ignore greeting trigger errors
    }
  }, 300);

  return {
    sendAudio: (data: string) => {
      liveSession.sendRealtimeInput({
        audio: { data, mimeType: 'audio/pcm;rate=16000' },
      });
    },
    sendText: (text: string) => {
      liveSession.sendRealtimeInput({ text });
    },
    close: () => {
      try {
        liveSession.close?.();
      } catch {
        // ignore
      }
    },
  };
}
