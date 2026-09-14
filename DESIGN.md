# Persony Design System

> Telegram-inspired layout, Persony-owned palette.  
> Spec: `specs/02-design-system.md`

## Принципы

1. **Нейтральный dark** — без синевы Telegram (`#17212b` → `#0a0a0b`)
2. **Плотность как в мессенджере** — компактные списки, читаемые пузыри
3. **Акцент teal** — `#4ec9a0`, не Telegram blue `#3390ec`
4. **Токены через CSS variables** — префикс `--py-*`

## Палитра (dark)

| Token | Value | Роль |
|-------|-------|------|
| `--py-bg-app` | `#0a0a0b` | Корень приложения |
| `--py-bg-sidebar` | `#111113` | Список чатов |
| `--py-bg-chat` | `#0e0e10` | Фон диалога |
| `--py-bg-elevated` | `#1a1a1d` | Карточки, popover |
| `--py-bg-input` | `#1c1c1f` | Поля ввода |
| `--py-bubble-in` | `#1c1c1f` | Входящие |
| `--py-bubble-out` | `#2a2a2e` | Исходящие (нейтральный) |
| `--py-accent` | `#4ec9a0` | CTA, online, links |
| `--py-text-primary` | `#f4f4f5` | Основной текст |
| `--py-text-secondary` | `#a1a1aa` | Вторичный |
| `--py-border` | `#27272a` | Границы |

## Палитра (light)

| Token | Value |
|-------|-------|
| `--py-bg-app` | `#f4f4f5` |
| `--py-bg-sidebar` | `#ffffff` |
| `--py-bg-chat` | `#e8e8ea` |
| `--py-bubble-in` | `#ffffff` |
| `--py-bubble-out` | `#2a2a2e` |
| `--py-text-primary` | `#18181b` |

## Радиусы

- `--py-radius-bubble`: `18px` (пузыри)
- `--py-radius-panel`: `12px` (панели)
- `--py-radius-pill`: `9999px`

## Шрифты

- UI: Plus Jakarta Sans
- Display: Outfit
- Mono: JetBrains Mono
