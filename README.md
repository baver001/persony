# Persony

Мессенджер с AI-персонажами. Telegram-inspired UX, нейтральная тёмная тема, голосовые и live-звонки через Gemini.

**Домен:** [persony.org](https://persony.org) (подключение после первого деплоя)

## Быстрый старт

```bash
npm install

# Создайте .dev.vars с ключом Gemini:
# GEMINI_API_KEY=...

npm run dev      # Cloudflare Vite dev (Worker + SPA)
npm run build    # Production build
npm run deploy   # Деплой на Cloudflare Workers
```

## Что нужно от вас

| Секрет | Где получить | Куда положить |
|--------|--------------|---------------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | `.dev.vars` локально, `wrangler secret put GEMINI_API_KEY` в CF |
| `CLOUDFLARE_API_TOKEN` | [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens) | GitHub Actions secret |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Account ID | GitHub Actions secret |

## Документация

- `map.md` — карта проекта
- `DESIGN.md` — дизайн-система
- `specs/` — спеки (spec-driven)

## Стек

React 19 · Vite 6 · Tailwind 4 · Hono · Cloudflare Workers · Gemini API
