export function formatCleanErrorMessage(rawError: unknown): string {
  if (!rawError) return 'Произошла ошибка при обращении к модели.';
  let msg = typeof rawError === 'string' ? rawError : (rawError as Error).message || String(rawError);

  for (let depth = 0; depth < 4; depth++) {
    if (typeof msg === 'string') {
      const trimmed = msg.trim();
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          const parsed = JSON.parse(trimmed.slice(start, end + 1));
          if (parsed.error?.message) {
            msg = parsed.error.message;
            continue;
          }
          if (parsed.message) {
            msg = parsed.message;
            continue;
          }
        } catch {
          // not valid json
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
    return 'Серверы модели временно перегружены. Повторите запрос через пару секунд.';
  }
  if (lower.includes('quota') || lower.includes('429') || lower.includes('rate limit')) {
    return 'Превышен лимит запросов. Подождите и повторите отправку.';
  }
  if (
    lower.includes('api_key') ||
    lower.includes('apikey') ||
    lower.includes('unauthenticated') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'Ошибка авторизации API ключа Gemini. Проверьте настройки.';
  }

  if (msg.includes('{"error":') || msg.includes('"code":')) {
    return 'Сервис временно недоступен. Повторите попытку через пару секунд.';
  }

  return msg.length > 250 ? msg.slice(0, 250) + '...' : msg;
}
