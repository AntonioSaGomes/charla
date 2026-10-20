// Everything is stored on the device. Home-screen apps on iOS keep their storage as long as the app is installed.
const K = { settings: 'charla.settings', chats: 'charla.chats', notebook: 'charla.notebook', stats: 'charla.stats' };

export const DEFAULTS = {
  apiKey: '', model: 'claude-haiku-5-5', variant: 'es', level: 'B1', lang: 'en',
  voice: '', rate: 0.95, autoplay: true, sttModel: 'onnx-community/whisper-base', sttReady: false,
  theme: 'auto', onboarded: false
};

function get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

export const store = {
  settings: { ...DEFAULTS, ...get(K.settings, {}) },
  chats: get(K.chats, []),
  notebook: get(K.notebook, []),
  stats: get(K.stats, { days: {} }),

  saveSettings() { set(K.settings, this.settings); },
  saveChat(chat) {
    if (!chat.messages.length) return;
    chat.updatedAt = Date.now();
    const copy = JSON.parse(JSON.stringify(chat));
    this.chats = [copy, ...this.chats.filter(c => c.id !== chat.id)].slice(0, 60);
    let list = this.chats;
    while (!set(K.chats, list) && list.length > 1) list = list.slice(0, Math.ceil(list.length * 0.7));
    this.chats = list;
  },
  deleteChat(id) { this.chats = this.chats.filter(c => c.id !== id); set(K.chats, this.chats); },
  addNotes(items) { if (!items.length) return; this.notebook = [...items, ...this.notebook].slice(0, 2000); set(K.notebook, this.notebook); },
  deleteNote(id) { this.notebook = this.notebook.filter(n => n.id !== id); set(K.notebook, this.notebook); },
  logSpeech(seconds) {
    const d = today();
    const day = this.stats.days[d] || { secs: 0, msgs: 0 };
    day.secs += seconds; day.msgs += 1;
    this.stats.days[d] = day;
    set(K.stats, this.stats);
  },
  logMessage() {
    const d = today();
    const day = this.stats.days[d] || { secs: 0, msgs: 0 };
    day.msgs += 1; this.stats.days[d] = day; set(K.stats, this.stats);
  },
  streak() {
    let n = 0; const dt = new Date();
    if (!this.stats.days[today()]) dt.setDate(dt.getDate() - 1);
    while (this.stats.days[today(dt)]) { n++; dt.setDate(dt.getDate() - 1); }
    return n;
  },
  exportAll() { return JSON.stringify({ app: 'charla', version: 1, settings: { ...this.settings, apiKey: '' }, chats: this.chats, notebook: this.notebook, stats: this.stats }, null, 2); },
  importAll(json) {
    const d = JSON.parse(json);
    if (!d || d.app !== 'charla') throw new Error('This is not a Charla backup.');
    if (Array.isArray(d.chats)) { this.chats = d.chats; set(K.chats, this.chats); }
    if (Array.isArray(d.notebook)) { this.notebook = d.notebook; set(K.notebook, this.notebook); }
    if (d.stats && d.stats.days) { this.stats = d.stats; set(K.stats, this.stats); }
  },
  wipe() { Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); }
};

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const noteKey = n => (n.kind === 'word' ? 'w|' + n.es : 'm|' + n.wrong + '|' + n.right).toLowerCase().trim();
