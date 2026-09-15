# Spec 04: Стабильность голосовых звонков на мобильных

## Симптомы

- Речь бота «затыкается», прерывается
- Хуже на iOS/Android, на десктопе приемлемо

## Диагностика

В консоли браузера во время звонка (каждые 8с): `[Persony Call]` snapshot:

| Поле | Значение |
|------|----------|
| `underruns` | Сколько раз воспроизведение отстало от сети (рост = джиттер/нагрузка) |
| `chunksPlayed` / `chunksSent` | Активность downlink/uplink |
| `playbackQueueMs` | Буфер впереди (мс) |
| `inputSampleRate` / `outputSampleRate` | Реальные Hz контекста (часто 48000 на телефоне) |
| `inputCtxState` / `outputCtxState` | `running` или `suspended` |

## Корневые причины (исправлено)

1. **Sample rate** — iOS игнорирует 16 kHz; без ресемплинга Gemini получал неверный PCM
2. **Нет jitter buffer** — при сетевой задержке `nextPlayTime` уходил в прошлое → щелчки
3. **Мик → динамик** — ScriptProcessor был подключён к destination → эхо и ложные `interrupted`
4. **AudioContext suspended** — при сворачивании/блокировке экрана
5. **Слишком частый uplink** — мелкие WS-пакеты на слабом LTE

## Оптимизации

| Мера | Файл |
|------|------|
| Ресемплинг mic → 16 kHz, playback 24 kHz → device rate | `pcmAudio.ts`, `audioStreamer.ts` |
| Jitter buffer 140 ms mobile / 80 ms desktop | `audioStreamer.ts` |
| Батч uplink 120 ms / playback merge 50 ms | `audioStreamer.ts` |
| Silent gain (mic не в динамик) | `audioStreamer.ts` |
| `audioSession: play-and-record` (iOS) | `audioStreamer.ts` |
| Resume on `visibilitychange` / `focus` | `LiveVoiceCallModal.tsx` |
| Screen Wake Lock на мобильных | `LiveVoiceCallModal.tsx` |
| Debounce `interrupted` 120 ms mobile | `LiveVoiceCallModal.tsx` |
| Throttle volume UI 100 ms | `audioStreamer.ts` |

## Проверка

- [ ] iOS Safari: звонок 2+ мин без обрывов
- [ ] Android Chrome: нет щелчков при переключении субтитров
- [ ] `underruns` не растёт лавинообразно
- [ ] После блокировки экрана — resume при возврате
