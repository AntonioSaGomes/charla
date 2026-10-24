// Runs Whisper on the device. Model files come from Hugging Face once and are then cached by the browser.
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let asr = null;
let current = '';
let device = '';
let loading = null;

async function hasWebGPU() {
  try { return !!(self.navigator && navigator.gpu && await navigator.gpu.requestAdapter()); } catch (e) { return false; }
}

function progressReporter() {
  const files = {};
  return p => {
    if (p.status === 'progress' && p.file) {
      files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
      let loaded = 0, total = 0;
      for (const f of Object.values(files)) { loaded += f.loaded; total += f.total; }
      postMessage({ type: 'progress', loaded, total });
    }
  };
}

async function build(model) {
  const progress_callback = progressReporter();
  if (await hasWebGPU()) {
    try {
      const p = await pipeline('automatic-speech-recognition', model, { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, progress_callback });
      device = 'webgpu';
      return p;
    } catch (e) { /* fall through to WebAssembly */ }
  }
  const p = await pipeline('automatic-speech-recognition', model, { device: 'wasm', dtype: 'q8', progress_callback });
  device = 'wasm';
  return p;
}

async function load(model) {
  if (asr && current === model) return;
  if (loading && loading.model === model) return loading.promise;
  const promise = (async () => {
    if (asr && asr.dispose) { try { await asr.dispose(); } catch (e) {} }
    asr = null;
    const p = await build(model);
    postMessage({ type: 'warming' });
    await p(new Float32Array(16000), { language: 'spanish', task: 'transcribe' });
    asr = p; current = model;
  })();
  loading = { model, promise };
  try { await promise; } finally { loading = null; }
}

// Anything that escapes the handlers below still reaches the app with its real message.
self.addEventListener('unhandledrejection', e => postMessage({ type: 'error', message: String((e.reason && e.reason.message) || e.reason) }));
self.addEventListener('error', e => postMessage({ type: 'error', message: String(e.message || e) }));

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      await load(data.model);
      postMessage({ type: 'ready', device, model: current });
    } else if (data.type === 'transcribe') {
      await load(data.model);
      const out = await asr(data.audio, { language: 'spanish', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
      postMessage({ type: 'result', id: data.id, text: String((out && out.text) || '').trim() });
    }
  } catch (e) {
    postMessage({ type: 'error', id: data.id, message: String((e && e.message) || e) });
  }
};
