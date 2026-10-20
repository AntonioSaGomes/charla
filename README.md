# Charla

A Spanish speaking-practice app for Portuguese speakers. You talk to an AI partner in everyday situations; every sentence you say is corrected, with the Portuguese traps explained, and you can repeat the correct version until it sounds right.

It is a progressive web app: open it in Safari on an iPhone and choose **Share › Add to Home Screen** to use it full screen like a native app.

## How it works

- **Speech to text runs on the phone.** Whisper (via transformers.js) is downloaded once (~80 MB, or ~250 MB for the more accurate model) and cached. Audio never leaves the device.
- **Conversation and corrections come from Claude**, called directly from the phone with your own Anthropic API key (stored only in the browser's local storage).
- **Replies are read aloud** with the device's Spanish voices.
- Conversations, the mistakes notebook and progress are stored on the device. Settings › Datos exports a backup.

## Build

```sh
npm install --ignore-scripts
npm run build      # writes the site to docs/
```

`docs/` is a static site. Serve it over HTTPS (GitHub Pages works: Settings › Pages › Deploy from a branch › `main` › `/docs`).

## Files

- `src/app.js`: screens and interaction
- `src/claude.js`: Claude API calls, prompts and output schemas
- `src/audio.js`: microphone capture and text-to-speech
- `src/stt.js`, `src/stt-worker.js`: on-device Whisper
- `src/data.js`: scenarios, pronunciation guide, false friends
- `src/sw.js`: offline cache
