# Persony — Spec 02: Design System

## Принцип

Telegram-inspired layout и плотность, но **собственная** палитра Persony. Не копируем SCSS/компоненты из GPL-репозиториев Telegram — только реимплементация паттернов.

## Отличия от Telegram

| Аспект | Telegram | Persony |
|--------|----------|---------|
| Dark bg | Синеватый `#17212b` | Нейтральный `#0a0a0b` |
| Sidebar | `#17212b` | `#111113` |
| Chat bg | Паттерн + синий оттенок | Нейтральный `#0e0e10` + subtle pattern |
| Outgoing bubble | `#2b5278` (синий) | `#2a2a2e` (нейтральный elevated) |
| Accent | `#3390ec` | `#4ec9a0` (мягкий teal) |
| Incoming bubble | `#182533` | `#1c1c1f` |

## Токены (CSS custom properties)

Префикс `--py-*`. Светлая и тёмная тема через класс `.dark` на `<html>`.

Категории:
- **Surface**: app, sidebar, chat, elevated, input
- **Text**: primary, secondary, muted
- **Border**: default, subtle
- **Bubble**: in, out
- **Accent**: default, hover, muted
- **Status**: online, error, success
- **Radius**: sm, md, lg, bubble
- **Shadow**: sm, md

## Tailwind integration

`@theme inline` в `index.css` — маппинг `--color-py-*` для utility-классов.

## Компоненты для обновления

1. `App.tsx` — корневые surface
2. `Sidebar.tsx` — список чатов
3. `ChatArea.tsx` — пузыри, composer, header
4. `index.html` — meta theme-color, шрифты
5. `manifest.webmanifest` — бренд Persony

## Шрифты

- UI: Plus Jakarta Sans (уже подключён)
- Display/logo: Outfit
- Code: JetBrains Mono
