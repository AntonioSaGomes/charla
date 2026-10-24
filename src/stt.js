// Main-thread side of on-device speech recognition.
import { log } from './diag.js';
let worker = null;
let nextId = 1;
const pending = new Map();
const listeners = new Set();
export const sttState = { status: 'idle', loaded: 0, total: 0, device: '', model: '', error: '' };

function emit() { listeners.forEach(f => f({ ...sttState })); }
export function onStt(f) { listeners.add(f); return () => listeners.delete(f); }

function ensureWorker() {
  if (worker) return worker;
  log('stt', 'starting speech worker');
  worker = new Worker(new URL('./stt-worker.js', import.meta.url), { type: 'module' });
  worker.onmessageerror = () => log('stt', 'worker message could not be read');
  worker.onmessage = ({ data }) => {
    if (data.type === 'log') { log('worker', data.msg); return; }
    if (data.type !== 'progress') log('stt', `worker says ${data.type}${data.message ? `: ${data.message}` : ''}${data.device ? ` (${data.device})` : ''}`);
    if (data.type === 'progress') { sttState.status = 'downloading'; sttState.loaded = data.loaded; sttState.total = data.total; emit(); }
    else if (data.type === 'warming') { sttState.status = 'warming'; emit(); }
    else if (data.type === 'ready') { mark(null); Object.assign(sttState, { status: 'ready', device: data.device, model: data.model, error: '' }); emit(); }
    else if (data.type === 'result') { const p = pending.get(data.id); if (p) { pending.delete(data.id); p.resolve(data.text); } }
    else if (data.type === 'error') {
      const p = data.id && pending.get(data.id);
      if (p) { pending.delete(data.id); p.reject(new Error(data.message)); }
      else { mark(null); sttState.status = 'error'; sttState.error = data.message; emit(); }
    }
  };
  worker.onerror = e => { log('stt', `worker failed: ${e.message || '(no message)'} at ${(e.filename || '').split('/').pop()}:${e.lineno || '?'}`); e.preventDefault && e.preventDefault(); worker = null; mark(null); sttState.status = 'error'; sttState.error = e.message || 'The speech engine could not start on this device.'; emit(); };
  return worker;
}

const IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ATTEMPT = 'charla.sttAttempt';
const mark = v => { try { v ? localStorage.setItem(ATTEMPT, v) : localStorage.removeItem(ATTEMPT); } catch (e) {} };

// If iOS killed the page while a model was loading, the marker survives the reload and names that model.
export function takeCrashedModel() {
  let m = null;
  try { m = localStorage.getItem(ATTEMPT); } catch (e) {}
  mark(null);
  return m;
}

// Leaving the app (swiping it away, switching apps) is not a crash: only a load that was cut off
// while the app was on screen counts.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') mark(null);
  else if (sttState.status === 'downloading' || sttState.status === 'warming') mark(sttState.model);
});

export function loadStt(model) {
  if (sttState.status === 'ready' && sttState.model === model) return;
  sttState.status = 'downloading'; sttState.model = model; sttState.error = ''; sttState.loaded = 0; sttState.total = 0; emit();
  mark(model);
  log('stt', `load requested: ${model} (iOS: ${IOS})`);
  ensureWorker().postMessage({ type: 'load', model, allowGpu: !IOS });
}

// Whisper invents these on near-silence, especially in Spanish.
const HALLUCINATIONS = /amara\.org|subt[ií]tulos|suscr[ií]bete|gracias por ver|^\.+$|^\s*\[.*\]\s*$/i;

export function transcribe(audio, model) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: t => resolve(HALLUCINATIONS.test(t) && t.length < 60 ? '' : t), reject });
    ensureWorker().postMessage({ type: 'transcribe', id, audio, model, allowGpu: !IOS }, [audio.buffer]);
  });
}
