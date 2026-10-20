// Microphone capture (raw PCM, resampled to 16 kHz for Whisper) and text-to-speech.
import { VARIANTS } from './data.js';

const TARGET_RATE = 16000;

export class Recorder {
  constructor() { this.stream = null; this.ctx = null; this.chunks = []; this.level = 0; this.analyser = null; this.started = 0; }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.6;
    // ScriptProcessor is deprecated but is the one capture path that behaves the same on every iOS version.
    const proc = this.ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = e => { this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    src.connect(this.analyser);
    src.connect(proc);
    proc.connect(this.ctx.destination);
    this.proc = proc;
    this.chunks = [];
    this.started = performance.now();
  }

  // 0..1 loudness for the waveform.
  meter(bins = 24) {
    if (!this.analyser) return new Array(bins).fill(0);
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    const out = [];
    const step = Math.floor(data.length / bins);
    for (let b = 0; b < bins; b++) {
      let sum = 0;
      for (let i = b * step; i < (b + 1) * step; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      out.push(Math.min(1, Math.sqrt(sum / step) * 4));
    }
    return out;
  }

  elapsed() { return this.started ? (performance.now() - this.started) / 1000 : 0; }

  async stop() {
    const rate = this.ctx ? this.ctx.sampleRate : 48000;
    const chunks = this.chunks;
    this.release();
    let len = 0; for (const c of chunks) len += c.length;
    const pcm = new Float32Array(len);
    let o = 0; for (const c of chunks) { pcm.set(c, o); o += c.length; }
    return { audio: resample(pcm, rate, TARGET_RATE), seconds: len / rate };
  }

  // Releasing the mic matters on iOS: while it is open, speech plays quietly through the earpiece.
  release() {
    try { this.proc && (this.proc.onaudioprocess = null); } catch (e) {}
    try { this.stream && this.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { this.ctx && this.ctx.close(); } catch (e) {}
    this.stream = null; this.ctx = null; this.analyser = null; this.proc = null; this.started = 0;
  }
}

function resample(input, from, to) {
  if (from === to) return input;
  const ratio = from / to;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  // Average over each source window: a cheap low-pass that keeps speech clean.
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio), end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0; for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

export function rms(audio) {
  let s = 0; for (let i = 0; i < audio.length; i++) s += audio[i] * audio[i];
  return Math.sqrt(s / Math.max(1, audio.length));
}

/* ---------- speech out ---------- */
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
const voiceListeners = new Set();
function loadVoices(notify = true) {
  if (!synth) return;
  try { voices = synth.getVoices().filter(v => /^es([-_]|$)/i.test(v.lang)); } catch (e) { voices = []; }
  if (notify) voiceListeners.forEach(f => f(voices));
}
if (synth) { const onChange = () => loadVoices(true); try { synth.addEventListener('voiceschanged', onChange); } catch (e) { synth.onvoiceschanged = onChange; } loadVoices(false); }

export const tts = {
  available: !!synth,
  voices: () => { if (!voices.length) loadVoices(false); return voices; },
  onVoices(f) { voiceListeners.add(f); },
  pick(variant, voiceURI) {
    const list = this.voices();
    if (voiceURI) { const v = list.find(x => x.voiceURI === voiceURI); if (v) return v; }
    for (const p of (VARIANTS[variant] || VARIANTS.es).prefs) {
      const c = list.filter(x => x.lang.replace('_', '-').toLowerCase() === p.toLowerCase());
      if (c.length) return c.find(x => /premium|enhanced|mejorad|natural|neural/i.test(x.name)) || c.find(x => x.localService) || c[0];
    }
    return list[0] || null;
  },
  speak(text, { variant = 'es', voice = '', rate = 1, onend } = {}) {
    if (!synth || !text) { onend && onend(); return; }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pick(variant, voice);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = (VARIANTS[variant] || VARIANTS.es).code;
      u.rate = rate;
      u.onend = () => onend && onend();
      u.onerror = () => onend && onend();
      synth.speak(u);
    } catch (e) { onend && onend(); }
  },
  stop() { try { synth && synth.cancel(); } catch (e) {} },
  // iOS only lets speech start from a tap; speaking a silent utterance inside one unlocks later calls.
  unlock() {
    if (!synth || this._unlocked) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); this._unlocked = true; } catch (e) {}
  }
};
