// A small crash log. Each line is written to localStorage immediately, so it survives iOS killing the page.
const KEY = 'charla.log';
const MAX = 400;
const t0 = performance.now();

function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }

export function log(tag, msg) {
  const d = new Date();
  const line = `${d.toISOString().slice(11, 23)} +${((performance.now() - t0) / 1000).toFixed(1)}s [${tag}] ${msg}`;
  const lines = read();
  lines.push(line);
  try { localStorage.setItem(KEY, JSON.stringify(lines.slice(-MAX))); } catch (e) {}
}

export const getLog = () => read();
export function clearLog() { try { localStorage.removeItem(KEY); } catch (e) {} }

export async function envReport() {
  const n = navigator;
  const out = [
    `app build: ${document.querySelector('meta[name="build"]')?.content || 'dev'}`,
    `user agent: ${n.userAgent}`,
    `standalone: ${n.standalone === true || matchMedia('(display-mode: standalone)').matches}`,
    `cores: ${n.hardwareConcurrency || '?'} · device memory: ${n.deviceMemory || '?'} GB`,
    `cross-origin isolated: ${self.crossOriginIsolated === true}`,
    `WebAssembly: ${typeof WebAssembly === 'object'} · SIMD: ${wasmSimd()}`,
    `WebGPU: ${!!n.gpu}`,
    `service worker: ${n.serviceWorker && n.serviceWorker.controller ? 'active' : 'none'}`,
    `screen: ${screen.width}x${screen.height} @${devicePixelRatio}`
  ];
  try {
    const e = await n.storage.estimate();
    out.push(`storage: ${(e.usage / 1e6).toFixed(0)} MB used of ${(e.quota / 1e6).toFixed(0)} MB`);
    if (n.storage.persisted) out.push(`persistent storage: ${await n.storage.persisted()}`);
  } catch (e) {}
  try {
    const names = await caches.keys();
    for (const c of names) { const keys = await (await caches.open(c)).keys(); out.push(`cache "${c}": ${keys.length} files`); }
  } catch (e) {}
  return out;
}

function wasmSimd() {
  try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { return false; }
}

window.addEventListener('error', e => log('page', `error: ${e.message} at ${(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}`));
window.addEventListener('unhandledrejection', e => log('page', `unhandled rejection: ${(e.reason && (e.reason.stack || e.reason.message)) || e.reason}`));
document.addEventListener('visibilitychange', () => log('page', `visibility: ${document.visibilityState}`));
