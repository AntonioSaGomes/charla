// Cloud transcription through Groq's Whisper large-v3-turbo, using the learner's own free Groq key.
import { log } from './diag.js';

const BASE = 'https://api.groq.com/openai/v1';
export const GROQ_MODEL = 'whisper-large-v3-turbo';

export class GroqError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

// 16-bit mono WAV: small enough at 16 kHz (32 KB per second) and accepted everywhere.
function toWav(samples, rate = 16000) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  // Normalise quiet recordings so Whisper hears them clearly.
  let peak = 0; for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 && peak < 0.5 ? 0.9 / peak : 1;
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i] * gain)) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}

async function call(path, key, init) {
  let res;
  try { res = await fetch(BASE + path, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init && init.headers) } }); }
  catch (e) { log('groq', `request failed before a response: ${e && e.message}`); throw new GroqError('network', e && e.message); }
  if (res.ok) return res.json();
  let msg = ''; try { const j = await res.json(); msg = (j.error && j.error.message) || ''; } catch (e) {}
  log('groq', `HTTP ${res.status} ${msg}`);
  if (res.status === 401 || res.status === 403) throw new GroqError('auth', msg);
  if (res.status === 429) throw new GroqError('rate', msg);
  throw new GroqError('server', `${res.status} ${msg}`);
}

export async function verifyGroqKey(key) {
  await call('/models', key, { method: 'GET' });
  return true;
}

export async function groqTranscribe(audio, key) {
  const form = new FormData();
  form.append('file', toWav(audio), 'speech.wav');
  form.append('model', GROQ_MODEL);
  form.append('language', 'es');
  form.append('temperature', '0');
  form.append('response_format', 'json');
  const t = performance.now();
  const j = await call('/audio/transcriptions', key, { method: 'POST', body: form });
  const text = String(j.text || '').trim();
  log('groq', `transcribed ${(audio.length / 16000).toFixed(1)}s in ${((performance.now() - t) / 1000).toFixed(1)}s: "${text.slice(0, 80)}"`);
  return text;
}
