// Main-thread side of on-device speech recognition.
let worker = null;
let nextId = 1;
const pending = new Map();
const listeners = new Set();
export const sttState = { status: 'idle', loaded: 0, total: 0, device: '', model: '', error: '' };

function emit() { listeners.forEach(f => f({ ...sttState })); }
export function onStt(f) { listeners.add(f); return () => listeners.delete(f); }

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./stt-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') { sttState.status = 'downloading'; sttState.loaded = data.loaded; sttState.total = data.total; emit(); }
    else if (data.type === 'warming') { sttState.status = 'warming'; emit(); }
    else if (data.type === 'ready') { Object.assign(sttState, { status: 'ready', device: data.device, model: data.model, error: '' }); emit(); }
    else if (data.type === 'result') { const p = pending.get(data.id); if (p) { pending.delete(data.id); p.resolve(data.text); } }
    else if (data.type === 'error') {
      const p = data.id && pending.get(data.id);
      if (p) { pending.delete(data.id); p.reject(new Error(data.message)); }
      else { sttState.status = 'error'; sttState.error = data.message; emit(); }
    }
  };
  worker.onerror = e => { sttState.status = 'error'; sttState.error = e.message || 'The speech engine stopped.'; emit(); };
  return worker;
}

export function loadStt(model) {
  if (sttState.status === 'ready' && sttState.model === model) return;
  sttState.status = 'downloading'; sttState.model = model; sttState.error = ''; sttState.loaded = 0; sttState.total = 0; emit();
  ensureWorker().postMessage({ type: 'load', model });
}

// Whisper invents these on near-silence, especially in Spanish.
const HALLUCINATIONS = /amara\.org|subt[ií]tulos|suscr[ií]bete|gracias por ver|^\.+$|^\s*\[.*\]\s*$/i;

export function transcribe(audio, model) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: t => resolve(HALLUCINATIONS.test(t) && t.length < 60 ? '' : t), reject });
    ensureWorker().postMessage({ type: 'transcribe', id, audio, model }, [audio.buffer]);
  });
}
