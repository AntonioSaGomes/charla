// Runs Whisper on the device. Model files come from Hugging Face once and are then cached by the browser.
// Every step is reported back as a log line so a crash on the phone can be traced afterwards.
import { pipeline, env } from '@huggingface/transformers';

const log = msg => postMessage({ type: 'log', msg });

// The speech library and ONNX Runtime write their own diagnostics to the console; keep them.
for (const level of ['log', 'info', 'warn', 'error']) {
  const orig = console[level].bind(console);
  console[level] = (...args) => { try { log(`console.${level}: ${args.map(a => (a && a.stack) || (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ').slice(0, 500)}`); } catch (e) {} orig(...args); };
}

env.allowLocalModels = false;
env.useBrowserCache = true;
// Single-threaded WebAssembly keeps memory low enough for iPhone Safari.
if (env.backends && env.backends.onnx && env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

let asr = null;
let current = '';
let device = '';
let loading = null;

async function hasWebGPU() {
  try { return !!(self.navigator && navigator.gpu && await navigator.gpu.requestAdapter()); } catch (e) { return false; }
}

function progressReporter() {
  const files = {};
  const pctLogged = {};
  return p => {
    if (p.status === 'initiate') log(`file start: ${p.file}`);
    else if (p.status === 'done') log(`file ready: ${p.file}`);
    else if (p.status === 'ready') log(`pipeline ready (${p.task || ''} ${p.model || ''})`);
    else if (p.status === 'progress' && p.file) {
      files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
      const pct = Math.floor((p.progress || 0) / 25) * 25;
      if (pct > (pctLogged[p.file] ?? -1)) { pctLogged[p.file] = pct; log(`download ${p.file}: ${pct}% of ${((p.total || 0) / 1e6).toFixed(1)} MB`); }
      let loaded = 0, total = 0;
      for (const f of Object.values(files)) { loaded += f.loaded; total += f.total; }
      postMessage({ type: 'progress', loaded, total });
    }
  };
}

// Memory pools make WebAssembly memory grow further and it never shrinks; iOS kills pages that grow too much.
let tune = { session_options: { enableCpuMemArena: false, enableMemPattern: false } };
async function build(model, allowGpu) {
  const progress_callback = progressReporter();
  // iPhone Safari runs out of memory loading Whisper on the GPU, so it always uses WebAssembly.
  if (allowGpu && await hasWebGPU()) {
    try {
      log('creating pipeline on WebGPU');
      const p = await pipeline('automatic-speech-recognition', model, { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, progress_callback });
      device = 'webgpu';
      return p;
    } catch (e) { log(`WebGPU failed, using WebAssembly: ${e && e.message}`); }
  }
  log('creating pipeline on WebAssembly (q8, 1 thread)');
  const p = await pipeline('automatic-speech-recognition', model, { device: 'wasm', dtype: 'q8', progress_callback, ...tune });
  device = 'wasm';
  return p;
}

async function load(model, allowGpu = false) {
  if (asr && current === model) return;
  if (loading && loading.model === model) return loading.promise;
  const promise = (async () => {
    if (asr && asr.dispose) { try { await asr.dispose(); } catch (e) {} }
    asr = null;
    const t = performance.now();
    const p = await build(model, allowGpu);
    log(`pipeline created in ${((performance.now() - t) / 1000).toFixed(1)}s`);
    postMessage({ type: 'warming' });
    log('warm-up transcription (1 s of silence)');
    const t2 = performance.now();
    await p(new Float32Array(16000), { language: 'spanish', task: 'transcribe' });
    log(`warm-up done in ${((performance.now() - t2) / 1000).toFixed(1)}s`);
    asr = p; current = model;
  })();
  loading = { model, promise };
  try { await promise; } finally { loading = null; }
}

// Anything that escapes the handlers below still reaches the app with its real message.
self.addEventListener('unhandledrejection', e => postMessage({ type: 'error', message: `unhandled: ${String((e.reason && (e.reason.stack || e.reason.message)) || e.reason)}` }));
self.addEventListener('error', e => postMessage({ type: 'error', message: `uncaught: ${String(e.message || e)}` }));

self.onmessage = async ({ data }) => {
  try {
    if (data.tune) tune = data.tune;
    if (data.type === 'load') {
      log(`load ${data.model} (gpu allowed: ${!!data.allowGpu}, cores: ${navigator.hardwareConcurrency}, isolated: ${self.crossOriginIsolated === true})`);
      await load(data.model, !!data.allowGpu);
      postMessage({ type: 'ready', device, model: current });
    } else if (data.type === 'transcribe') {
      await load(data.model, !!data.allowGpu);
      const t = performance.now();
      log(`transcribe ${(data.audio.length / 16000).toFixed(1)}s of audio`);
      const out = await asr(data.audio, { language: 'spanish', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
      const text = String((out && out.text) || '').trim();
      log(`transcribed in ${((performance.now() - t) / 1000).toFixed(1)}s: "${text.slice(0, 80)}"`);
      postMessage({ type: 'result', id: data.id, text });
    }
  } catch (e) {
    log(`error: ${(e && (e.stack || e.message)) || e}`);
    postMessage({ type: 'error', id: data.id, message: String((e && e.message) || e) });
  }
};

log('worker started');
