import { VARIANTS, SCENARIOS, SCENE_ICONS, SCENE_COLORS, TYPES, GROUPS, PRON, FALSE, GRAM, MODELS, STT_MODELS } from './data.js';
import { store, noteKey, today } from './store.js';
import { Recorder, tts, rms } from './audio.js';
import { loadStt, transcribe, onStt, sttState, takeCrashedModel } from './stt.js';
import * as claude from './claude.js';
import { log, getLog, clearLog, envReport } from './diag.js';
import { groqTranscribe, verifyGroqKey } from './groq.js';

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const str = x => typeof x === 'string' ? x.trim() : (x == null ? '' : String(x));
const arr = x => Array.isArray(x) ? x : [];
const S = store.settings;
const V = () => VARIANTS[S.variant] || VARIANTS.es;
const T = (x, v) => typeof x === 'function' ? x(v) : x;

const UI = {
  back: '<path d="M15 4.5L7.5 12l7.5 7.5"/>',
  play: '<path d="M7.5 5.3v13.4a.7.7 0 0 0 1.07.6l10.6-6.7a.7.7 0 0 0 0-1.2L8.57 4.7a.7.7 0 0 0-1.07.6z" fill="currentColor" stroke="none"/>',
  mic: '<rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>',
  keyboard: '<rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M6.5 9.5h.01M10 9.5h.01M13.5 9.5h.01M17 9.5h.01M7.5 14.5h9"/>',
  bulb: '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.8 10.6c.8.7 1.3 1.5 1.3 2.4h5c0-.9.5-1.7 1.3-2.4A6 6 0 0 0 12 3z"/>',
  up: '<path d="M12 19V5.5M5.5 12L12 5.5 18.5 12"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M5 9l7 7 7-7"/>',
  sparkles: '<path d="M11 3l1.6 4.4L17 9l-4.4 1.6L11 15l-1.6-4.4L5 9l4.4-1.6z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>',
  flame: '<path d="M12 21c-3.9 0-7-2.7-7-6.6 0-3.6 2.8-5.6 3.8-9.4.2-.7 1.1-.9 1.5-.3C12 7 15 8.2 15 11.5c.8-.6 1.3-1.6 1.4-2.6.1-.6.9-.8 1.2-.3 1 1.5 1.4 3.4 1.4 5.2C19 18.1 15.9 21 12 21z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  repeat: '<path d="M16.5 3.5l3 3-3 3"/><path d="M4.5 11.5V10a3.5 3.5 0 0 1 3.5-3.5h11.5M7.5 20.5l-3-3 3-3"/><path d="M19.5 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4.5"/>',
  tr: '<path d="M3.5 5.5h9M8 3.5v2M5.5 5.5c.6 3 2.6 5.4 5.6 6.4M10.5 5.5c-.6 3-2.6 5.4-5.6 6.4"/><path d="M12.5 20.5l3.8-9 3.8 9M13.8 17.5h5"/>',
  turtle: '<path d="M4 15.5c0-4 3.2-7 7.5-7s7.5 3 7.5 7z"/><path d="M19 13.5h1.5a1.5 1.5 0 0 0 0-3H19M6.5 15.5l-1 3M16.5 15.5l1 3M3 15.5h17"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z"/>',
  book: '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12H8.5A3.5 3.5 0 0 1 5 16.5z"/><path d="M5 16.5A3.5 3.5 0 0 1 8.5 13H19"/>',
  wave: '<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>',
  gear: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  cards: '<rect x="3.5" y="6.5" width="12.5" height="14" rx="2.5"/><path d="M8 3.5h10a2.5 2.5 0 0 1 2.5 2.5v11"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7.5 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1.5"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M13.5 9.5l2 2"/>',
  voice: '<path d="M5 10v4M9 7v10M13 9.5v5M17 6v12"/>'
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${UI[n] || ''}</svg>`;
const sceneVars = id => { const [a, b] = SCENE_COLORS[id] || SCENE_COLORS.custom; return `--c1:${a};--c2:${b}`; };
const sceneIco = id => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${SCENE_ICONS[id] || SCENE_ICONS.custom}</svg>`;
$$('[data-ui]').forEach(el => { el.outerHTML = ico(el.dataset.ui); });

const ERR = {
  auth: 'Your Claude API key was rejected. Check it in Ajustes.',
  nokey: 'Add your Claude API key in Ajustes first.',
  permission: "This API key can't use that model. Pick another model in Ajustes.",
  model: "That model isn't available on your account. Pick another one in Ajustes.",
  rate: 'Too many requests at once. Wait a few seconds and try again.',
  credit: 'Your Anthropic account is out of credit. Add some at console.anthropic.com.',
  overloaded: 'Claude is busy right now. Try again in a moment.',
  network: 'No connection. Check your internet and try again.',
  refused: "Claude didn't answer that one. Try saying it another way.",
  format: 'The reply came back incomplete. Try again.',
  cancelled: 'Detenido.'
};
const errText = (code, msg) => ERR[code] || `Something went wrong${msg ? `: ${msg}` : '.'}`;

/* ---------- state ---------- */
const state = {
  tab: 'home', chat: null, busy: false, ctl: null, streaming: null,
  inputMode: 'voice', recMode: 'idle', recFor: null, rec: null, raf: 0, pressAt: 0,
  trOpen: new Set(), fbOpen: new Set(), nbSeg: 'mistake', nbFilter: 'all',
  drill: null, cards: null, confirm: null, obStep: 0
};

/* ---------- theme, viewport ---------- */
function applyTheme() {
  if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', S.theme);
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#000000' : '#F2F2F7');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
const vv = window.visualViewport;
function fitViewport() {
  document.documentElement.style.setProperty('--app-h', `${vv ? vv.height : window.innerHeight}px`);
  if (vv && vv.offsetTop > 0) window.scrollTo(0, 0);
}
if (vv) { vv.addEventListener('resize', fitViewport); vv.addEventListener('scroll', fitViewport); }
window.addEventListener('resize', fitViewport);
fitViewport();

/* ---------- toast & sheet ---------- */
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
let sheetOnClose = null;
function openSheet(html, { onClose = null, tall = false } = {}) {
  const layer = $('#sheetLayer');
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.toggle('tall', tall);
  layer.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('open')));
  sheetOnClose = onClose;
}
function closeSheet() {
  const layer = $('#sheetLayer');
  if (layer.hidden) return;
  layer.classList.remove('open');
  $('#sheet').style.transform = '';
  const cb = sheetOnClose; sheetOnClose = null;
  if (cb) cb();
  setTimeout(() => { if (!layer.classList.contains('open')) { layer.hidden = true; $('#sheetBody').innerHTML = ''; } }, 320);
}
// Drag the grabber down to dismiss.
(() => {
  let y0 = null, dy = 0;
  const sheet = $('#sheet');
  sheet.addEventListener('pointerdown', e => { if (!e.target.closest('.grab')) return; y0 = e.clientY; dy = 0; sheet.style.transition = 'none'; sheet.setPointerCapture(e.pointerId); });
  sheet.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
  const end = () => { if (y0 == null) return; y0 = null; sheet.style.transition = ''; if (dy > 110) closeSheet(); else sheet.style.transform = ''; };
  sheet.addEventListener('pointerup', end); sheet.addEventListener('pointercancel', end);
})();
const sheetHead = (title, sub = '') => `<div class="grab"></div><div class="sheet-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="circle-btn" data-act="sheet-close" aria-label="Cerrar">${ico('x')}</button></div>`;

/* ---------- tabs ---------- */
function showTab(tab) {
  state.tab = tab;
  $$('.page').forEach(p => { p.hidden = p.id !== 'page-' + tab; });
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  ({ home: renderHome, notebook: renderNotebook, guide: renderGuide, settings: renderSettings })[tab]();
  const sc = $(`#page-${tab} .page-scroll`); if (sc) sc.scrollTop = 0;
}
// Large titles collapse into the bar as you scroll, like iOS.
$$('.page').forEach(page => {
  const sc = $('.page-scroll', page), nav = $('.nav-compact', page);
  sc.addEventListener('scroll', () => nav.classList.toggle('show', sc.scrollTop > 44), { passive: true });
});

