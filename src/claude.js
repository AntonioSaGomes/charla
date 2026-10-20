// Everything that talks to the Claude API lives here.
import Anthropic from '@anthropic-ai/sdk';
import { VARIANTS, TYPES } from './data.js';

const LANG = { en: 'English', pt: 'European Portuguese (português de Portugal)' };

let client = null;
let clientKey = '';
function getClient(apiKey) {
  if (!client || clientKey !== apiKey) {
    // The key is the learner's own and never leaves their device except to the API.
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 90_000 });
    clientKey = apiKey;
  }
  return client;
}

// Haiku 5.5 has no server-side fallback; the others retry a policy decline on Anthropic's recommended model.
function routing(model) {
  return model === 'claude-haiku-5-5' ? { model } : { model, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };
}

const str = { type: 'string' };
const TURN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'translation', 'feedback', 'pron', 'words'],
  properties: {
    reply: str,
    translation: str,
    feedback: {
      type: 'object',
      additionalProperties: false,
      required: ['ok', 'corrected', 'natural', 'issues'],
      properties: {
        ok: { type: 'boolean' },
        corrected: str,
        natural: str,
        issues: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['wrong', 'right', 'type', 'note'],
            properties: { wrong: str, right: str, type: { type: 'string', enum: Object.keys(TYPES) }, note: str }
          }
        }
      }
    },
    pron: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['word', 'tip'], properties: { word: str, tip: str } } },
    words: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['es', 'meaning'], properties: { es: str, meaning: str } } }
  }
};

const SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'level', 'strengths', 'work_on', 'phrases'],
  properties: {
    headline: str,
    level: str,
    strengths: { type: 'array', items: str },
    work_on: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pattern', 'tip', 'example'], properties: { pattern: str, tip: str, example: str } } },
    phrases: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['es', 'meaning'], properties: { es: str, meaning: str } } }
  }
};

const SUGGEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: { suggestions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['es', 'gloss'], properties: { es: str, gloss: str } } } }
};

export function systemPrompt(chat, s) {
  const v = VARIANTS[chat.variant] || VARIANTS.es;
  const lang = LANG[s.lang] || LANG.en;
  return `You are a Spanish conversation partner inside a speaking-practice app, and you also give the learner precise feedback.

LEARNER
- Native European Portuguese speaker (from Portugal). Reads Spanish fairly easily; wants to SPEAK it naturally and correctly.
- Target speaking level: ${s.level} (CEFR). Speak natural, idiomatic Spanish pitched just above that level.
- Variety to model: ${v.desc} Use it consistently in your own lines.
- The learner usually SPEAKS: their messages are speech-to-text transcripts. Ignore capitalisation, punctuation and missing written accents or ¿ ¡ in transcripts. A strange word that sounds like the intended one (often Portuguese-sounding) is probably a pronunciation slip: flag it with type "pronunciation" and explain how to say the intended word. Messages that start with [typed] were typed instead, so check spelling and accents in those.

SCENE
${chat.scene}
- Stay in character. Keep each line short like real speech: 1-3 sentences, at most about 45 words. Usually end with a question or a hook that keeps the learner talking.
- "reply" is always Spanish only, in character. Never correct the learner inside "reply"; corrections go in "feedback". If the learner seems lost, simplify and rephrase.

FEEDBACK (on the learner's latest message)
- Check grammar, verb forms, gender, prepositions, vocabulary, false friends, word order, register, and anything a native speaker would find odd.
- Most errors will be Portuguese interference. Name it and contrast with Portuguese when it helps (e.g. "PT 'esquisito' = strange, but ES 'exquisito' = delicious; say 'raro'").
- Watch for: Portuguese words slipping in (obrigado, também, então, ainda, mas, você, comboio...); "ir a + infinitive" ("voy a comer", never "voy comer"); "estar a + infinitive" instead of the gerund; the gustar structure; personal "a"; muy vs mucho; article + possessive ("mi casa", not "la mi casa"); contractions (only al/del, never no/na/pelo); "lo que" vs "o que"; -aje nouns are masculine (el viaje); gender swaps (la leche, la sal, la sangre, el color, el árbol, el dolor); no future subjunctive and no personal infinitive; haber, never tener, as the perfect auxiliary; clitics before conjugated verbs ("me dice", not "dice-me")${chat.variant === 'es' ? '; pretérito perfecto for today and this week' : ''}.
- If the learner uses a Portuguese or English word, or something in [brackets], because they don't know the Spanish, put the Spanish in "corrected" and add an issue of type "vocabulary". Be kind about it.
- Be accurate: never invent errors and never flag something natural Spanish allows.
- "ok" is true when there are no errors; then "corrected" repeats the message and "issues" is empty.
- "corrected" is the full corrected message. "wrong" quotes the learner's exact words.
- "natural": if the message is understandable but stilted or calqued from Portuguese, write how a native speaker of the variety would say it; otherwise "".
- Every "note" is written in ${lang}, at most 25 words, concrete.
- For your opening line there is no learner message yet: set ok to true, corrected and natural to "", issues to [].

ALSO
- "translation": your reply in ${lang}.
- "pron": 0-2 words from YOUR reply that a Portuguese speaker is likely to say wrong (jota, initial r and rr trill, b/v both [b], ${chat.variant === 'es' ? 'z/ce/ci as [θ], ' : 'z/ce/ci as [s], '}${chat.variant === 'ar' ? 'll/y as [ʃ], ' : 'll/y, '}full unstressed vowels, s never [ʃ], no nasal vowels, soft d between vowels, ch as [tʃ]). "tip" in ${lang}, at most 15 words. Skip easy words.
- "words": 0-2 expressions from your reply worth learning at this level, glossed in ${lang}.`;
}

