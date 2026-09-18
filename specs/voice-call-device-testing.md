# Voice Call — device testing checklist

Product term: **Voice Call** (RU: **Голосовой звонок**).

## iOS (Safari)

- [ ] Speaker output
- [ ] Wired / Bluetooth headset
- [ ] Screen lock / unlock during call
- [ ] Microphone permission revoke / restore
- [ ] Network interruption (Wi-Fi off/on)

## Android (Chrome)

- [ ] Speaker output
- [ ] Bluetooth headset
- [ ] App background / foreground
- [ ] Network switch Wi-Fi ↔ mobile data

## Desktop

- [ ] Chrome
- [ ] Firefox (if supported)
- [ ] Bluetooth headset
- [ ] Default microphone change mid-call

## Soak tests (manual)

| Duration | Watch for |
|----------|-----------|
| 15 min | latency, disconnects, transcript gaps |
| 30 min | memory growth, AudioContext stability |
| 60 min | CPU, echo, Battery accounting |

Status: **spec only** — not production-verified until executed and logged.
