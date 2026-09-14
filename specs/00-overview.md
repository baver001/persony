# Persony — Spec 00: Overview

## Продукт

**Persony** (`persony.org`) — мессенджер с AI-персонажами. UX близок к Telegram, визуально — нейтральный тёмный режим без синевы Telegram.

## Режим зрелости

MVP — локальные данные, серверный прокси к Gemini, деплой на Cloudflare Workers.

## Стек

| Слой | Технология |
|------|------------|
| Frontend | React 19, Vite 6, Tailwind 4 |
| API | Cloudflare Worker (Hono) |
| AI | Gemini API (chat SSE, transcribe, generate-character, live voice WS) |
| Деплой | GitHub → Cloudflare Workers |
| Домен (цель) | persony.org |

## Scope этой итерации

1. Spec-driven документация (`specs/`, `map.md`, `DESIGN.md`)
2. Cloudflare Workers + Vite plugin + CI
3. Дизайн-система Persony (токены, не копипаст GPL-кода Telegram)
4. Ребрендинг PersonaGram → Persony — **Готово**

## Вне scope

- Auth (Clerk) — позже
- Облачная синхронизация — позже
- Кастомный домен persony.org — после первого деплоя

## Секреты (нужны от владельца)

| Секрет | Где | Обязательность |
|--------|-----|----------------|
| `GEMINI_API_KEY` | Cloudflare Worker secret + локально `.dev.vars` | **Обязательно** |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | Для CI deploy |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions secret | Для CI deploy |

## Критерии готовности

- [ ] `npm run build` проходит
- [ ] `npm run lint` проходит
- [ ] Worker отвечает на `/api/health`
- [ ] UI использует токены `--py-*`
- [ ] GitHub repo создан, workflow настроен