export const OPEN_CMD = '[The scene starts now. Say your opening line in character.]';

export function historyFor(chat) {
  const msgs = chat.messages.filter(m => m.role === 'ai' || !m.failed).slice(-30);
  const out = [{ role: 'user', content: OPEN_CMD }];
  for (const m of msgs) {
    if (m.role === 'ai') out.push({ role: 'assistant', content: m.text });
    else out.push({ role: 'user', content: m.typed ? `[typed] ${m.text}` : m.text });
  }
  // Consecutive user turns (after a trimmed history) are read as one, so no further fixing is needed.
  return out;
}

// Reads the "reply" string out of a JSON object that is still streaming in.
export function partialReply(text) {
  const k = text.indexOf('"reply"');
  if (k < 0) return null;
  let i = text.indexOf('"', text.indexOf(':', k) + 1);
  if (i < 0) return null;
  let out = '';
  for (i = i + 1; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') {
      const n = text[i + 1];
      if (n === undefined) break;
      if (n === 'u') { const hex = text.slice(i + 2, i + 6); if (hex.length < 4) break; out += String.fromCharCode(parseInt(hex, 16)); i += 5; }
      else { out += ({ n: '\n', t: '\t', r: '', b: '', f: '' })[n] ?? n; i += 1; }
    } else if (c === '"') return { text: out, done: true };
    else out += c;
  }
  return { text: out, done: false };
}

// Text after the last model switch: if a fallback took over mid-answer, the declined partial is discarded.
function finalText(msg) {
  let start = 0;
  msg.content.forEach((b, i) => { if (b.type === 'fallback') start = i + 1; });
  return msg.content.slice(start).filter(b => b.type === 'text').map(b => b.text).join('');
}

export class ClaudeError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
function mapError(e) {
  if (e instanceof ClaudeError) return e;
  if (e instanceof Anthropic.APIUserAbortError) return new ClaudeError('cancelled');
  if (e instanceof Anthropic.AuthenticationError) return new ClaudeError('auth');
  if (e instanceof Anthropic.PermissionDeniedError) return new ClaudeError('permission', e.message);
  if (e instanceof Anthropic.NotFoundError) return new ClaudeError('model', e.message);
  if (e instanceof Anthropic.RateLimitError) return new ClaudeError('rate');
  if (e instanceof Anthropic.BadRequestError) return new ClaudeError(/credit balance/i.test(e.message) ? 'credit' : 'bad', e.message);
  if (e instanceof Anthropic.InternalServerError) return new ClaudeError('overloaded');
  if (e instanceof Anthropic.APIConnectionError) return new ClaudeError('network');
  if (e instanceof SyntaxError) return new ClaudeError('format');
  return new ClaudeError('unknown', String(e && e.message || e));
}