/* ---------- home ---------- */
function greeting() {
  const h = new Date().getHours();
  return h >= 6 && h < 14 ? 'Buenos días' : h >= 14 && h < 21 ? 'Buenas tardes' : 'Buenas noches';
}
function ago(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'ahora';
  if (d < 3600) return `hace ${Math.floor(d / 60)} min`;
  if (d < 86400) return `hace ${Math.floor(d / 3600)} h`;
  if (d < 172800) return 'ayer';
  if (d < 604800) return `hace ${Math.floor(d / 86400)} días`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
function isStandalone() { return window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; }
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function renderHome() {
  const v = V();
  $('#homeEyebrow').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#homeTitle').textContent = greeting();
  const streak = store.streak();
  const day = store.stats.days[today()] || { secs: 0 };
  let total = 0, ok = 0;
  for (const c of store.chats) for (const m of arr(c.messages)) if (m.role === 'me' && m.feedback) { total++; if (m.feedback.ok) ok++; }
  const mins = Math.round((day.secs || 0) / 60);
  const recent = store.chats.filter(c => arr(c.messages).length).slice(0, 8);
  const mistakes = store.notebook.filter(n => n.kind === 'mistake').length;

  $('#homeBody').innerHTML = `
    ${isIOS && !isStandalone() ? `<div class="install card"><span class="install-ico">${ico('share')}</span><div><strong>Install Charla on your iPhone</strong><p>Tap Share ${ico('share', 'inline')} in Safari, then <b>Add to Home Screen</b>. It then opens full screen like an app.</p></div></div>` : ''}
    <section class="hero" style="${sceneVars('libre')}">
      <button class="hero-main" data-act="start" data-scn="libre">
        <span class="hero-orb">${ico('mic')}</span>
        <span class="hero-text"><span class="hero-k">Empieza a hablar</span><span class="hero-t">Charla libre con ${esc(v.a)}</span><span class="hero-s">A coffee and any topic. Just talk.</span></span>
      </button>
      <div class="hero-stats">
        <span class="hstat">${ico('flame')}<b>${streak}</b> ${streak === 1 ? 'día' : 'días'} seguidos</span>
        <span class="hstat">${ico('clock')}<b>${mins}</b> min hoy</span>
        ${total ? `<span class="hstat">${ico('target')}<b>${Math.round(ok / total * 100)}%</b> sin errores</span>` : ''}
      </div>
    </section>
    ${recent.length ? `<section class="sec"><div class="sec-head"><h2>Continuar</h2></div>
      <div class="hscroll">${recent.map(c => {
        const last = [...c.messages].reverse().find(m => m.role === 'ai');
        return `<div class="recent card" style="${sceneVars(c.scn)}">
          <button class="recent-open" data-act="open-chat" data-id="${esc(c.id)}">
            <span class="recent-top"><span class="avatar sm">${esc((c.who || '?')[0])}</span><span class="recent-meta"><b>${esc(c.title)}</b><span>${esc(ago(c.updatedAt))}</span></span></span>
            <span class="recent-last">${esc(last ? last.text : '')}</span>
          </button>
          <button class="recent-del" data-act="del-chat" data-id="${esc(c.id)}" aria-label="Borrar">${ico('x')}</button>
        </div>`;
      }).join('')}</div></section>` : ''}
    <section class="sec"><div class="sec-head"><h2>Situaciones</h2><span class="sec-note">${esc(v.label)} · ${esc(S.level)}</span></div>
      <div class="tiles">${SCENARIOS.filter(s => s.id !== 'libre').map(s => `
        <button class="tile" data-act="start" data-scn="${s.id}" style="${sceneVars(s.id)}">
          <span class="tile-ico">${sceneIco(s.id)}</span>
          <span class="tile-title">${esc(T(s.title, v))}</span>
          <span class="tile-sub">${esc(s.en)}</span>
          <span class="tile-meta">${esc(v[s.who])} · ${esc(s.role(v))}</span>
        </button>`).join('')}</div>
    </section>
    <section class="sec">
      <div class="group">
        <button class="row-item" data-act="custom"><span class="row-ico" style="${sceneVars('custom')}">${sceneIco('custom')}</span><span class="row-text"><b>Tu propia situación</b><span>Describe any scene and play it out</span></span>${ico('chev', 'row-chev')}</button>
        <button class="row-item" data-act="review-all" ${mistakes ? '' : 'disabled'}><span class="row-ico" style="${sceneVars('repaso')}">${sceneIco('repaso')}</span><span class="row-text"><b>Repasar mis errores</b><span>${mistakes ? `A chat built around your last ${Math.min(10, mistakes)} mistakes` : 'Your mistakes will show up here after a chat'}</span></span>${ico('chev', 'row-chev')}</button>
      </div>
    </section>`;
}

/* ---------- chat ---------- */
function openChat(chat, push = true) {
  state.chat = chat; state.trOpen = new Set(); state.fbOpen = new Set();
  const last = [...chat.messages].reverse().find(m => m.role === 'me' && m.feedback && !m.feedback.ok);
  if (last) state.fbOpen.add(last.ts);
  $('#chatName').textContent = chat.who;
  $('#chatRole').textContent = `${chat.role} · ${(VARIANTS[chat.variant] || VARIANTS.es).label}`;
  const av = $('#chatAvatar'); av.textContent = (chat.who || '?')[0]; av.setAttribute('style', sceneVars(chat.scn));
  state.inputMode = 'voice'; state.recMode = 'idle';
  hideSuggest();
  $('#chat').classList.add('open'); $('#tabs').classList.add('pushed');
  $('#chat').setAttribute('aria-hidden', 'false');
  if (push) history.pushState({ chat: chat.id }, '');
  renderChat(); renderDock();
}
function leaveChat(fromPop = false) {
  if (state.ctl) { try { state.ctl.abort(); } catch (e) {} }
  if (state.rec) { state.rec.release(); state.rec = null; cancelAnimationFrame(state.raf); }
  tts.stop();
  state.chat = null; state.busy = false; state.recMode = 'idle';
  $('#chat').classList.remove('open'); $('#tabs').classList.remove('pushed');
  $('#chat').setAttribute('aria-hidden', 'true');
  if (!fromPop && history.state && history.state.chat) history.back();
  if (state.tab === 'home') renderHome();
}
window.addEventListener('popstate', () => {
  if (!$('#sheetLayer').hidden) closeSheet();
  if (state.chat) leaveChat(true);
});

function startChat(id, opts = {}) {
  if (!S.apiKey) { toast(errText('nokey')); showTab('settings'); return; }
  tts.unlock();
  const v = V();
  let title, who, role, scene, scn = id;
  if (id === 'custom') {
    title = opts.text.length > 40 ? opts.text.slice(0, 38).trim() + '…' : opts.text; who = v.a; role = 'tu escena';
    scene = `Role-play this situation the learner described: «${opts.text}». Play the other person. If you need a name, use ${v.a} (a woman) or ${v.b} (a man). Set it in ${v.city} unless the situation says otherwise, and use the register that fits.`;
  } else if (id === 'repaso') {
    title = 'Repaso'; who = v.a; role = 'repaso';
    scene = `You are ${v.a}, a friendly woman ${v.from} chatting with the learner, who is reviewing mistakes they made before. Pick a light everyday topic and steer the conversation so the learner naturally needs the following words and structures, one or two at a time, without turning it into a quiz or mentioning the list:\n${opts.lines}\nInformal (${v.tu}).`;
  } else {
    const s = SCENARIOS.find(x => x.id === id); if (!s) return;
    title = T(s.title, v); who = v[s.who]; role = s.role(v); scene = s.scene(v);
  }
  const chat = { id: rid(), scn, title, who, role, variant: S.variant, scene, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  openChat(chat);
  runTurn(null);
}

function normTurn(r, original) {
  if (!r || typeof r.reply !== 'string' || !r.reply.trim()) throw new claude.ClaudeError('format');
  const f = r.feedback || {};
  const issues = arr(f.issues).filter(i => i && (str(i.right) || str(i.note))).slice(0, 8)
    .map(i => ({ wrong: str(i.wrong), right: str(i.right), type: TYPES[i.type] ? i.type : 'grammar', note: str(i.note) }));
  const corrected = str(f.corrected) || original;
  const ok = !issues.length;
  return {
    reply: r.reply.trim(), translation: str(r.translation),
    feedback: { ok, corrected, natural: str(f.natural), issues },
    pron: arr(r.pron).filter(p => p && p.word).slice(0, 2).map(p => ({ word: str(p.word), tip: str(p.tip) })),
    words: arr(r.words).filter(w => w && w.es).slice(0, 3).map(w => ({ es: str(w.es), meaning: str(w.meaning) }))
  };
}

async function runTurn(msg) {
  const chat = state.chat; if (!chat) return;
  if (msg) msg.failed = null; else chat.openFailed = null;
  state.busy = true; state.streaming = { text: '' }; state.ctl = new AbortController();
  renderChat(); renderDock();
  let spoken = false;
  const say = t => { if (!spoken && S.autoplay && state.chat === chat) { spoken = true; speak(t); } };
  try {
    const r = await claude.streamTurn({
      apiKey: S.apiKey, model: S.model, chat, settings: S, signal: state.ctl.signal,
      onReply: (t, done) => { if (!state.streaming) return; state.streaming.text = t; updateStreaming(); if (done) say(t); }
    });
    const n = normTurn(r, msg ? msg.text : '');
    if (msg) { msg.feedback = n.feedback; autoSaveMistakes(msg, chat); if (!n.feedback.ok) state.fbOpen.add(msg.ts); }
    chat.messages.push({ role: 'ai', text: n.reply, translation: n.translation, pron: n.pron, words: n.words, ts: Date.now() });
    say(n.reply);
  } catch (e) {
    const code = e.code || 'unknown';
    log('claude', `turn failed: ${code} ${e.message || ''}`);
    if (msg) { msg.failed = code; msg.err = e.message; } else { chat.openFailed = code; chat.openErr = e.message; }
  } finally {
    state.busy = false; state.streaming = null; state.ctl = null;
    store.saveChat(chat);
    if (state.chat === chat) { renderChat(); renderDock(); }
  }
}

function sendMessage(text, { typed = false, secs = 0 } = {}) {
  const chat = state.chat; text = str(text);
  if (!chat || state.busy || !text) return;
  tts.unlock();
  chat.messages = chat.messages.filter(m => m.role === 'ai' || !m.failed);
  const msg = { role: 'me', text, typed, secs: Math.round(secs), ts: Date.now() };
  chat.messages.push(msg);
  if (typed) store.logMessage();
  hideSuggest();
  runTurn(msg);
}

function autoSaveMistakes(msg, chat) {
  const fb = msg.feedback; if (!fb || fb.ok) return;
  const have = new Set(store.notebook.map(noteKey));
  const items = [];
  for (const i of fb.issues) {
    if (i.type === 'accent' || !i.right) continue;
    const it = { id: rid(), kind: 'mistake', type: i.type, wrong: i.wrong, right: i.right, note: i.note, context: msg.text, fixed: fb.corrected, scene: chat.title, createdAt: Date.now() };
    const k = noteKey(it); if (have.has(k)) continue; have.add(k); items.push(it);
  }
  store.addNotes(items);
}

function speak(text, rate) {
  tts.speak(text, { variant: (state.chat && state.chat.variant) || S.variant, voice: S.voice, rate: rate || Number(S.rate) || 1 });
}

/* chat rendering */
function diffIns(a, b) {
  const A = a.trim().split(/\s+/), B = b.trim().split(/\s+/);
  const nrm = t => t.toLowerCase().replace(/[.,;:!?¡¿"«»()]/g, '');
  if (A.length * B.length > 40000) return esc(b);
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = nrm(A[i]) === nrm(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Array(m).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) { if (nrm(A[i]) === nrm(B[j])) { keep[j] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  const out = []; let run = [];
  B.forEach((t, k) => { if (keep[k]) { if (run.length) { out.push(`<ins>${esc(run.join(' '))}</ins>`); run = []; } out.push(esc(t)); } else run.push(t); });
  if (run.length) out.push(`<ins>${esc(run.join(' '))}</ins>`);
  return out.join(' ');
}
function markWrong(text, issues) {
  const low = text.toLowerCase(), ranges = [];
  for (const it of issues) {
    const w = str(it.wrong).toLowerCase(); if (!w) continue;
    let idx = low.indexOf(w);
    while (idx !== -1 && ranges.some(r => idx < r[1] && idx + w.length > r[0])) idx = low.indexOf(w, idx + 1);
    if (idx !== -1) ranges.push([idx, idx + w.length]);
  }
  ranges.sort((x, y) => x[0] - y[0]);
  let out = '', pos = 0;
  for (const [a, b] of ranges) { out += esc(text.slice(pos, a)) + `<span class="bad">${esc(text.slice(a, b))}</span>`; pos = b; }
  return out + esc(text.slice(pos));
}
const typeChip = t => { const d = TYPES[t] || TYPES.grammar; return `<span class="type ${d[1]}">${esc(d[0])}</span>`; };

function aiRow(m, i, saved) {
  const open = state.trOpen.has(m.ts);
  return `<div class="row ai">
    <div class="bubble ai" lang="es">${esc(m.text)}</div>
    <div class="acts">
      ${tts.available ? `<button class="act" data-act="play" data-i="${i}" aria-label="Escuchar">${ico('play')}</button><button class="act" data-act="slow" data-i="${i}" aria-label="Escuchar despacio">${ico('turtle')}</button>` : ''}
      ${m.translation ? `<button class="act ${open ? 'on' : ''}" data-act="tr" data-i="${i}" aria-label="Traducir">${ico('tr')}</button>` : ''}
      <button class="act wide" data-act="repeat-ai" data-i="${i}">${ico('repeat')}Repite</button>
    </div>
    ${open ? `<p class="tr">${esc(m.translation)}</p>` : ''}
    ${arr(m.pron).length || arr(m.words).length ? `<div class="extras">
      ${arr(m.pron).map(p => `<button class="xchip xpron" data-act="word" data-text="${esc(p.word)}">${ico('voice')}<span><b lang="es">${esc(p.word)}</b><small>${esc(p.tip)}</small></span></button>`).join('')}
      ${arr(m.words).map(w => `<div class="xchip word"><span><b lang="es">${esc(w.es)}</b><small>${esc(w.meaning)}</small></span>${saved.has(w.es.toLowerCase()) ? `<span class="saved">${ico('check')}</span>` : `<button class="mini" data-act="save-word" data-es="${esc(w.es)}" data-meaning="${esc(w.meaning)}" aria-label="Guardar">${ico('plus')}</button>`}</div>`).join('')}
    </div>` : ''}
  </div>`;
}
function meRow(m, i) {
  const fb = m.feedback;
  const body = fb && !fb.ok ? markWrong(m.text, fb.issues) : esc(m.text);
  let under = '';
  if (m.failed) under = `<div class="fb-err"><span>${esc(errText(m.failed, m.err))}</span>${m.failed !== 'auth' && m.failed !== 'nokey' ? `<button class="pill-btn" data-act="retry" data-i="${i}">Reintentar</button>` : `<button class="pill-btn" data-act="goto-settings">Ajustes</button>`}</div>`;
  else if (fb && fb.ok && !fb.natural) under = `<div class="fb-ok">${ico('check')}Perfecto</div>`;
  else if (fb && fb.ok) under = `<div class="fb-card ok"><div class="fb-nat"><span class="lbl">${ico('check')} Correcto · más natural</span><p lang="es">${esc(fb.natural)}</p><div class="fb-tools">${tts.available ? `<button class="act" data-act="say" data-text="${esc(fb.natural)}" aria-label="Escuchar">${ico('play')}</button>` : ''}<button class="act wide" data-act="repeat" data-text="${esc(fb.natural)}">${ico('repeat')}Repite</button></div></div></div>`;
  else if (fb) {
    const n = fb.issues.length, open = state.fbOpen.has(m.ts);
    under = `<div class="fb-card ${open ? 'open' : ''}">
      <button class="fb-head" data-act="fb-toggle" data-ts="${m.ts}" aria-expanded="${open}"><span class="fb-dot"></span><span class="fb-count">${n} ${n === 1 ? 'corrección' : 'correcciones'}</span>${open ? '' : `<span class="fb-peek" lang="es">${esc(fb.corrected)}</span>`}${ico('down', 'fb-chev')}</button>
      ${open ? `<div class="fb-body">
        <div class="fb-fix"><span class="lbl">Mejor así</span><p lang="es">${diffIns(m.text, fb.corrected)}</p>
          <div class="fb-tools">${tts.available ? `<button class="act" data-act="say" data-text="${esc(fb.corrected)}" aria-label="Escuchar">${ico('play')}</button>` : ''}<button class="act wide" data-act="repeat" data-text="${esc(fb.corrected)}">${ico('repeat')}Repite</button></div></div>
        <ul class="issues">${fb.issues.map(x => `<li>${typeChip(x.type)}${x.right ? `<div class="swap" lang="es">${x.wrong ? `<s>${esc(x.wrong)}</s><span class="arrow">→</span>` : ''}<b>${esc(x.right)}</b></div>` : ''}${x.note ? `<p class="note">${esc(x.note)}</p>` : ''}</li>`).join('')}</ul>
        ${fb.natural ? `<div class="fb-nat"><span class="lbl">Más natural</span><p lang="es">${esc(fb.natural)}</p>${tts.available ? `<div class="fb-tools"><button class="act" data-act="say" data-text="${esc(fb.natural)}" aria-label="Escuchar">${ico('play')}</button></div>` : ''}</div>` : ''}
      </div>` : ''}
    </div>`;
  }
  return `<div class="row me"><div class="bubble me" lang="es">${body}</div>${m.typed ? '' : `<span class="via">${ico('voice')} ${m.secs ? m.secs + ' s' : 'voz'}</span>`}${under}</div>`;
}
function summaryCard(sm, saved) {
  return `<section class="summary card">
    <div class="sum-top"><span class="sum-ico">${ico('sparkles')}</span><div><h3>Resumen</h3>${sm.level ? `<span class="lvl">Nivel estimado <b>${esc(sm.level)}</b></span>` : ''}</div></div>
    <p class="sum-lede">${esc(sm.headline)}</p>
    ${sm.strengths.length ? `<h4>Lo que hiciste bien</h4><ul class="sum-list good">${sm.strengths.map(x => `<li>${ico('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
    ${sm.work_on.length ? `<h4>Para trabajar</h4><ul class="sum-list work">${sm.work_on.map(w => `<li><b>${esc(w.pattern)}</b><span>${esc(w.tip)}</span>${w.example ? `<em lang="es">${esc(w.example)}</em>` : ''}</li>`).join('')}</ul>` : ''}
    ${sm.phrases.length ? `<h4>Frases para llevarte</h4><ul class="sum-list phr">${sm.phrases.map(p => `<li><div><b lang="es">${esc(p.es)}</b><span>${esc(p.meaning)}</span></div>
      ${tts.available ? `<button class="act" data-act="say" data-text="${esc(p.es)}" aria-label="Escuchar">${ico('play')}</button>` : ''}
      ${saved.has(p.es.toLowerCase()) ? `<span class="saved">${ico('check')}</span>` : `<button class="act" data-act="save-word" data-es="${esc(p.es)}" data-meaning="${esc(p.meaning)}" aria-label="Guardar">${ico('plus')}</button>`}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function renderChat(stick = true) {
  const c = state.chat; if (!c) return;
  const saved = new Set(store.notebook.filter(n => n.kind === 'word').map(n => str(n.es).toLowerCase()));
  const sc = SCENARIOS.find(s => s.id === c.scn);
  const out = [`<div class="scene-banner" style="${sceneVars(c.scn)}"><span class="tile-ico sm">${sceneIco(c.scn)}</span><div><b>${esc(c.title)}</b><span>${esc(sc ? sc.en : c.scn === 'repaso' ? 'Reuse what you got wrong before.' : 'Your own scene.')}</span></div></div>`];
  c.messages.forEach((m, i) => {
    out.push(m.role === 'ai' ? aiRow(m, i, saved) : meRow(m, i));
    if (c.summary && c.summaryAt === i + 1) out.push(summaryCard(c.summary, saved));
  });
  if (!c.messages.length && !state.busy && c.openFailed) out.push(`<div class="fb-err center"><span>${esc(errText(c.openFailed, c.openErr))}</span><button class="pill-btn" data-act="retry-open">Reintentar</button></div>`);
  if (state.busy === 'summary') out.push(`<div class="row ai"><div class="bubble ai typing"><span class="dots"><i></i><i></i><i></i></span><span class="typing-l">Preparando tu resumen…</span></div></div>`);
  else if (state.busy) out.push(`<div class="row ai" id="streamRow"><div class="bubble ai ${state.streaming && state.streaming.text ? 'streaming' : 'typing'}" id="streamBubble" lang="es">${state.streaming && state.streaming.text ? esc(state.streaming.text) : '<span class="dots"><i></i><i></i><i></i></span>'}</div></div>`);
  if (c.summaryErr && !state.busy) out.push(`<div class="fb-err center"><span>${esc(errText(c.summaryErr))}</span><button class="pill-btn" data-act="summary">Reintentar</button></div>`);
  const box = $('#chatScroll'), top = box.scrollTop;
  $('#chatList').innerHTML = out.join('');
  box.scrollTop = stick ? box.scrollHeight : top;
}
function updateStreaming() {
  const b = $('#streamBubble'); if (!b || !state.streaming) return;
  b.classList.remove('typing'); b.classList.add('streaming');
  b.textContent = state.streaming.text;
  const box = $('#chatScroll'); box.scrollTop = box.scrollHeight;
}

/* dock: voice-first input */
function renderDock() {
  const d = $('#dock');
  if (!state.chat) return;
  if (state.inputMode === 'text') {
    const keep = $('#kbdInput') ? $('#kbdInput').value : '';
    d.innerHTML = `<div class="dock-kbd">
      <button class="circle-btn" data-act="mode-voice" aria-label="Hablar">${ico('mic')}</button>
      <textarea id="kbdInput" rows="1" lang="es" enterkeyhint="send" placeholder="Escribe en español…" aria-label="Tu mensaje"></textarea>
      <button class="send-btn" data-act="send-typed" aria-label="Enviar" ${state.busy ? 'disabled' : ''}>${ico('up')}</button>
    </div>`;
    const t = $('#kbdInput'); t.value = keep; autosize(t);
    return;
  }
  const rec = state.recMode === 'recording' && state.recFor === 'chat';
  const tx = state.recMode === 'transcribing' && state.recFor === 'chat';
  const hint = rec ? 'Toca para enviar · mantén pulsado para hablar'
    : tx ? 'Transcribiendo…'
    : state.busy ? `${esc(state.chat.who)} está respondiendo…`
    : sttState.status === 'downloading' ? `Preparando la voz… ${pct()}%`
    : 'Toca para hablar';
  d.innerHTML = `
    <div class="wave ${rec ? 'live' : ''}" id="wave">${'<i></i>'.repeat(28)}</div>
    <div class="dock-voice">
      ${rec ? `<button class="circle-btn" data-act="rec-cancel" aria-label="Cancelar">${ico('x')}</button>` : `<button class="circle-btn" data-act="mode-text" aria-label="Escribir">${ico('keyboard')}</button>`}
      <button class="orb ${rec ? 'rec' : ''} ${tx ? 'busy' : ''} ${state.busy ? 'wait' : ''}" id="orb" data-mic="chat" aria-label="${rec ? 'Enviar' : state.busy ? 'Detener' : 'Hablar'}">
        <span class="orb-ring"></span>${tx ? '<span class="spin"></span>' : state.busy ? ico('stop') : rec ? ico('up') : ico('mic')}
      </button>
      ${rec ? `<span class="rec-time" id="recTime">0:00</span>` : `<button class="circle-btn" data-act="ideas" aria-label="Ideas para responder" ${state.busy ? 'disabled' : ''}>${ico('bulb')}</button>`}
    </div>
    <p class="dock-hint">${hint}</p>`;
}
function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }
const pct = () => sttState.total ? Math.round(sttState.loaded / sttState.total * 100) : 0;

/* microphone */
function sttUsable() {
  if (S.sttEngine === 'groq') { if (S.groqKey) return true; openGroqSheet(); return false; }
  if (sttState.status === 'ready' || sttState.status === 'warming') return true;
  if (sttState.status === 'downloading' && S.sttReady) return true; // loading from cache: transcribe waits for it
  openVoiceSheet();
  return false;
}
async function transcribeAny(audio) {
  if (S.sttEngine === 'groq' && S.groqKey) {
    try { return await groqTranscribe(audio, S.groqKey); }
    catch (e) {
      // If Groq can't be reached but the on-device model is loaded, use it for this message.
      if ((e.code === 'network' || e.code === 'server') && sttState.status === 'ready') { log('stt', `Groq ${e.code}; using the on-device model`); return transcribe(audio, S.sttModel); }
      e.shown = true;
      toast(e.code === 'auth' ? 'Groq rejected your key. Check it in Ajustes.'
        : e.code === 'rate' ? "You've hit Groq's free limit for now. Try again in a minute."
        : e.code === 'network' ? "Couldn't reach Groq. Check your connection and try again."
        : 'Groq had a problem. Try again in a moment.', 4000);
      throw e;
    }
  }
  return transcribe(audio, S.sttModel);
}
async function startRec(target) {
  if (state.recMode !== 'idle') return;
  if (!sttUsable()) return;
  tts.stop(); tts.unlock();
  const rec = new Recorder();
  try { await rec.start(); log('mic', `recording for ${target}`); }
  catch (e) {
    log('mic', `could not start: ${e && (e.name + ' ' + e.message)}`);
    openSheet(`${sheetHead('Microphone blocked')}<p class="sheet-p">Charla needs the microphone to hear you. When iOS asks, tap <b>Allow</b>. If you said no before, open <b>Settings › Apps › Safari › Microphone</b> and choose <b>Ask</b> or <b>Allow</b>, then try again.</p>`);
    return;
  }
  state.rec = rec; state.recMode = 'recording'; state.recFor = target;
  target === 'chat' ? renderDock() : renderDrill();
  const tick = () => {
    if (!state.rec) return;
    const lv = state.rec.meter(28);
    const bars = $$('#wave i, #drillWave i');
    bars.forEach((b, k) => { b.style.transform = `scaleY(${0.12 + lv[k % lv.length] * 0.88})`; });
    const orb = $(target === 'chat' ? '#orb' : '#drillOrb');
    if (orb) orb.style.setProperty('--lv', (lv.reduce((a, b) => a + b, 0) / lv.length).toFixed(3));
    const t = state.rec.elapsed(), el = $('#recTime');
    if (el) el.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    if (t > 60) { stopRec(true); return; }
    state.raf = requestAnimationFrame(tick);
  };
  state.raf = requestAnimationFrame(tick);
}
async function stopRec(send) {
  const rec = state.rec, target = state.recFor; if (!rec) return;
  state.rec = null; cancelAnimationFrame(state.raf);
  const { audio, seconds } = await rec.stop();
  const rerender = () => target === 'chat' ? renderDock() : renderDrill();
  if (!send) { state.recMode = 'idle'; rerender(); return; }
  if (seconds < 0.5 || rms(audio) < 0.003) { state.recMode = 'idle'; rerender(); toast("I couldn't hear you. Hold the phone closer and try again."); return; }
  state.recMode = 'transcribing'; rerender();
  let text = '';
  try { text = await transcribeAny(audio); }
  catch (e) { log('stt', `transcribe failed: ${e && e.message}`); if (!e.shown) toast('Speech recognition failed. Try again, or switch to typing.'); }
  state.recMode = 'idle';
  if (target === 'chat') {
    renderDock();
    if (text) { store.logSpeech(seconds); sendMessage(text, { secs: seconds }); }
    else toast("I didn't catch any words. Try again a little slower.");
  } else if (state.drill) {
    if (text) { store.logSpeech(seconds); state.drill.heard = text; state.drill.score = scoreRepeat(state.drill.target, text); }
    else toast("I didn't catch any words. Try again a little slower.");
    renderDrill();
  }
}
// Tap to start and tap again to send, or press and hold like a walkie-talkie.
document.addEventListener('pointerdown', e => {
  const orb = e.target.closest('[data-mic]'); if (!orb) return;
  e.preventDefault();
  const target = orb.dataset.mic;
  if (target === 'chat' && state.busy) { if (state.ctl) state.ctl.abort(); return; }
  if (state.recMode === 'recording') { stopRec(true); return; }
  if (state.recMode !== 'idle') return;
  state.pressAt = performance.now();
  startRec(target);
});
document.addEventListener('pointerup', e => {
  if (!e.target.closest('[data-mic]') || state.recMode !== 'recording' || !state.pressAt) return;
  const held = performance.now() - state.pressAt;
  state.pressAt = 0;
  if (held > 450) stopRec(true);
});

/* pronunciation drill */
const normWords = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
function scoreRepeat(target, heard) {
  const disp = target.split(/\s+/).filter(Boolean);
  const A = disp.map(w => normWords(w).join('')), B = normWords(heard);
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] && A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] && A[i] === B[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  const counted = A.filter(Boolean).length || 1;
  return { words: disp.map((w, k) => ({ w, ok: hit[k] || !A[k] })), pct: Math.round(hit.filter(Boolean).length / counted * 100) };
}
function openRepeat(target) {
  state.drill = { target: str(target), heard: '', score: null };
  openSheet('<div id="drillBox"></div>', { onClose: () => { if (state.rec && state.recFor === 'drill') { state.rec.release(); state.rec = null; state.recMode = 'idle'; cancelAnimationFrame(state.raf); } state.drill = null; } });
  renderDrill();
}
function renderDrill() {
  const box = $('#drillBox'), d = state.drill; if (!box || !d) return;
  const rec = state.recMode === 'recording' && state.recFor === 'drill';
  const tx = state.recMode === 'transcribing' && state.recFor === 'drill';
  const sc = d.score;
  const verdict = !sc ? '' : sc.pct >= 90 ? '¡Perfecto!' : sc.pct >= 70 ? '¡Muy bien!' : sc.pct >= 40 ? 'Casi. Otra vez.' : 'Escucha y repite despacio.';
  box.innerHTML = `${sheetHead('Repite', 'Listen, then say it out loud.')}
    <div class="drill-target" lang="es">${sc ? sc.words.map(x => `<span class="${x.ok ? 'hit' : 'miss'}">${esc(x.w)}</span>`).join(' ') : esc(d.target)}</div>
    ${tts.available ? `<div class="drill-listen"><button class="pill-btn" data-act="say" data-text="${esc(d.target)}">${ico('play')}Escuchar</button><button class="pill-btn" data-act="say-slow" data-text="${esc(d.target)}">${ico('turtle')}Despacio</button></div>` : ''}
    ${sc ? `<div class="drill-result"><div class="ring" style="--p:${sc.pct}"><span>${sc.pct}<small>%</small></span></div><div><b>${verdict}</b><p>What I heard: <span lang="es">«${esc(d.heard)}»</span></p></div></div>` : ''}
    <div class="wave ${rec ? 'live' : ''}" id="drillWave">${'<i></i>'.repeat(28)}</div>
    <div class="drill-mic"><button class="orb ${rec ? 'rec' : ''} ${tx ? 'busy' : ''}" id="drillOrb" data-mic="drill" aria-label="${rec ? 'Terminar' : 'Hablar'}"><span class="orb-ring"></span>${tx ? '<span class="spin"></span>' : rec ? ico('check') : ico('mic')}</button></div>
    <p class="dock-hint">${rec ? 'Tap when you finish' : tx ? 'Comprobando…' : sc ? 'Tap to try again' : 'Tap and say it'}</p>`;
}

/* suggestions, summary */
function hideSuggest() { $('#suggest').hidden = true; $('#suggest').innerHTML = ''; }
async function ideas() {
  const chat = state.chat; if (!chat || state.busy) return;
  const box = $('#suggest');
  box.hidden = false;
  box.innerHTML = `<div class="sugg-head"><span>Podrías decir…</span><button class="circle-btn sm" data-act="close-sugg" aria-label="Cerrar">${ico('x')}</button></div><div class="sugg-loading"><span class="dots"><i></i><i></i><i></i></span></div>`;
  try {
    const r = await claude.suggest({ apiKey: S.apiKey, model: S.model, chat, settings: S });
    if (state.chat !== chat || box.hidden) return;
    const list = arr(r.suggestions).filter(x => x && x.es).slice(0, 3);
    box.innerHTML = `<div class="sugg-head"><span>Podrías decir…</span><button class="circle-btn sm" data-act="close-sugg" aria-label="Cerrar">${ico('x')}</button></div>
      ${list.map(x => `<div class="sugg"><div><b lang="es">${esc(x.es)}</b><span>${esc(x.gloss)}</span></div>${tts.available ? `<button class="act" data-act="say" data-text="${esc(x.es)}" aria-label="Escuchar">${ico('play')}</button>` : ''}<button class="act" data-act="repeat" data-text="${esc(x.es)}" aria-label="Practicar">${ico('repeat')}</button></div>`).join('')}
      <p class="sugg-tip">Listen, then tap the mic and say it your way.</p>`;
  } catch (e) {
    if (state.chat === chat) box.innerHTML = `<div class="sugg-head"><span>${esc(errText(e.code, e.message))}</span><button class="circle-btn sm" data-act="close-sugg" aria-label="Cerrar">${ico('x')}</button></div>`;
  }
}
async function summary() {
  const chat = state.chat; if (!chat || state.busy) return;
  if (chat.messages.filter(m => m.role === 'me' && m.feedback).length < 2) { toast('Say at least two things first, then ask for your summary.'); return; }
  chat.summaryErr = null; state.busy = 'summary'; state.ctl = new AbortController(); renderChat(); renderDock();
  try {
    const r = await claude.summarize({ apiKey: S.apiKey, model: S.model, chat, settings: S, signal: state.ctl.signal });
    chat.summary = {
      headline: str(r.headline), level: str(r.level).slice(0, 8),
      strengths: arr(r.strengths).map(str).filter(Boolean).slice(0, 4),
      work_on: arr(r.work_on).filter(w => w && w.pattern).slice(0, 4).map(w => ({ pattern: str(w.pattern), tip: str(w.tip), example: str(w.example) })),
      phrases: arr(r.phrases).filter(p => p && p.es).slice(0, 6).map(p => ({ es: str(p.es), meaning: str(p.meaning) }))
    };
    chat.summaryAt = chat.messages.length;
  } catch (e) { if (e.code !== 'cancelled') chat.summaryErr = e.code || 'unknown'; }
  finally { state.busy = false; state.ctl = null; store.saveChat(chat); if (state.chat === chat) { renderChat(); renderDock(); } }
}

/* ---------- notebook ---------- */
const groupOf = n => (TYPES[n.type] || TYPES.grammar)[1];
function renderNotebook() {
  const mistakes = store.notebook.filter(n => n.kind === 'mistake');
  const words = store.notebook.filter(n => n.kind === 'word');
  const seg = state.nbSeg;
  const list = seg === 'mistake' ? (state.nbFilter === 'all' ? mistakes : mistakes.filter(n => groupOf(n) === state.nbFilter)) : words;
  const counts = {}; mistakes.forEach(n => { const g = groupOf(n); counts[g] = (counts[g] || 0) + 1; });
  const empty = seg === 'mistake'
    ? `<div class="empty card"><span class="empty-ico">${ico('book')}</span><h3>Nothing here yet</h3><p>Every mistake from your conversations is saved here automatically, with its explanation.</p><button class="btn primary" data-act="tab" data-tab="home">${ico('mic')}Empezar a hablar</button></div>`
    : `<div class="empty card"><span class="empty-ico">${ico('plus')}</span><h3>No saved expressions</h3><p>Tap + next to an expression in a conversation or summary to keep it here.</p></div>`;
  $('#nbBody').innerHTML = `
    <div class="segmented" role="tablist">
      <button class="${seg === 'mistake' ? 'on' : ''}" data-act="nb-seg" data-v="mistake">Errores <span>${mistakes.length}</span></button>
      <button class="${seg === 'word' ? 'on' : ''}" data-act="nb-seg" data-v="word">Expresiones <span>${words.length}</span></button>
    </div>
    ${seg === 'mistake' && mistakes.length ? `<div class="chips">
      <button class="chip ${state.nbFilter === 'all' ? 'on' : ''}" data-act="nb-filter" data-f="all">Todo</button>
      ${GROUPS.filter(([g]) => counts[g]).map(([g, l]) => `<button class="chip ${state.nbFilter === g ? 'on' : ''}" data-act="nb-filter" data-f="${g}">${esc(l)} <span>${counts[g]}</span></button>`).join('')}
    </div>` : ''}
    ${list.length ? `<div class="nb-actions">
      <button class="btn primary" data-act="nb-practice">${ico('mic')}Practicar hablando</button>
      <button class="btn" data-act="nb-cards">${ico('cards')}Tarjetas</button>
    </div>
    <div class="group">${list.map(n => n.kind === 'word'
      ? `<div class="nb-item"><div class="nb-main"><b class="nb-es" lang="es">${esc(n.es)}</b><span class="nb-note">${esc(n.meaning)}</span></div>
          ${tts.available ? `<button class="act" data-act="say" data-text="${esc(n.es)}" aria-label="Escuchar">${ico('play')}</button>` : ''}
          <button class="act ghost" data-act="nb-del" data-id="${esc(n.id)}" aria-label="Borrar">${ico('trash')}</button></div>`
      : `<div class="nb-item"><div class="nb-main">${typeChip(n.type)}
          <div class="swap" lang="es">${n.wrong ? `<s>${esc(n.wrong)}</s><span class="arrow">→</span>` : ''}<b>${esc(n.right)}</b></div>
          ${n.note ? `<span class="nb-note">${esc(n.note)}</span>` : ''}
          <span class="nb-meta">${esc(n.scene || '')}${n.scene ? ' · ' : ''}${esc(ago(n.createdAt))}</span></div>
          <button class="act" data-act="repeat" data-text="${esc(n.fixed || n.right)}" aria-label="Practicar">${ico('repeat')}</button>
          <button class="act ghost" data-act="nb-del" data-id="${esc(n.id)}" aria-label="Borrar">${ico('trash')}</button></div>`).join('')}</div>` : empty}`;
}
function startCards() {
  const items = state.nbSeg === 'word' ? store.notebook.filter(n => n.kind === 'word') : store.notebook.filter(n => n.kind === 'mistake' && (state.nbFilter === 'all' || groupOf(n) === state.nbFilter));
  if (!items.length) return;
  const deck = items.slice().sort(() => Math.random() - 0.5).slice(0, 25);
  state.cards = { deck, i: 0, flipped: false, known: 0 };
  openSheet('<div id="cardsBox"></div>', { tall: true, onClose: () => { state.cards = null; } });
  renderCard();
}
function renderCard() {
  const box = $('#cardsBox'), c = state.cards; if (!box || !c) return;
  if (c.i >= c.deck.length) {
    box.innerHTML = `${sheetHead('¡Hecho!')}<div class="cards-done"><div class="ring" style="--p:${Math.round(c.known / c.deck.length * 100)}"><span>${c.known}<small>/${c.deck.length}</small></span></div><p>You knew ${c.known} of ${c.deck.length}. The ones you missed will come back next time.</p><button class="btn primary" data-act="sheet-close">Cerrar</button></div>`;
    return;
  }
  const it = c.deck[c.i];
  const front = it.kind === 'word'
    ? `<span class="card-q">¿Qué significa?</span><b class="card-big" lang="es">${esc(it.es)}</b>`
    : `<span class="card-q">¿Cómo se dice bien?</span><b class="card-big wrong" lang="es">${esc(it.wrong || '…')}</b>${it.context ? `<span class="card-ctx" lang="es">«${esc(it.context)}»</span>` : ''}`;
  const back = it.kind === 'word'
    ? `<span class="card-q">Significa</span><b class="card-big">${esc(it.meaning)}</b>`
    : `<span class="card-q">Se dice</span><b class="card-big right" lang="es">${esc(it.right)}</b>${it.note ? `<span class="card-note">${esc(it.note)}</span>` : ''}`;
  const sayText = it.kind === 'word' ? it.es : it.right;
  box.innerHTML = `${sheetHead(`${c.i + 1} de ${c.deck.length}`)}
    <div class="progress"><i style="width:${(c.i / c.deck.length) * 100}%"></i></div>
    <button class="flash ${c.flipped ? 'flipped' : ''}" data-act="card-flip" aria-label="Girar tarjeta">
      <span class="flash-inner"><span class="face front">${front}<span class="card-hint">Tap to flip</span></span><span class="face back">${back}</span></span>
    </button>
    <div class="card-actions">
      ${c.flipped ? `${tts.available ? `<button class="circle-btn" data-act="say" data-text="${esc(sayText)}" aria-label="Escuchar">${ico('play')}</button>` : ''}
        <button class="btn" data-act="card-again">Otra vez</button><button class="btn primary" data-act="card-know">${ico('check')}Lo sabía</button>`
      : `<button class="btn primary wide" data-act="card-flip">Ver respuesta</button>`}
    </div>`;
}

/* ---------- guide ---------- */
function renderGuide() {
  const vk = S.variant, v = V();
  const yours = p => p.key === 'z' ? (vk === 'es' ? 'You chose España: say "th".' : `You chose ${v.label}: say s.`)
    : p.key === 'll' ? (vk === 'ar' ? 'You chose Argentina: say "sh".' : `You chose ${v.label}: a firm "y".`) : '';
  $('#guideBody').innerHTML = `
    <p class="lede">What gives a Portuguese speaker away in Spanish, and how to fix it. Tap a word to hear it in ${esc(v.label)} Spanish, then tap Pruébalo and say it yourself.</p>
    <section class="sec"><div class="sec-head"><h2>Pronunciación</h2></div>
      <div class="pron-grid">${PRON.map((p, k) => `<div class="pron card">
        <div class="pron-top"><span class="pron-k" lang="es">${esc(p.k)}</span><button class="pill-btn sm" data-act="repeat" data-text="${esc(p.ex.join(', '))}">${ico('mic')}Pruébalo</button></div>
        <h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>${yours(p) ? `<span class="yours">${esc(yours(p))}</span>` : ''}
        <div class="pron-ex" lang="es">${p.ex.map(w => `<button class="word-chip" data-act="word" data-text="${esc(w)}">${tts.available ? ico('play') : ''}${esc(w)}</button>`).join('')}</div>
      </div>`).join('')}</div>
    </section>
    <section class="sec"><div class="sec-head"><h2>Falsos amigos</h2></div>
      <p class="sec-p">Words that look Portuguese but mean something else. The arrow shows what to say for the Portuguese meaning.</p>
      <div class="group">${FALSE.map(([es, en, pt, fix]) => `<div class="ff">
        <button class="ff-play" data-act="word" data-text="${esc(es)}" aria-label="Escuchar ${esc(es)}">${ico('play')}</button>
        <div class="ff-main"><b lang="es">${esc(es)}</b><span>${esc(en)}</span><small>PT ${esc(pt)} → <em lang="es">${esc(fix)}</em></small></div>
      </div>`).join('')}</div>
    </section>
    <section class="sec"><div class="sec-head"><h2>Gramática que cambia</h2></div>
      <div class="group">${GRAM.map(([pt, es, note]) => `<div class="gram">
        <div class="gram-pair"><span class="gram-pt">${esc(pt)}</span><span class="arrow">→</span><b lang="es">${esc(es)}</b></div>
        <p>${esc(note)}</p>
        <div class="gram-tools">${tts.available ? `<button class="act" data-act="say" data-text="${esc(es)}" aria-label="Escuchar">${ico('play')}</button>` : ''}<button class="act" data-act="repeat" data-text="${esc(es.split(' / ')[0])}" aria-label="Practicar">${ico('repeat')}</button></div>
      </div>`).join('')}</div>
    </section>`;
}

/* ---------- settings ---------- */
function seg(k, opts) {
  return `<div class="segmented sm">${opts.map(([v, l]) => `<button class="${String(S[k]) === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
}
function sttRow() {
  const st = sttState.status;
  if (st === 'ready') return `<div class="row-item static"><span class="row-ico ok">${ico('check')}</span><span class="row-text"><b>Ready on this iPhone</b><span>Runs offline · ${sttState.device === 'webgpu' ? 'GPU' : 'CPU'}</span></span></div>`;
  if (st === 'downloading' || st === 'warming') return `<div class="row-item static"><span class="row-ico">${ico('download')}</span><span class="row-text"><b>${st === 'warming' ? 'Getting ready…' : `Downloading… ${pct()}%`}</b><span class="bar"><i style="width:${st === 'warming' ? 100 : pct()}%"></i></span></span></div>`;
  return `<button class="row-item" data-act="stt-load"><span class="row-ico">${ico('download')}</span><span class="row-text"><b>${st === 'error' ? 'Download failed. Try again' : 'Download speech recognition'}</b><span>${st === 'error' ? esc(sttState.error).slice(0, 90) : 'Needed once, best on Wi-Fi'}</span></span>${ico('chev', 'row-chev')}</button>`;
}
function renderSettings() {
  const voices = tts.voices();
  const key = S.apiKey ? `${S.apiKey.slice(0, 10)}…${S.apiKey.slice(-4)}` : 'Not set';
  $('#settingsBody').innerHTML = `
    <section class="sec"><h3 class="group-title">Claude</h3><div class="group">
      <button class="row-item" data-act="edit-key"><span class="row-ico">${ico('key')}</span><span class="row-text"><b>API key</b><span>${esc(key)}</span></span>${ico('chev', 'row-chev')}</button>
      ${MODELS.map(m => `<button class="row-item radio" data-act="set" data-k="model" data-v="${m.id}"><span class="row-text"><b>${esc(m.label)}</b><span>${esc(m.note)}</span></span><span class="radio-dot ${S.model === m.id ? 'on' : ''}"></span></button>`).join('')}
    </div></section>
    <section class="sec"><h3 class="group-title">Tu español</h3><div class="group">
      <div class="row-item static col"><span class="row-text"><b>Variante</b><span>The Spanish you hear and get corrected towards (new chats)</span></span>${seg('variant', [['es', 'España'], ['mx', 'México'], ['ar', 'Argentina']])}</div>
      <div class="row-item static col"><span class="row-text"><b>Nivel</b><span>How complex your partners' Spanish gets</span></span>${seg('level', [['A2', 'A2'], ['B1', 'B1'], ['B2', 'B2'], ['C1', 'C1']])}</div>
      <div class="row-item static col"><span class="row-text"><b>Explicaciones</b><span>Language for corrections and translations</span></span>${seg('lang', [['en', 'English'], ['pt', 'Português']])}</div>
    </div></section>
    <section class="sec"><h3 class="group-title">Escuchar</h3><div class="group">
      <label class="row-item static"><span class="row-text"><b>Read replies aloud</b><span>Play each reply as soon as it arrives</span></span><span class="switch"><input type="checkbox" data-setting="autoplay" ${S.autoplay ? 'checked' : ''}><i></i></span></label>
      <div class="row-item static col"><span class="row-text"><b>Voz</b><span>${voices.length ? `${voices.length} Spanish voices. Better ones: iPhone Settings › Accessibility › Spoken Content › Voices.` : 'Your device default Spanish voice.'}</span></span>
        <select class="select" data-setting="voice"><option value="">Automática</option>${voices.map(x => `<option value="${esc(x.voiceURI)}" ${S.voice === x.voiceURI ? 'selected' : ''}>${esc(x.name)} · ${esc(x.lang)}</option>`).join('')}</select></div>
      <div class="row-item static col"><span class="row-text"><b>Velocidad</b><span id="rateVal">${Number(S.rate).toFixed(2)}×</span></span>
        <div class="rate"><input type="range" min="0.6" max="1.2" step="0.05" value="${S.rate}" data-setting="rate" aria-label="Velocidad"><button class="pill-btn sm" data-act="test-voice">${ico('play')}Probar</button></div></div>
    </div></section>
    <section class="sec"><h3 class="group-title">Reconocimiento de voz</h3><div class="group">
      <button class="row-item radio" data-act="set" data-k="sttEngine" data-v="groq"><span class="row-text"><b>Groq · Whisper large</b><span>Most accurate, about half a second. Free key.</span></span><span class="radio-dot ${S.sttEngine === 'groq' ? 'on' : ''}"></span></button>
      <button class="row-item radio" data-act="set" data-k="sttEngine" data-v="device"><span class="row-text"><b>En el iPhone</b><span>Private and offline, but much less accurate.</span></span><span class="radio-dot ${S.sttEngine === 'device' ? 'on' : ''}"></span></button>
    </div>
    ${S.sttEngine === 'groq' ? `<div class="group"><button class="row-item" data-act="edit-groq"><span class="row-ico">${ico('key')}</span><span class="row-text"><b>Groq key</b><span>${S.groqKey ? esc(`${S.groqKey.slice(0, 8)}…${S.groqKey.slice(-4)}`) : 'Not set: tap to add it'}</span></span>${ico('chev', 'row-chev')}</button></div>
      <p class="group-foot">Your recording is sent to Groq to be turned into text, then deleted from your phone's memory. Only the text goes to Claude.</p>`
    : `<div class="group">${STT_MODELS.map(m => `<button class="row-item radio" data-act="stt-model" data-v="${m.id}"><span class="row-text"><b>${esc(m.label)}</b><span>${esc(m.note)}</span></span><span class="radio-dot ${S.sttModel === m.id ? 'on' : ''}"></span></button>`).join('')}
      <div id="sttRow">${sttRow()}</div></div>
      <p class="group-foot">Your voice is turned into text on this iPhone. Audio never leaves the device; only the text goes to Claude.</p>`}
    </section>
    <section class="sec"><h3 class="group-title">Apariencia</h3><div class="group">
      <div class="row-item static col"><span class="row-text"><b>Tema</b></span>${seg('theme', [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']])}</div>
    </div></section>
    <section class="sec"><h3 class="group-title">Ayuda</h3><div class="group">
      <button class="row-item" data-act="diag"><span class="row-ico">${ico('wave')}</span><span class="row-text"><b>Diagnóstico</b><span>A log of what the app did, to copy and send when something breaks</span></span>${ico('chev', 'row-chev')}</button>
    </div></section>
    <section class="sec"><h3 class="group-title">Datos</h3><div class="group">
      <button class="row-item" data-act="export"><span class="row-ico">${ico('share')}</span><span class="row-text"><b>Export a backup</b><span>Conversations, notebook and progress</span></span>${ico('chev', 'row-chev')}</button>
      <label class="row-item"><span class="row-ico">${ico('download')}</span><span class="row-text"><b>Import a backup</b><span>Replaces what's on this device</span></span><input type="file" accept="application/json,.json" id="importFile" hidden>${ico('chev', 'row-chev')}</label>
      ${state.confirm === 'wipe'
        ? `<div class="row-item static"><span class="row-text"><b class="danger">Delete everything?</b><span>Conversations, notebook, progress and your key</span></span><button class="pill-btn danger" data-act="wipe-yes">Delete</button><button class="pill-btn" data-act="wipe-no">Cancel</button></div>`
        : `<button class="row-item" data-act="wipe"><span class="row-ico danger">${ico('trash')}</span><span class="row-text"><b class="danger">Delete all data</b></span></button>`}
    </div><p class="group-foot">Everything stays on this device. Charla has no server; your messages go straight from your iPhone to Claude.</p></section>`;
}

function openKeySheet() {
  openSheet(`${sheetHead('Claude API key', 'Charla talks to Claude with your own key.')}
    <ol class="steps"><li>Open <b>console.anthropic.com</b> and sign in (a Claude.ai subscription doesn't include API use).</li><li>Add a little credit under Billing. $5 lasts months with the default model.</li><li>Go to <b>API keys</b>, create one, copy it, and paste it here.</li></ol>
    <a class="link-btn" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Open the API keys page ${ico('chev')}</a>
    <div class="field-wrap"><input id="keyInput" class="field" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(S.apiKey)}"></div>
    <p class="key-msg" id="keyMsg"></p>
    <button class="btn primary wide" data-act="save-key">Check and save</button>
    <p class="sheet-small">The key is stored only on this iPhone and sent only to Anthropic.</p>`);
}
async function saveKey(inputSel, msgSel, after) {
  const input = $(inputSel), msg = $(msgSel);
  const key = (input ? input.value : '').trim();
  if (!/^sk-ant-/.test(key)) { msg.textContent = 'That doesn\'t look like a Claude key. It starts with "sk-ant-".'; msg.className = 'key-msg bad'; return; }
  msg.textContent = 'Checking…'; msg.className = 'key-msg';
  try { await claude.verifyKey(key); S.apiKey = key; store.saveSettings(); msg.textContent = 'Key works.'; msg.className = 'key-msg good'; after && after(); }
  catch (e) { msg.textContent = e.code === 'network' ? errText('network') : e.code === 'auth' ? 'Anthropic rejected this key. Copy it again from the console.' : errText(e.code, e.message); msg.className = 'key-msg bad'; }
}

function openGroqSheet() {
  openSheet(`${sheetHead('Groq key', 'Free. Turns your voice into text with the most accurate Whisper model.')}
    <ol class="steps"><li>Open <b>console.groq.com</b> and sign up (Google sign-in works). No card needed.</li><li>Go to <b>API Keys</b>, tap <b>Create API Key</b>, and copy it.</li><li>Paste it here.</li></ol>
    <a class="link-btn" href="https://console.groq.com/keys" target="_blank" rel="noopener">Open Groq API keys ${ico('chev')}</a>
    <div class="field-wrap"><input id="groqInput" class="field" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="gsk_…" value="${esc(S.groqKey)}"></div>
    <p class="key-msg" id="groqMsg"></p>
    <button class="btn primary wide" data-act="save-groq">Check and save</button>
    <button class="btn wide" data-act="use-device">Use the on-device engine instead</button>
    <p class="sheet-small">The key is stored only on this iPhone. Recordings go to Groq only to be transcribed.</p>`);
}
async function saveGroq(inputSel, msgSel, after) {
  const input = $(inputSel), msg = $(msgSel);
  const key = (input ? input.value : '').trim();
  if (!/^gsk_/.test(key)) { msg.textContent = 'That doesn\'t look like a Groq key. It starts with "gsk_".'; msg.className = 'key-msg bad'; return; }
  msg.textContent = 'Checking…'; msg.className = 'key-msg';
  try { await verifyGroqKey(key); S.groqKey = key; S.sttEngine = 'groq'; store.saveSettings(); log('groq', 'key verified'); msg.textContent = 'Key works.'; msg.className = 'key-msg good'; after && after(); }
  catch (e) { msg.textContent = e.code === 'auth' ? 'Groq rejected this key. Copy it again from the console.' : e.code === 'network' ? "Couldn't reach Groq from this page. Check your connection, then send me the Diagnóstico log." : `Groq said: ${e.message}`; msg.className = 'key-msg bad'; }
}
function openVoiceSheet() {
  openSheet(`${sheetHead('Speech recognition', 'Turns your voice into text on this iPhone.')}<div id="voiceSheetBody">${voiceSheetBody()}</div>`);
}
function voiceSheetBody() {
  const st = sttState.status;
  const m = STT_MODELS.find(x => x.id === S.sttModel) || STT_MODELS[0];
  if (st === 'downloading' || st === 'warming') return `<div class="dl"><div class="ring" style="--p:${st === 'warming' ? 100 : pct()}"><span>${st === 'warming' ? ico('check') : `${pct()}<small>%</small>`}</span></div><p>${st === 'warming' ? 'Almost ready…' : 'Downloading. You can keep the app open and wait, it takes about a minute on Wi-Fi.'}</p></div>`;
  if (st === 'ready') return `<div class="dl"><div class="ring" style="--p:100"><span>${ico('check')}</span></div><p>Ready. Tap the microphone and speak.</p><button class="btn primary wide" data-act="sheet-close">Listo</button></div>`;
  return `<p class="sheet-p">Charla needs a one-time download (${esc(m.note.split('.')[0].replace('About ', 'about '))}) so it can understand your Spanish without sending audio anywhere. Use Wi-Fi if you can.</p>
    ${st === 'error' ? `<p class="key-msg bad">${esc(sttState.error).slice(0, 140)}</p>` : ''}
    <button class="btn primary wide" data-act="stt-load">${ico('download')}Download now</button>`;
}

/* ---------- onboarding ---------- */
function renderOnboarding() {
  const ob = $('#onboard'), step = state.obStep, v = V();
  const dots = `<div class="ob-dots">${[0, 1, 2, 3].map(k => `<i class="${k === step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (step === 0) body = `<div class="ob-hero"><div class="ob-orb">${ico('mic')}</div><h1>Charla</h1><p>Speak Spanish in real situations. Every sentence gets corrected, with the Portuguese traps explained.</p></div>
    <div class="ob-feats">
      <div>${ico('mic')}<span><b>Talk, don't type</b>Hold the mic and speak. It understands you on the phone itself.</span></div>
      <div>${ico('check')}<span><b>Precise corrections</b>False friends, portuñol, verbs and pronunciation.</span></div>
      <div>${ico('repeat')}<span><b>Repeat until it sounds right</b>Hear the right version and say it back.</span></div>
    </div>
    <button class="btn primary wide big" data-act="ob-next">Empezar</button>`;
  if (step === 1) body = `<div class="ob-head"><span class="ob-ico">${ico('key')}</span><h2>Connect Claude</h2><p>Charla uses your own Claude API key. It stays on this iPhone.</p></div>
    <ol class="steps"><li>Open <b>console.anthropic.com</b> and sign in. API use is billed separately from a Claude.ai plan.</li><li>Add a little credit under Billing. $5 lasts months: the default model costs about 5 cents per hour of practice.</li><li>Create a key under <b>API keys</b>, copy it, paste it below.</li></ol>
    <a class="link-btn" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Open the API keys page ${ico('chev')}</a>
    <div class="field-wrap"><input id="obKey" class="field" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(S.apiKey)}"></div>
    <p class="key-msg" id="obKeyMsg"></p>
    <button class="btn primary wide big" data-act="ob-key">Check and continue</button>`;
  if (step === 2) body = `<div class="ob-head"><span class="ob-ico">${ico('chat')}</span><h2>Your Spanish</h2><p>Which Spanish do you want to sound like?</p></div>
    <div class="ob-variants">${Object.entries(VARIANTS).map(([k, x]) => `<button class="ob-variant ${S.variant === k ? 'on' : ''}" data-act="ob-variant" data-v="${k}"><b>${esc(x.label)}</b><span lang="es">${k === 'es' ? '¿Qué tal? Vale, guay.' : k === 'mx' ? '¿Qué onda? Órale, padre.' : '¿Cómo andás? Dale, che.'}</span><span class="radio-dot ${S.variant === k ? 'on' : ''}"></span></button>`).join('')}</div>
    <p class="ob-label">Your speaking level</p>
    ${seg('level', [['A2', 'A2'], ['B1', 'B1'], ['B2', 'B2'], ['C1', 'C1']])}
    <p class="ob-label">Explanations in</p>
    ${seg('lang', [['en', 'English'], ['pt', 'Português']])}
    <button class="btn primary wide big" data-act="ob-next">Continuar</button>`;
  if (step === 3 && S.sttEngine === 'groq') body = `<div class="ob-head"><span class="ob-ico">${ico('wave')}</span><h2>Your voice</h2><p>Charla sends your recordings to Groq, which runs the most accurate Whisper model for free. You need a free Groq key.</p></div>
    <ol class="steps"><li>Open <b>console.groq.com</b> and sign up. No card needed.</li><li>Create a key under <b>API Keys</b> and copy it.</li><li>Paste it below.</li></ol>
    <a class="link-btn" href="https://console.groq.com/keys" target="_blank" rel="noopener">Open Groq API keys ${ico('chev')}</a>
    <div class="field-wrap"><input id="obGroq" class="field" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="gsk_…" value="${esc(S.groqKey)}"></div>
    <p class="key-msg" id="obGroqMsg"></p>
    <button class="btn primary wide big" data-act="ob-groq">Check and start</button>
    <button class="btn wide" data-act="ob-device">Use on-device recognition instead</button>`;
  else if (step === 3) body = `<div class="ob-head"><span class="ob-ico">${ico('wave')}</span><h2>Your voice</h2><p>Charla turns your speech into text on the iPhone, so audio never leaves it. It needs a one-time download of about 40 MB.</p></div>
    <div id="obVoice">${obVoice()}</div>
    <button class="btn primary wide big" data-act="ob-done">${sttState.status === 'ready' ? `Hablar con ${esc(v.a)}` : 'Continue'}</button>
    ${sttState.status === 'ready' ? '' : '<p class="sheet-small">You can keep going while it downloads.</p>'}`;
  ob.innerHTML = `<div class="ob-inner">${step > 0 ? `<button class="ob-back" data-act="ob-back" aria-label="Atrás">${ico('back')}</button>` : ''}${dots}${body}</div>`;
}
function obVoice() {
  const st = sttState.status;
  if (st === 'ready') return `<div class="dl row"><div class="ring sm" style="--p:100"><span>${ico('check')}</span></div><p><b>Ready.</b> The first conversation will ask for microphone access; tap Allow.</p></div>`;
  if (st === 'downloading' || st === 'warming') return `<div class="dl row"><div class="ring sm" style="--p:${st === 'warming' ? 100 : pct()}"><span>${st === 'warming' ? '…' : pct() + '<small>%</small>'}</span></div><p>${st === 'warming' ? 'Almost ready…' : 'Downloading…'}</p></div>`;
  return `<button class="btn wide" data-act="stt-load">${ico('download')}Download now</button>${st === 'error' ? `<p class="key-msg bad">${esc(sttState.error).slice(0, 140)}</p>` : ''}`;
}
function showOnboarding(show) {
  $('#onboard').hidden = !show;
  if (show) renderOnboarding();
}

/* ---------- events ---------- */
onStt(() => {
  if (sttState.status === 'ready' && !S.sttReady) { S.sttReady = true; store.saveSettings(); }
  const r = $('#sttRow'); if (r) r.innerHTML = sttRow();
  const vs = $('#voiceSheetBody'); if (vs) vs.innerHTML = voiceSheetBody();
  const ov = $('#obVoice'); if (ov) { ov.innerHTML = obVoice(); if (sttState.status === 'ready') renderOnboarding(); }
  if (state.chat && state.recMode === 'idle' && state.inputMode === 'voice') { const h = $('.dock-hint'); if (h && !state.busy) h.textContent = sttState.status === 'downloading' ? `Preparando la voz… ${pct()}%` : 'Toca para hablar'; }
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const d = b.dataset, c = state.chat;
  const msgAt = () => c && c.messages[Number(d.i)];
  switch (d.act) {
    case 'tab': showTab(d.tab); break;
    case 'goto-settings': leaveChat(); showTab('settings'); break;
    case 'start': startChat(d.scn); break;
    case 'custom': {
      openSheet(`${sheetHead('Tu propia situación', "Who are you talking to, and what do you need?")}
        <textarea id="customText" class="field area" rows="4" lang="es" placeholder="Llamo a un taller porque mi ${esc(V().car)} hace un ruido raro…"></textarea>
        <button class="btn primary wide" data-act="start-custom">Empezar</button>`);
      setTimeout(() => { const t = $('#customText'); t && t.focus(); }, 350);
      break;
    }
    case 'start-custom': { const t = $('#customText'); const v = t ? t.value.trim() : ''; if (!v) return; closeSheet(); startChat('custom', { text: v }); break; }
    case 'review-all': case 'nb-practice': {
      const src = d.act === 'review-all' ? store.notebook.filter(n => n.kind === 'mistake')
        : state.nbSeg === 'word' ? store.notebook.filter(n => n.kind === 'word') : store.notebook.filter(n => n.kind === 'mistake' && (state.nbFilter === 'all' || groupOf(n) === state.nbFilter));
      const lines = src.slice(0, 10).map(n => n.kind === 'word' ? `- ${n.es} (${n.meaning})` : `- "${n.wrong}" should be "${n.right}"${n.note ? ` (${n.note})` : ''}`).join('\n');
      if (lines) startChat('repaso', { lines });
      break;
    }
    case 'open-chat': { const ch = store.chats.find(x => x.id === d.id); if (ch) openChat(JSON.parse(JSON.stringify(ch))); break; }
    case 'del-chat': store.deleteChat(d.id); renderHome(); toast('Conversación borrada.'); break;
    case 'back': leaveChat(); break;
    case 'summary': summary(); break;
    case 'ideas': ideas(); break;
    case 'close-sugg': hideSuggest(); break;
    case 'mode-text': state.inputMode = 'text'; renderDock(); setTimeout(() => { const t = $('#kbdInput'); t && t.focus(); }, 30); break;
    case 'mode-voice': state.inputMode = 'voice'; renderDock(); break;
    case 'send-typed': { const t = $('#kbdInput'); if (t && t.value.trim()) { const v = t.value; t.value = ''; autosize(t); sendMessage(v, { typed: true }); } break; }
    case 'rec-cancel': stopRec(false); break;
    case 'play': { const m = msgAt(); if (m) speak(m.text); break; }
    case 'slow': { const m = msgAt(); if (m) speak(m.text, 0.7); break; }
    case 'say': speak(d.text); break;
    case 'say-slow': speak(d.text, 0.7); break;
    case 'word': speak(d.text, 0.8); break;
    case 'tr': { const m = msgAt(); if (!m) break; state.trOpen.has(m.ts) ? state.trOpen.delete(m.ts) : state.trOpen.add(m.ts); renderChat(false); break; }
    case 'repeat-ai': { const m = msgAt(); if (m) openRepeat(m.text); break; }
    case 'repeat': openRepeat(d.text); break;
    case 'fb-toggle': { const ts = Number(d.ts); state.fbOpen.has(ts) ? state.fbOpen.delete(ts) : state.fbOpen.add(ts); renderChat(false); break; }
    case 'retry': { const m = msgAt(); if (m && !state.busy) runTurn(m); break; }
    case 'retry-open': if (c && !state.busy) runTurn(null); break;
    case 'save-word': {
      const it = { id: rid(), kind: 'word', es: d.es, meaning: d.meaning || '', scene: c ? c.title : '', createdAt: Date.now() };
      if (!store.notebook.some(n => noteKey(n) === noteKey(it))) store.addNotes([it]);
      b.outerHTML = `<span class="saved">${ico('check')}</span>`;
      toast('Guardada en tu cuaderno.');
      break;
    }
    case 'nb-seg': state.nbSeg = d.v; state.nbFilter = 'all'; renderNotebook(); break;
    case 'nb-filter': state.nbFilter = d.f; renderNotebook(); break;
    case 'nb-del': store.deleteNote(d.id); renderNotebook(); break;
    case 'nb-cards': startCards(); break;
    case 'card-flip': if (state.cards) { state.cards.flipped = !state.cards.flipped; renderCard(); } break;
    case 'card-know': if (state.cards) { state.cards.known++; state.cards.i++; state.cards.flipped = false; renderCard(); } break;
    case 'card-again': if (state.cards) { const cs = state.cards; cs.deck.push(cs.deck.splice(cs.i, 1)[0]); cs.flipped = false; renderCard(); } break;
    case 'sheet-close': closeSheet(); break;
    case 'set': {
      S[d.k] = d.v; store.saveSettings();
      if (d.k === 'theme') applyTheme();
      if (d.k === 'variant') { S.voice = ''; store.saveSettings(); }
      if (state.tab === 'settings') renderSettings();
      if (!$('#onboard').hidden) renderOnboarding();
      break;
    }
    case 'stt-model': if (S.sttModel !== d.v) { S.sttModel = d.v; S.sttReady = false; store.saveSettings(); sttState.status = 'idle'; renderSettings(); } break;
    case 'stt-load': loadStt(S.sttModel); break;
    case 'edit-groq': openGroqSheet(); break;
    case 'save-groq': saveGroq('#groqInput', '#groqMsg', () => { setTimeout(closeSheet, 600); if (state.tab === 'settings') renderSettings(); }); break;
    case 'use-device': S.sttEngine = 'device'; store.saveSettings(); closeSheet(); if (state.tab === 'settings') renderSettings(); setTimeout(openVoiceSheet, 350); break;
    case 'ob-groq': saveGroq('#obGroq', '#obGroqMsg', () => setTimeout(() => { S.onboarded = true; store.saveSettings(); showOnboarding(false); showTab('home'); startChat('libre'); }, 500)); break;
    case 'ob-device': S.sttEngine = 'device'; store.saveSettings(); renderOnboarding(); break;
    case 'test-voice': speak(S.variant === 'ar' ? 'Hola, ¿cómo andás? Encantada de conocerte.' : 'Hola, ¿qué tal? Encantada de conocerte.'); break;
    case 'edit-key': openKeySheet(); break;
    case 'diag': openDiag(); break;
    case 'diag-copy': copyDiag(); break;
    case 'diag-clear': clearLog(); openDiag(); break;
    case 'save-key': saveKey('#keyInput', '#keyMsg', () => { setTimeout(closeSheet, 600); renderSettings(); }); break;
    case 'export': exportData(); break;
    case 'wipe': state.confirm = 'wipe'; renderSettings(); break;
    case 'wipe-no': state.confirm = null; renderSettings(); break;
    case 'wipe-yes': store.wipe(); location.reload(); break;
    case 'ob-next': state.obStep = Math.min(3, state.obStep + 1); renderOnboarding(); break;
    case 'ob-back': state.obStep = Math.max(0, state.obStep - 1); renderOnboarding(); break;
    case 'ob-key': saveKey('#obKey', '#obKeyMsg', () => { setTimeout(() => { state.obStep = 2; renderOnboarding(); }, 500); }); break;
    case 'ob-variant': S.variant = d.v; store.saveSettings(); renderOnboarding(); break;
    case 'ob-done': S.onboarded = true; store.saveSettings(); showOnboarding(false); showTab('home'); if (sttState.status === 'ready') startChat('libre'); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'importFile' && t.files && t.files[0]) {
    const r = new FileReader();
    r.onload = () => { try { store.importAll(String(r.result)); toast('Backup imported.'); renderSettings(); } catch (err) { toast(err.message || 'That file could not be read.'); } };
    r.readAsText(t.files[0]);
    return;
  }
  const k = t.dataset && t.dataset.setting; if (!k) return;
  S[k] = t.type === 'checkbox' ? t.checked : k === 'rate' ? Number(t.value) : t.value;
  store.saveSettings();
});
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.setting === 'rate') { const el = $('#rateVal'); if (el) el.textContent = `${Number(e.target.value).toFixed(2)}×`; }
  if (e.target.id === 'kbdInput') autosize(e.target);
});
document.addEventListener('keydown', e => {
  if (e.target.id === 'kbdInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('[data-act="send-typed"]')?.click(); }
  if (e.key === 'Escape') closeSheet();
});
$('#sheetLayer').addEventListener('click', e => { if (e.target.classList.contains('sheet-backdrop')) closeSheet(); });

async function diagText() {
  const env = await envReport();
  const st = `speech: ${sttState.status} ${sttState.model || S.sttModel} ${sttState.device || ''} ${sttState.error || ''}`;
  return ['CHARLA DIAGNOSTICS', ...env, st, `claude model: ${S.model}`, '', ...getLog()].join('\n');
}
async function openDiag() {
  const text = await diagText();
  openSheet(`${sheetHead('Diagnóstico', 'Copy this and paste it in the chat so the problem can be traced.')}
    <div class="diag-actions"><button class="btn primary" data-act="diag-copy">Copy log</button><button class="btn" data-act="diag-clear">Clear</button></div>
    <pre class="diag" id="diagText">${esc(text)}</pre>`, { tall: true });
}
async function copyDiag() {
  const text = await diagText();
  try { await navigator.clipboard.writeText(text); toast('Log copied.'); }
  catch (e) {
    const el = $('#diagText'); if (!el) return;
    const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    toast('Select all and copy.');
  }
}

function exportData() {
  const blob = new Blob([store.exportAll()], { type: 'application/json' });
  const file = new File([blob], `charla-${today()}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Charla backup' }).catch(() => {}); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- service worker ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          const t = $('#toast');
          t.innerHTML = `A new version is ready. <button class="toast-btn" id="reloadBtn">Update</button>`;
          t.classList.add('show');
          $('#reloadBtn').onclick = () => location.reload();
        }
      });
    });
  }).catch(() => {});
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- start ---------- */
applyTheme();
tts.onVoices(() => { if (state.tab === 'settings') renderSettings(); });
showTab('home');
if (!S.onboarded || !S.apiKey) showOnboarding(true);
// Warm up a model downloaded on an earlier visit so the first tap on the mic is instant.
// iPhone Safari can't hold the base model in memory, so iPhones move to the tiny one unless it's already working.
if (isIOS && !S.sttMigrated) { if (!S.sttReady && S.sttModel !== 'onnx-community/whisper-tiny') S.sttModel = 'onnx-community/whisper-tiny'; S.sttMigrated = true; store.saveSettings(); }
const crashedRaw = takeCrashedModel();
// The crash notice only matters when speech runs on the phone.
const crashed = S.sttEngine === 'device' ? crashedRaw : null;
log('app', `opened (${isStandalone() ? 'home screen' : 'browser'}, speech: ${S.sttEngine})${crashedRaw ? ` after a load of ${crashedRaw} was cut off${crashed ? '' : ' (ignored: speech uses Groq)'}` : ''}`);
if (crashed) {
  // iOS closed the app while loading that model: step down to a smaller one instead of crashing again.
  const order = STT_MODELS.map(m => m.id);
  const i = order.indexOf(crashed);
  S.sttModel = order[Math.max(0, i - 1)]; S.sttReady = false; store.saveSettings();
  const m = STT_MODELS.find(x => x.id === S.sttModel);
  setTimeout(() => openSheet(`${sheetHead('Speech recognition')}<p class="sheet-p">Your iPhone ran out of memory loading the speech model, so iOS closed the app. ${i > 0 ? `I've switched to the smaller <b>${esc(m.label)}</b> model (${esc(m.note.split('.')[0].replace('About ', 'about '))}).` : 'This is already the smallest model. Close other apps and try again.'}</p><button class="btn primary wide" data-act="stt-load">${ico('download')}Try again</button>`), 600);
} else if (S.sttReady && S.sttEngine === 'device') setTimeout(() => loadStt(S.sttModel), 1200);