function checkStop(msg) {
  if (msg.stop_reason === 'refusal') throw new ClaudeError('refused');
  if (msg.stop_reason === 'max_tokens') throw new ClaudeError('format');
}

export async function streamTurn({ apiKey, model, chat, settings, onReply, signal }) {
  try {
    const stream = getClient(apiKey).beta.messages.stream({
      ...routing(model),
      max_tokens: 8000,
      system: systemPrompt(chat, settings),
      cache_control: { type: 'ephemeral' },
      messages: historyFor(chat),
      output_config: { effort: 'low', format: { type: 'json_schema', schema: TURN_SCHEMA } }
    }, { signal });
    let last = '';
    stream.on('text', (_delta, snapshot) => {
      const r = partialReply(snapshot);
      if (r && r.text !== last) { last = r.text; onReply && onReply(r.text, r.done); }
      else if (r && r.done) onReply && onReply(r.text, true);
    });
    const msg = await stream.finalMessage();
    checkStop(msg);
    return JSON.parse(finalText(msg));
  } catch (e) { throw mapError(e); }
}

async function structured({ apiKey, model, prompt, schema, effort, signal }) {
  try {
    const msg = await getClient(apiKey).beta.messages.create({
      ...routing(model),
      max_tokens: 12000,
      messages: [{ role: 'user', content: prompt }],
      output_config: { effort, format: { type: 'json_schema', schema } }
    }, { signal });
    checkStop(msg);
    return JSON.parse(finalText(msg));
  } catch (e) { throw mapError(e); }
}

export function summarize({ apiKey, model, chat, settings, signal }) {
  const v = VARIANTS[chat.variant] || VARIANTS.es;
  const lang = LANG[settings.lang] || LANG.en;
  const lines = chat.messages.slice(-60).map(m => {
    if (m.role === 'ai') return `${chat.who}: ${m.text}`;
    let l = `LEARNER: ${m.text}`;
    if (m.feedback && !m.feedback.ok) l += `\n  [corrected: ${m.feedback.corrected} | ${(m.feedback.issues || []).map(i => `${i.wrong} -> ${i.right} (${i.type})`).join('; ')}]`;
    return l;
  }).join('\n');
  return structured({
    apiKey, model, schema: SUMMARY_SCHEMA, effort: 'medium', signal,
    prompt: `You are an expert Spanish tutor. Below is a speaking-practice conversation. The learner is a native European Portuguese speaker, target level ${settings.level}, practising ${v.label} Spanish, mostly by voice (their lines are speech-to-text transcripts). Scene: ${chat.title}.
Write a short, honest debrief in ${lang} (Spanish examples stay in Spanish):
- headline: one sentence, encouraging but honest.
- level: CEFR estimate of their spoken production in this chat (e.g. B1, B1+).
- strengths: 2-3 specific things they did well.
- work_on: 1-3 recurring issues, most important first, each with a fix (contrast with Portuguese where relevant) and a correct Spanish example.
- phrases: 3-5 useful Spanish phrases for this scene that they didn't use, glossed in ${lang}.

CONVERSATION
${lines}`
  });
}

export function suggest({ apiKey, model, chat, settings, signal }) {
  const v = VARIANTS[chat.variant] || VARIANTS.es;
  const lang = LANG[settings.lang] || LANG.en;
  const recent = chat.messages.filter(m => m.role === 'ai' || !m.failed).slice(-8).map(m => (m.role === 'ai' ? chat.who : 'LEARNER') + ': ' + m.text).join('\n');
  return structured({
    apiKey, model, schema: SUGGEST_SCHEMA, effort: 'low', signal,
    prompt: `A learner of Spanish (native European Portuguese speaker, level ${settings.level}) is stuck in a role-play and needs ideas for what to say next.
Variety: ${v.desc}
Scene: ${chat.scene}

Recent conversation:
${recent}

Suggest 3 different things the LEARNER could say next, in Spanish of that variety, each at most 15 words: one simple, one natural, one a bit more advanced or idiomatic. Add a short gloss in ${lang} for each.`
  });
}

// Checks a key without spending tokens.
export async function verifyKey(apiKey) {
  try { await getClient(apiKey).models.list({ limit: 1 }); return true; }
  catch (e) { throw mapError(e); }
}
