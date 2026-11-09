/* Günlük Organizer — PWA client (vanilla JS) */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAYS_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const VIEWS = [
  { k: 'today', l: 'Bugün', i: 'sun' },
  { k: 'inbox', l: 'Genel', i: 'inbox' },
  { k: 'routines', l: 'Rutinler', i: 'repeat' },
  { k: 'history', l: 'Geçmiş', i: 'calcheck' },
  { k: 'report', l: 'Rapor', i: 'chart' },
  { k: 'settings', l: 'Ayarlar', i: 'sliders' },
];

const P = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  calcheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sort: '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  puzzle: '<path d="M19.44 12.03a2.5 2.5 0 1 0-3.47-3.47L12 4.59 7.41 9.18a2.5 2.5 0 1 1-3.47 3.47L2 14.59 9.41 22l4.59-4.59a2.5 2.5 0 1 1 3.47-3.47z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/>',
  folderplus: '<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  move: '<path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2"/><path d="m8 16 3-3-3-3"/><path d="M2 16v-1a2 2 0 0 1 2-2h7"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  circle: '<circle cx="12" cy="12" r="10"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  telescope: '<path d="m10.07 12.49-6.18 1.32a.93.93 0 0 1-1.11-.7l-.54-2.15a1.07 1.07 0 0 1 .69-1.27l13.5-4.44"/><path d="m13.56 11.75 4.33-.93"/><path d="m16 21-3.1-6.21"/><path d="M16.49 5.94a2 2 0 0 1 1.45-2.43l1.09-.27a1 1 0 0 1 1.21.73l1.52 6.06a1 1 0 0 1-.73 1.21l-1.09.27a2 2 0 0 1-2.43-1.45z"/><path d="m6.16 8.63 1.11 4.46"/><path d="m8 21 3.1-6.21"/><circle cx="12" cy="13" r="2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-7"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  listplus: '<path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
};
const ico = (n, s = 20, w = 2) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

const store = {
  get(k, d) { try { const v = localStorage.getItem('g_' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('g_' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// Opening the app (new window / tab / the installed app) always starts in Günüm, whichever page it was closed on;
// a reload (F5, the refresh button, a new app version) stays on the page it was on.
const NAV_TYPE = (() => { try { return performance.getEntriesByType('navigation')[0]?.type || ''; } catch { return ''; } })();

const state = {
  view: NAV_TYPE === 'reload' ? store.get('view', 'today') : 'today',
  inboxFilter: 'all',
  rtab: (new Date().getDay() + 6) % 7,
  hmonth: null,
  hday: null,
  idx: {},
  routines: [],
  lists: [],
  lastLoad: 0,
  suppressClick: false,
  sel: new Set(),   // selected card ids (multi-select with Ctrl / Shift)
  anchor: null,     // last plainly/ctrl-clicked card, start of a Shift range
};

// ---------- helpers ----------
// true while the user types in a field (keyboard shortcuts must not fire); safe for any event target
const isTyping = e => e.target instanceof Element && !!e.target.closest('input, textarea, select, [contenteditable]');
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ymd(new Date());
const wdOf = s => (parseD(s).getDay() + 6) % 7;
const fmtLong = s => { const d = parseD(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${DAYS_LONG[wdOf(s)]}`; };
function fmtDue(s) {
  const t = parseD(todayStr()), d = parseD(s), diff = Math.round((d - t) / 864e5);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  if (diff === -1) return 'Dün';
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}
const fmtShort = s => { const d = parseD(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
function daysLabel(m) {
  if (m === 127) return 'Her gün';
  if (m === 31) return 'Hafta içi';
  if (m === 96) return 'Hafta sonu';
  return DAYS.filter((_, i) => m & (1 << i)).join(', ');
}
const srcLabel = s => s === 'reminders' ? ' · Hatırlatıcı' : s === 'extension' ? ' · Eklenti' : '';
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const haptic = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* ignore */ } };

class AuthError extends Error {}
// ---------- undo / redo: one user gesture (click, key, drag) = one step; the server records what it changed ----------
const rid = () => Math.random().toString(36).slice(2, 12);
let undoGrp = rid();
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, () => { undoGrp = rid(); }, true));

async function api(path, opts = {}) {
  let r;
  const method = opts.method || 'GET';
  const headers = opts.body !== undefined ? { 'Content-Type': 'application/json' } : {};
  if (method !== 'GET' && !opts.noUndo) headers['X-Undo'] = undoGrp;
  try {
    r = await fetch('/api' + path, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    // offline / server unreachable: say so once instead of failing silently
    if (!opts.quiet) toast('Bağlantı yok — internetini kontrol edip tekrar dene');
    throw new Error('Sunucuya ulaşılamadı');
  }
  if (r.status === 401 && !opts.noAuthRedirect) { renderLogin(); throw new AuthError(); }
  noteRev(r);
  const us = r.headers.get('X-Undo-State');
  if (us) paintUndo({ can_undo: us[0] === '1', can_redo: us[1] === '1' });
  let data = null;
  try { data = await r.json(); } catch { /* empty */ }
  if (!r.ok) {
    const msg = (data && data.detail) || `Hata (${r.status})`;
    if (!opts.quiet) toast(typeof msg === 'string' ? msg : 'Geçersiz veri');
    throw new Error(msg);
  }
  return data;
}

function paintUndo(st) {
  state.undoSt = st;
  document.querySelectorAll('[data-undo-btn]').forEach(b => { b.disabled = !(b.dataset.undoBtn === 'redo' ? st.can_redo : st.can_undo); });
}
const refreshUndo = () => api('/undo/state', { quiet: true, noAuthRedirect: true }).then(paintUndo).catch(() => {});

async function undoStep(redo) {
  if (state.undoBusy) return;
  state.undoBusy = true;
  try {
    const r = await api(redo ? '/redo' : '/undo', { method: 'POST', noUndo: true });
    if (!r.ok) { toast(redo ? 'Yinelenecek bir işlem yok' : 'Geri alınacak bir işlem yok'); return; }
    if (state.sel && state.sel.size) clearSel();
    state.routines = [];
    await rerender();
    loadLists();
    toast(redo ? 'Yinelendi' : 'Geri alındı', redo ? 'Geri al' : 'Yinele', () => undoStep(!redo));
  } catch { /* api() already said why */ } finally { state.undoBusy = false; }
}

// Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo (inside a text field the browser undoes the typing instead)
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || (e.code !== 'KeyZ' && e.code !== 'KeyY')) return;
  if (!$('#main') || isTyping(e) || $('#sheet-root').innerHTML) return;
  e.preventDefault();
  undoStep(e.code === 'KeyY' || e.shiftKey);
});

let toastTimer;
function toast(msg, action, fn) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); fn(); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2600);
}

// ---------- login ----------
const GOOGLE_LOGO = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const MS_LOGO = '<svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>';

// mode 'in' = sign in (Google / Microsoft, or username / e-mail / phone + password), 'up' = quick sign-up
// ---------- "Kur": colored buttons on top + install guides (phone iOS/Android, Chrome extension, Windows/MacBook) ----------
// The same app everywhere: whichever device it is installed on, signing in brings the same cards, routines and lists.
const WIN_LOGO = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M3 5.5 10.5 4.4v7.1H3zm8.5-1.2L21 3v8.5h-9.5zM3 12.5h7.5v7.1L3 18.5zm8.5 0H21V21l-9.5-1.3z"/></svg>';
const APPLE_LOGO = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0 2.4 2.1 3.2 2.1 3.2s-.3 1.1-1.1 2.3c-.7 1-1.4 1.9-2.4 1.9-1.1 0-1.4-.6-2.6-.6s-1.6.6-2.6.7c-1 0-1.9-1.1-2.5-2-1.4-2-2.4-5.6-1-8 .7-1.2 1.9-2 3.3-2 1 0 2 .7 2.6.7s1.8-.9 3-.7c.5 0 2 .2 2.9 1.6-.1 0-1.7 1-1.7 2.9zM14.4 5.6c.5-.7.9-1.6.8-2.5-.8 0-1.8.5-2.3 1.2-.5.6-1 1.5-.8 2.4.9.1 1.8-.4 2.3-1.1z"/></svg>';
const ANDROID_LOGO = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M17.6 9.5l1.7-3a.4.4 0 0 0-.7-.4l-1.8 3A10 10 0 0 0 12 8.1a10 10 0 0 0-4.8 1l-1.8-3a.4.4 0 0 0-.7.4l1.7 3A9 9 0 0 0 2 16.6h20a9 9 0 0 0-4.4-7.1zM7.5 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm9 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>';

const kurBar = () => `<nav class="kur-bar" aria-label="Kurulum">
  <button type="button" class="kb mob" data-kur="mobil">${ico('phone', 18)}<span>Mobil için kur</span></button>
  <button type="button" class="kb ext" data-kur="eklenti">${ico('puzzle', 18)}<span>Chrome eklentisi kur</span></button>
  <button type="button" class="kb win" data-kur="windows">${WIN_LOGO}<span>Windows için kur</span></button>
  <button type="button" class="kb mac" data-kur="mac">${APPLE_LOGO}<span>MacBook için kur</span></button></nav>`;

// signedIn: the extension download carries the user's own key; otherwise the default one connects itself on sign-in
function installHtml(signedIn) {
  const site = esc(location.origin);
  const url = `<code class="kbd-in">${site}</code> <button type="button" class="rp-link" data-copy-url>Kopyala</button>`;
  const inst = `<button type="button" class="btn kur-inst" data-install hidden>${ico('download', 16)} Tek tıkla kur</button>`;
  return `<section class="kur" id="kur" hidden><div class="kur-in">
    <h2>Günlük'ü kur</h2>
    <p class="kur-lead">Hangi cihaza kurarsan kur, aynı hesapla giriş yaptığında kartların, rutinlerin ve listelerin olduğu gibi gelir.</p>

    <div class="kur-sec" id="kur-mobil" hidden><h3><span class="kdot mob">${ico('phone', 18)}</span>Mobil için kur</h3>
      <p class="kur-q">Telefonun hangisi?</p>
      <div class="kur-pick" data-group="mob"><button type="button" data-os="ios">${APPLE_LOGO} iPhone / iPad</button><button type="button" data-os="android">${ANDROID_LOGO} Android</button></div>
      <div class="kur-os" data-os="ios" hidden>
        <ol class="steps"><li>iPhone'da <b>Safari</b> ile bu adresi aç: ${url}</li>
          <li>Alttaki <b>Paylaş</b> düğmesine (kare ve yukarı ok) dokun.</li>
          <li>Listeden <b>Ana Ekrana Ekle</b>'yi seç, sonra <b>Ekle</b>.</li>
          <li>Ana ekrandaki <b>Günlük</b> simgesinden aç ve giriş yap. Bildirim için: Ayarlar → <b>Bildirimleri aç</b>.</li></ol>
        <p class="kur-note">App Store gerekmez: uygulama Safari'den kurulur, güncellemeler kendiliğinden gelir.</p></div>
      <div class="kur-os" data-os="android" hidden>${inst}
        <ol class="steps"><li>Telefonda <b>Chrome</b> ile bu adresi aç: ${url}</li>
          <li>Sağ üstteki <b>⋮</b> menüsü → <b>Uygulamayı yükle</b> (ya da <b>Ana ekrana ekle</b>).</li>
          <li><b>Yükle</b>'ye dokun: Günlük simgesi ana ekrana ve uygulamalara gelir.</li>
          <li>Simgeden aç ve giriş yap.</li></ol>
        <p class="kur-note">Play Store gerekmez. Chrome yoksa: <a href="https://play.google.com/store/apps/details?id=com.android.chrome" target="_blank" rel="noopener">Chrome'u indir</a></p></div>
    </div>

    <div class="kur-sec" id="kur-eklenti" hidden><h3><span class="kdot ext">${ico('puzzle', 18)}</span>Chrome eklentisi kur</h3>
      <p>Tarayıcının sağ üstünde günün görevleri: kalan sayı simgede görünür; tek tıkla bakar, ekler, tamamlarsın. Chrome ve Edge'de çalışır.</p>
      <a class="btn" href="${signedIn ? '/api/extension.zip' : '/kur/gunluk-eklenti.zip'}" download>${ico('download', 16)} Eklentiyi indir (.zip)</a>
      <ol class="steps"><li>İnen <b>gunluk-eklenti.zip</b>'e sağ tıkla → <b>Tümünü ayıkla</b>. Çıkan klasörü kalıcı bir yere koy (örn. Belgeler); silersen eklenti de gider.</li>
        <li>Chrome'da <code class="kbd-in">chrome://extensions</code> (Edge: <code class="kbd-in">edge://extensions</code>) adresini aç, sağ üstte <b>Geliştirici modu</b>'nu aç.</li>
        <li><b>Paketlenmemiş öğe yükle</b> → <b>gunluk-eklenti</b> klasörünü seç.</li>
        <li>${signedIn ? 'Bitti: eklenti senin hesabınla hazır gelir.' : 'Bu siteye giriş yap: eklenti hesabına <b>kendiliğinden bağlanır</b>, kartların ve rutinlerin gelir.'}</li></ol>
    </div>

    <div class="kur-sec" id="kur-pc" hidden><h3><span class="kdot win">${WIN_LOGO}</span>Bilgisayar için kur</h3>
      <p class="kur-q">Bilgisayarın hangisi?</p>
      <div class="kur-pick" data-group="pc"><button type="button" data-os="windows">${WIN_LOGO} Windows</button><button type="button" data-os="mac">${APPLE_LOGO} MacBook (macOS)</button></div>
      <div class="kur-os" data-os="windows" hidden>${inst}
        <ol class="steps"><li><b>Chrome</b> ya da <b>Edge</b> ile bu adresi aç: ${url}</li>
          <li>Adres çubuğunun sağındaki <b>Yükle</b> simgesine (ekran ve ok) tıkla. Edge'de: <b>⋯ → Uygulamalar → Bu siteyi uygulama olarak yükle</b>.</li>
          <li>Günlük kendi penceresinde açılır; Başlat menüsüne ve masaüstüne gelir. İstersen görev çubuğuna sabitle.</li>
          <li>Giriş yap.</li></ol>
        <p class="kur-note">İndir: <a href="https://www.google.com/chrome/" target="_blank" rel="noopener">Google Chrome</a> · <a href="https://www.microsoft.com/edge/download" target="_blank" rel="noopener">Microsoft Edge</a></p></div>
      <div class="kur-os" data-os="mac" hidden>${inst}
        <ol class="steps"><li><b>Safari</b> ile bu adresi aç: ${url}</li>
          <li>Menüden <b>Dosya → Dock'a Ekle</b>'yi seç, sonra <b>Ekle</b> (macOS Sonoma ve sonrası).</li>
          <li>Chrome kullanıyorsan: <b>⋮ → Kaydet ve paylaş → Sayfayı uygulama olarak yükle</b> (adlar sürüme göre biraz değişebilir).</li>
          <li>Dock'taki Günlük simgesinden aç ve giriş yap.</li></ol>
        <p class="kur-note">İndir: <a href="https://www.google.com/chrome/" target="_blank" rel="noopener">Google Chrome (Mac)</a></p></div>
    </div>
  </div></section>`;
}

function bindKur(root) {
  const pick = (group, os) => {
    const sec = root.querySelector(`.kur-pick[data-group="${group}"]`).closest('.kur-sec');
    sec.querySelectorAll('.kur-pick button').forEach(b => b.classList.toggle('on', b.dataset.os === os));
    sec.querySelectorAll('.kur-os').forEach(d => { d.hidden = d.dataset.os !== os; });
  };
  root.querySelectorAll('.kur-pick button').forEach(b => b.onclick = () => pick(b.parentElement.dataset.group, b.dataset.os));
  root.querySelectorAll('[data-kur]').forEach(b => b.onclick = () => {
    const k = b.dataset.kur;
    if (k === 'windows' || k === 'mac') pick('pc', k);
    const sec = root.querySelector(k === 'mobil' ? '#kur-mobil' : k === 'eklenti' ? '#kur-eklenti' : '#kur-pc');
    root.querySelector('#kur').hidden = false;
    root.querySelectorAll('.kur-sec').forEach(x => { x.hidden = x !== sec; });
    root.querySelectorAll('[data-kur]').forEach(x => x.classList.toggle('on', x === b));
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sec.classList.remove('flash'); void sec.offsetWidth; sec.classList.add('flash');
  });
  root.querySelectorAll('[data-copy-url]').forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(location.origin); toast('Adres kopyalandı'); } catch { prompt('Adres:', location.origin); }
  });
  root.querySelectorAll('[data-install]').forEach(b => b.onclick = installApp);
  paintInstall();
}

// Chrome / Edge / Android offer a one-click install; the button shows only where the browser allows it
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; paintInstall(); });
addEventListener('appinstalled', () => { installEvt = null; toast('Günlük kuruldu ✓'); paintInstall(); });
function paintInstall() {
  document.querySelectorAll('[data-install]').forEach(b => {
    if (standalone()) { b.hidden = false; b.disabled = true; b.textContent = 'Bu cihazda kurulu ✓'; } else b.hidden = !installEvt;
  });
}
async function installApp() {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch { /* closed */ }
  installEvt = null;
  paintInstall();
}

function renderLogin(mode = 'in') {
  const qs = new URLSearchParams(location.search);
  const code = qs.get('login_error') || '';
  const urlErr = code ? (LOGIN_ERRORS[code] || 'Giriş tamamlanamadı, tekrar dene') : '';
  if (urlErr) history.replaceState(null, '', '/');
  const up = mode === 'up';
  $('#app').innerHTML = `${standalone() ? '' : kurBar()}
    <div class="login"><form class="card" id="login" novalidate>
      <img src="/icons/icon-192.png" alt="">
      <h1>Günlük</h1><p>${up ? 'Hızlı kayıt: kendi boş sayfanla başla' : 'Devam etmek için giriş yap'}</p>
      ${document.cookie.includes('g_claim=') ? `<div class="claim-note">📋 Sana atanan görev, giriş yapınca <b>Günüm</b> listene gelecek.${up ? '' : ' Hesabın yoksa aşağıdan hızlıca kayıt olabilirsin.'}</div>` : ''}
      ${up ? `
      <input id="su-name" placeholder="Ad Soyad" autocomplete="name" maxlength="60" required>
      <input id="su-user" placeholder="Kullanıcı adı (örn. ahmet.k)" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="30" required>
      <input id="su-mail" type="email" placeholder="E-posta (isteğe bağlı)" autocomplete="email" autocapitalize="none" maxlength="120">
      <input id="su-phone" type="tel" placeholder="Cep telefonu (isteğe bağlı)" autocomplete="tel" maxlength="20">
      <input id="su-pw" type="password" placeholder="Şifre (en az 6 karakter)" autocomplete="new-password" required>
      <input id="su-pw2" type="password" placeholder="Şifre tekrar" autocomplete="new-password" required>
      <button class="btn" type="submit">Kayıt ol</button>
      <p class="login-alt">Hesabın var mı? <a href="#" data-mode="in">Giriş yap</a></p>` : `
      <div id="oauth"></div>
      <input id="li-login" placeholder="Kullanıcı adı, e-posta veya telefon" autocomplete="username" autocapitalize="none" spellcheck="false" required>
      <input id="li-pw" type="password" placeholder="Şifre" autocomplete="current-password" required>
      <button class="btn" type="submit">Giriş yap</button>
      <p class="login-alt">Hesabın yok mu? <a href="#" data-mode="up">Hızlı kayıt ol</a></p>`}
      <div class="err" id="err">${esc(urlErr)}</div>
    </form><div class="signature" aria-hidden="true"><b>TUNCEL</b><i>Editations</i></div></div>${standalone() ? '' : installHtml(false)}`;
  if (!standalone()) bindKur($('#app'));
  $('#login').querySelectorAll('[data-mode]').forEach(a => a.onclick = e => { e.preventDefault(); renderLogin(a.dataset.mode); });
  if (!up) {
    fetch('/api/auth/providers').then(r => r.json()).then(p => {
      const btns = [p.google && `<a class="btn oauth" href="/auth/google/start">${GOOGLE_LOGO} Google ile giriş yap</a>`,
        p.microsoft && `<a class="btn oauth" href="/auth/microsoft/start">${MS_LOGO} Microsoft (Hotmail/Outlook) ile giriş yap</a>`].filter(Boolean);
      if (btns.length && $('#oauth')) $('#oauth').innerHTML = btns.join('') + '<div class="or"><span>veya</span></div>';
    }).catch(() => {});
  }
  const first = $(up ? '#su-name' : '#li-login');
  if (first && !urlErr && window.innerWidth > 760) first.focus();
  $('#login').onsubmit = async e => {
    e.preventDefault();
    const err = $('#err');
    err.textContent = '';
    let path, body;
    if (up) {
      body = { name: $('#su-name').value, username: $('#su-user').value, email: $('#su-mail').value || null,
               phone: $('#su-phone').value || null, password: $('#su-pw').value };
      if (!body.name.trim() || !body.username.trim()) { err.textContent = 'Ad soyad ve kullanıcı adı gerekli'; return; }
      if (body.password.length < 6) { err.textContent = 'Şifre en az 6 karakter olmalı'; return; }
      if (body.password !== $('#su-pw2').value) { err.textContent = 'Şifreler aynı değil'; return; }
      path = '/signup';
    } else {
      body = { login: $('#li-login').value, password: $('#li-pw').value };
      if (!body.login.trim() || !body.password) { err.textContent = 'Kullanıcı adı / e-posta / telefon ve şifre gerekli'; return; }
      path = '/login';
    }
    try {
      await api(path, { method: 'POST', body, noAuthRedirect: true, quiet: true });
      location.replace('/');  // fresh start as the signed-in user (state, view and theme are theirs)
    } catch (x) { err.textContent = x.message; }
  };
}

// ---------- weather (sidebar under the date; on phones in the Today greeting) ----------
async function loadWeather() {
  try { state.wx = (await api('/weather', { quiet: true })).weather; } catch { return; }
  paintWx();
}

function paintWx() {
  const w = state.wx;
  const side = $('#side-wx');
  if (side) side.innerHTML = w ? `<span class="wx-ico">${w.icon}</span><span class="wx-main"><span class="wx-line"><b>${w.temp}°</b> ${esc(w.text)}</span><small>${esc(w.city)} · ${w.max}° / ${w.min}°</small></span>` : '';
  const hero = $('#hero-wx');
  if (hero) hero.textContent = w ? ` · ${w.icon} ${w.temp}° ${w.city}` : '';
}

// ---------- signed-in user (top right) ----------
const METHOD_LABEL = { google: 'Google ile giriş', microsoft: 'Microsoft ile giriş', 'şifre': 'Şifre ile giriş' };

function avatar(u, size) {
  const name = (u && (u.name || u.email)) || '';
  const initials = name ? name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toLocaleUpperCase('tr')).join('') : '';
  const pic = u && u.picture;
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${pic
    ? `<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer" data-img-fallback>` : ''}${initials ? esc(initials) : ico('user', Math.round(size * 0.55))}</span>`;
}

function paintMe() {
  const b = $('#me-btn');
  if (!b) return;
  const u = state.me;
  b.hidden = false;
  b.innerHTML = `${avatar(u, 34)}<span class="me-txt"><b>${esc((u && (u.name || u.email)) || 'Hesabım')}</b><small>${esc(u && u.email ? u.email : METHOD_LABEL[(u && u.method) || 'şifre'])}</small></span>`;
}

function meMenu() {
  const u = state.me || {};
  return [
    { info: true, html: `<div class="me-card">${avatar(u, 44)}<div><b>${esc(u.name || u.email || 'Günlük')}</b>
      ${u.email ? `<div>${esc(u.email)}</div>` : ''}<small>${METHOD_LABEL[u.method || 'şifre']}${u.created_at ? ' · ' + esc(u.created_at.slice(0, 16)) : ''}</small></div></div>` },
    { sep: true },
    { icon: 'sliders', label: 'Ayarlar', run: () => go('settings') },
    { icon: 'x', label: 'Çıkış yap', danger: true, run: logout },
  ];
}

// ---------- shell ----------
function renderShell() {
  const nav = cls => VIEWS.filter(v => cls !== 'nav-item' || v.k !== 'settings').map(v => `<button class="${cls}" data-view="${v.k}">${ico(v.i, cls === 'nav-item' ? 20 : 22)}<span>${v.l}</span>${v.k === 'today' ? (cls === 'nav-item' ? '<b class="count"></b>' : '<i class="badge" hidden></i>') : ''}</button>`).join('');
  $('#app').innerHTML = `
    <div class="shell">
      <nav class="side"><div class="brand"><img src="/icons/icon-192.png" alt="">Günlük<button class="drawer-close mobile-only" data-drawer-close aria-label="Menüyü kapat">${ico('x', 20)}</button></div>
        <button class="side-search" data-view="search">${ico('search', 17)}<span>Ara</span><kbd>/</kbd></button>${nav('nav-item')}
        <div class="side-h">Listeler</div><div id="side-lists"></div>
        <div class="add-row"><button class="nav-item add-list" data-act="newlist">${ico('listplus', 18)}<span>Yeni liste</span></button>
          <button class="nav-item add-list" data-act="newgroup" title="Listeleri içinde toplayan ana liste">${ico('folderplus', 18)}<span>Ana liste</span></button></div>
        <div class="spacer"></div><div class="side-bottom"><div class="side-tools">${zoomer()}<button class="refresh-btn tool" data-refresh title="Yenile (F5)" aria-label="Yenile">${ico('refresh', 15)}</button><button class="tool side-gear" data-view="settings" title="Ayarlar" aria-label="Ayarlar">${ico('sliders', 15)}</button></div><div class="foot"><div id="side-foot"></div><div id="side-wx" class="wx"></div></div></div></nav>
      <div class="content"><header class="topbar"><button class="side-toggle" data-side-toggle aria-label="Sol menüyü aç / kapat" title="Sol menüyü aç / kapat (Ctrl+B)">${ico('panel', 18)}</button><div class="top-nav mobile-only"><button class="menu-btn" data-drawer aria-label="Listeleri aç">${ico('left', 18)}<span>Listeler</span></button><button class="menu-btn today-btn" data-go-today aria-label="Günüme dön">${ico('sun', 18)}<span>Günüm</span></button></div><button class="refresh-btn icon-only mobile-only" data-refresh aria-label="Yenile">${ico('refresh', 18)}</button><div class="top-zoom mobile-only">${zoomer()}</div><div class="undo-btns"><button class="ub" data-undo-btn="undo" aria-label="Geri al" title="Geri al (Ctrl+Z)" disabled>${ico('undo', 18)}</button><button class="ub" data-undo-btn="redo" aria-label="Yinele" title="Yinele (Ctrl+Y)" disabled>${ico('redo', 18)}</button></div><button class="me" id="me-btn" hidden aria-label="Oturum bilgisi"></button></header>
        <main id="main"></main></div>
      <aside class="rpanel" id="rpanel" aria-label="Dünden kalanlar"><div class="rp-grip" title="Genişliği ayarlamak için sürükle (çift tık: varsayılan)"></div><div id="rp-body"></div></aside>
      <div class="rp-edge" data-left-toggle title="Sağ paneli aç"><button class="rp-notch" id="rp-notch" aria-label="Sağ paneli aç">${ico('left', 14, 2.6)}<b hidden></b></button></div>
      <button class="rp-close" data-left-hide aria-label="Sağ paneli kapat" title="Sağ paneli kapat">${ico('right', 14, 2.6)}</button>
      <nav class="tabbar">${nav('')}</nav>
    </div>`;
  const navClick = async e => {
    if (state.suppressSideClick) { state.suppressSideClick = false; return; }  // the click that ends a drag
    const t = e.target.closest('[data-grp-toggle]');
    if (t) { toggleGroup(t.dataset.grpToggle, t); return; }
    if (e.target.closest('[data-drawer-close]')) { closeDrawer(); return; }
    const dn = e.target.closest('[data-day-nav]');
    if (dn) { closeDrawer(); state.rtab = +dn.dataset.dayNav; go('routines'); return; }
    const b = e.target.closest('[data-view], [data-act="newlist"], [data-act="newgroup"]');
    if (!b) return;
    if (b.dataset.act === 'newlist') { const l = await createFolder(); if (l) { closeDrawer(); go('list:' + l.id); } }
    else if (b.dataset.act === 'newgroup') await createGroup();   // the drawer stays open to show the new group
    else { closeDrawer(); go(b.dataset.view); }
  };
  $('.side').addEventListener('click', navClick);
  bindSideDrag($('.side'));
  bindLongPress($('.side'));  // phone: hold a list in the drawer for its menu (rename, move into an ana liste…)
  $('.topbar [data-drawer]').onclick = openDrawer;
  $('.topbar [data-go-today]').onclick = () => { closeDrawer(); go('today'); };
  $('.tabbar').addEventListener('click', navClick);
  $('.side').addEventListener('contextmenu', e => {
    e.preventDefault();
    const f = e.target.closest('[data-lid]');
    if (f) openMenu(e.clientX, e.clientY, folderMenu(+f.dataset.lid));
    else if (e.target.closest('[data-view="inbox"]')) openMenu(e.clientX, e.clientY, folderMenu(0));
    else openMenu(e.clientX, e.clientY, [
      { icon: 'listplus', label: 'Yeni liste', run: async () => { const l = await createFolder(); if (l) go('list:' + l.id); } },
      { icon: 'folderplus', label: 'Yeni ana liste', run: () => createGroup() },
    ]);
  });
  const main = $('#main');
  main.addEventListener('click', onMainClick);
  main.addEventListener('contextmenu', e => {
    const row = e.target.closest('.item, [data-lid], .done-sec > summary');
    if (!row) return;
    e.preventDefault();
    openCtxFor(row, e.clientX, e.clientY);
  });
  bindLongPress(main);
  bindDrag(main);
  document.querySelectorAll('[data-undo-btn]').forEach(b => b.onclick = () => undoStep(b.dataset.undoBtn === 'redo'));
  refreshUndo();
  $('#me-btn').onclick = () => { const r = $('#me-btn').getBoundingClientRect(); openMenu(r.right - 260, r.bottom + 8, meMenu()); };
  if (state.me !== undefined) paintMe(); else api('/me', { quiet: true }).then(m => { state.me = m.user; paintMe(); }).catch(() => {});
  loadWeather();
  clearInterval(state.wxTimer);
  state.wxTimer = setInterval(loadWeather, 20 * 60 * 1000);
  loadLists().finally(async () => { state.listsFresh = true; if (!(await claimAssigned())) go(state.view); });
}

// came from "Görevi listede aç" in an assignment mail: the task comes into Günüm and its card opens
async function claimAssigned() {
  if (!document.cookie.includes('g_claim=')) return false;
  let r;
  try { r = await api('/assigned/claim', { method: 'POST' }); } catch { return false; }
  if (!r.ok) { if (r.gone) toast('Bu görev bağlantısı artık geçerli değil'); return false; }
  state.view = 'today';
  await go('today');
  await loadLists();
  await new Promise(res => setTimeout(res, 400));  // Günüm finished drawing
  const card = [...document.querySelectorAll('#main .item')].find(e => e.dataset.id === r.item.id);
  if (card) { card.scrollIntoView({ block: 'center' }); card.classList.add('claimed'); setTimeout(() => card.classList.remove('claimed'), 4000); }
  toast(r.how === 'own' ? `"${r.item.title}" zaten senin görevin — Günüm'de`
    : `"${r.item.title}" Günüm'e eklendi${r.item.assigned_by ? ' — ' + r.item.assigned_by + ' atadı' : ''}`);
  return true;
}

const isListView = v => /^list:\d+$/.test(v);
const isUpView = v => /^upcoming:(tomorrow|w[1-4]|month|all)$/.test(v);

async function go(view, keep) {
  if (!VIEWS.some(v => v.k === view) && !isListView(view) && !isUpView(view) && view !== 'search') view = 'today';
  if (isListView(view) && state.lists.length && !realLists().some(l => 'list:' + l.id === view)) view = 'inbox';
  state.view = view;
  store.set('view', view);
  markNav();
  const main = $('#main');
  if (!main) return;
  const y = keep ? window.scrollY : 0;
  if (!keep) { main.innerHTML = '<div class="loading">Yükleniyor…</div>'; state.sel.clear(); state.anchor = null; }
  try {
    if (isListView(view)) await viewInbox(main, +view.slice(5));
    else if (isUpView(view)) await viewUpcoming(main, view.slice(9));
    else await ({ search: viewSearch, today: viewToday, inbox: viewInbox, routines: viewRoutines, history: viewHistory, report: viewReport, settings: viewSettings })[view](main);
    state.lastLoad = Date.now();
    for (const id of state.sel) if (!main.querySelector(`.item[data-id="${id}"]`)) state.sel.delete(id);
    renderSelBar();
    window.scrollTo(0, keep ? y : 0);
    if (state.listsFresh) state.listsFresh = false;  // just loaded by renderShell
    else loadLists();                                // also refreshes the "Bugün" count
  } catch (e) {
    if (!(e instanceof AuthError)) main.innerHTML = `<div class="empty"><div class="big">⚠️</div><b>Yüklenemedi</b>${esc(e.message)}<br><br><button class="btn sm" data-retry>Tekrar dene</button></div>`;
  }
}
const rerender = () => go(state.view, true);

function setCount(n) {
  const c = $('.nav-item .count');
  if (c) c.textContent = n || '';
  const b = $('.tabbar .badge');
  if (b) { b.textContent = n; b.hidden = !n; }
  $('#side-foot') && ($('#side-foot').textContent = fmtLong(todayStr()));
}
const updateCount = () => loadLists();  // the sidebar request carries the "Bugün" count

// ---------- shared rows ----------
// A list card counts as "in My Day" when the task itself is, or when Günüm has an open card with the same title:
// tasks sent to weekdays/recurrence live on as routines, and copies may sit in other lists (state.todayTitles).
// the add box shows every word with a capital first letter; the saved title is the same (Turkish i → İ)
const capWords = t => String(t || '').trim().replace(/(^|\s)(\S)/g, (m, sp, c) => sp + c.toLocaleUpperCase('tr'));
const normTitle = t => String(t || '').trim().toLocaleLowerCase('tr');
const inMyDay = it => it.kind === 'task' && !it.done && state.view !== 'today'
  && (it.my_day || (state.view === 'inbox' || isListView(state.view)) && !!state.todayTitles && state.todayTitles.has(normTitle(it.title)));

// "Ayda bir" cards (a routine on one day of the month, matched by title): yellow frame + "!" at the far right.
// month_day 31 = the last day of the month.
function monthlyNext(md, after = new Date()) {
  const at = (y, m) => new Date(y, m, Math.min(md, new Date(y, m + 1, 0).getDate()));
  const t0 = new Date(after.getFullYear(), after.getMonth(), after.getDate());
  const here = at(t0.getFullYear(), t0.getMonth());
  return here > t0 ? here : at(t0.getFullYear(), t0.getMonth() + 1);
}
function monthlyBang(it) {
  const md = state.monthly && state.monthly.get(normTitle(it.title));
  if (!md) return '';
  const dayTxt = md === 31 ? 'her ayın son günü' : `her ayın ${md}. günü`;
  let tip = `Ayda 1 tekrarlayan görev kartı · ${dayTxt}`;
  if (it.done) {
    const n = monthlyNext(md), now = new Date();
    const when = `${n.getDate()} ${MONTHS[n.getMonth()]}${n.getFullYear() !== now.getFullYear() ? ' ' + n.getFullYear() : ''}`;
    const nextMonth = n.getMonth() !== now.getMonth() || n.getFullYear() !== now.getFullYear();
    tip = `Bu kart ${nextMonth ? 'önümüzdeki ay ' : ''}${when} tarihinde tekrar açılacak`;
  }
  return `<span class="tag mo-bang" data-act="tag" data-tip="${esc(tip)}" aria-label="${esc(tip)}">!</span>`;
}

// the task already repeats (a routine with its title exists): its "Tekrarla" button stays green
const recurs = it => !!state.recurring && state.recurring.has(normTitle(it.title));

function itemRow(it) {
  state.idx[it.id] = it;
  // small icons on the right; the text shows on hover (tap on phones)
  const tags = [];
  const tag = (icon, tip, cls = '') => tags.push(`<span class="tag ${cls}" data-act="tag" data-tip="${esc(tip)}" aria-label="${esc(tip)}">${ico(icon, 14)}</span>`);
  if (it.kind === 'routine') tag('repeat', 'Rutin', 'ok');
  if (it.time) tag('clock', `Saat ${it.time}`);
  if (it.kind === 'task') {
    // in lists, a task that is also in My Day says so in words (user request), not just an icon; on phones only the sun
    if (inMyDay(it)) tags.push(`<span class="myday-badge" data-act="tag" data-tip="Günüm görünümünde">${ico('sun', 12)}<span class="myday-txt">Günüm</span></span>`);
    if (it.due_date) tag('cal', `${it.overdue ? 'Gecikti — son tarih' : 'Son tarih'}: ${fmtDue(it.due_date)} · ${fmtShort(it.due_date)} — 2 kere tıklarsanız son tarih kaldırılacaktır`, `due ${it.overdue ? 'red' : ''}`);
    if (it.steps && it.steps.length) tag('check', `Adımlar: ${it.steps.filter(x => x.d).length}/${it.steps.length}`);
    if (it.remind_at && !it.done) tag('bell', `Hatırlatma: ${fmtRemind(it.remind_at)}`, 'accent');
    if (it.notes) tag('note', 'Not: ' + it.notes.replace(/\s+/g, ' ').slice(0, 70) + (it.notes.length > 70 ? '…' : ''));
    if (it.list_name && state.view !== 'list:' + it.list_id) tag('list', `Liste: ${it.list_name}`);
    if (it.assigned_by) tag('send', `${it.assigned_by} sana atadı — tamamlayınca haberi olur`, 'accent');
  }
  if (it.done && it.done_at) tag('check', `Tamamlandı ${it.done_at.slice(11, 16)}${srcLabel(it.source)}`, 'ok');
  const pinned = it.pinned && !it.done;
  const bang = monthlyBang(it);
  const pulse = state.view === 'today' && it.important && !it.done;
  const once = it.kind === 'task' && it.once && !it.done ? onceBadge(it.once) : '';
  const a = it.kind === 'task' && it.assignee, aTip = a ? `Atandı: ${a.name}${a.email ? ' · ' + a.email : ''}` : '';
  const who = a ? `<span class="tag who-badge" data-act="tag" data-tip="${esc(aTip)}" aria-label="${esc(aTip)}">${esc(initialsOf(a.name))}</span>` : '';
  return `<div class="item ${it.done ? 'done' : ''} ${pinned ? 'pinned' : ''} ${bang ? 'monthly' : ''} ${once ? 'once' : ''} ${pulse ? 'imp-pulse' : ''} ${state.sel.has(it.id) ? 'selected' : ''}" data-id="${it.id}">
    <span class="grip" title="Sürükle">${ico('grip', 16, 2.6)}</span>
    <button class="chk" data-act="toggle" aria-label="${it.done ? 'Geri al' : 'Tamamla'}">${ico('check', 14, 3)}</button>
    <div class="item-body" data-act="open"><div class="item-title">${esc(it.title)}</div></div>
    ${tags.length ? `<div class="item-tags">${tags.join('')}</div>` : ''}
    ${it.kind === 'task' && !it.done ? `<button class="star rep ${recurs(it) ? 'on' : ''}" data-act="recur" aria-label="Tekrarla" title="${recurs(it) ? 'Tekrarlanıyor — değiştir' : 'Tekrarla'}">${ico('repeat', 18)}</button>` : ''}
    <button class="star pin ${it.pinned ? 'on' : ''}" data-act="pin" aria-label="${it.pinned ? 'Sabitlemeyi kaldır' : 'Başa sabitle'}" title="${it.pinned ? 'Sabitlemeyi kaldır' : 'Başa sabitle'}">${ico('pin', 18)}</button>
    <button class="star ${it.important ? 'on' : ''}" data-act="star" aria-label="Önemli" title="Önemli">${ico('star', 18)}</button>
    ${bang}${once}${who}
  </div>`;
}

// "Sadece 1 seferlik" card: says which day it comes (or that today is its only day) and that it will not repeat
function onceBadge(d) {
  const tip = d === todayStr() ? 'Sadece 1 seferlik — yalnızca bugün Günüm\'de, tekrar etmeyecek'
    : `Sadece 1 seferlik — ${DAYS_LONG[wdOf(d)]} ${fmtShort(d)} günü Günüm'e gelecek, tekrar etmeyecek`;
  return `<span class="tag once-badge" data-act="tag" data-tip="${esc(tip)}" aria-label="${esc(tip)}">1×<small>${d === todayStr() ? 'bugün' : esc(fmtShort(d))}</small></span>`;
}

// Icon button with a transparent native date/time input on top (tap opens the system picker).
const pickBtn = (type, id, icon, title) => `<label class="pick" title="${title}">${ico(icon, 18)}<span class="pv"></span>
  <input type="${type}" id="${id}" data-pick></label>`;

// open cards as a foldable "Tamamlanmayanlar (N)" group, like the completed ones below; open unless folded by the user
const openSection = (n, listHtml) => n ? `
  <details class="open-sec" ${store.get('openOpen_' + state.view, true) ? 'open' : ''}>
    <summary>${ico('down', 16)} Tamamlanmayanlar (${n})</summary>
    ${listHtml}
  </details>` : listHtml;

const doneSection = items => items.length ? `
  <details class="done-sec" ${store.get('doneOpen_' + state.view, false) ? 'open' : ''}>
    <summary>${ico('down', 16)} Tamamlananlar (${items.length})</summary>
    <div class="list">${[...items].sort((a, b) => (b.done_at || '').localeCompare(a.done_at || '')).map(itemRow).join('')}</div>
  </details>` : '';  // newest completion first

// Card details open on a double click / double tap only; a single click on the card does nothing.
let lastTap = { key: null, t: 0 };
async function clearDue(it) {
  const was = it.due_date;
  try { await api(`/tasks/${it.task_id}`, { method: 'PATCH', body: { due_date: null } }); } catch { return; }
  await rerender(); loadLists();
  toast('Son tarih kaldırıldı', 'Geri al', async () => {
    await api(`/tasks/${it.task_id}`, { method: 'PATCH', body: { due_date: was } });
    rerender(); loadLists();
  });
}

function isDoubleTap(key) {
  const now = Date.now();
  const dbl = lastTap.key === key && now - lastTap.t < 450;
  lastTap = dbl ? { key: null, t: 0 } : { key, t: now };
  return dbl;
}

async function onMainClick(e) {
  if (state.suppressClick) { state.suppressClick = false; e.preventDefault(); return; }
  const el = e.target.closest('[data-act]');
  if (!el) {
    const card = e.target.closest('.item[data-id]');
    if (card && state.idx[card.dataset.id]) selectClick(card, e);   // padding / grip area of a card
    else if (!card && state.sel.size) clearSel();                   // click on empty space
    return;
  }
  const act = el.dataset.act;
  if (act === 'newlist') { const l = await createFolder(); if (l) go('list:' + l.id); return; }
  if (act === 'search') { go('search'); return; }
  if (act === 'tag' && el.classList.contains('due')) {
    // double click / tap on the due-date icon removes only the due date (repeat, list, My Day … stay as they are)
    const row = el.closest('.item'), it = row && state.idx[row.dataset.id];
    if (it && it.kind === 'task' && isDoubleTap('due:' + it.id)) { clearDue(it); return; }
    if (touchUi()) toast(el.dataset.tip);
    return;
  }
  if (act === 'tag') { if (touchUi() || el.classList.contains('mo-bang')) toast(el.dataset.tip); return; }  // desktop shows it on hover
  if (act === 'foldermenu') { const r = el.getBoundingClientRect(); openMenu(r.right - 230, r.bottom + 6, folderMenu(+el.dataset.lid)); return; }
  if (act === 'sortset') { const lid = el.dataset.lid === 'today' ? 'today' : +el.dataset.lid; setSort(lid, sortOf(lid) === el.dataset.mode ? 'manual' : el.dataset.mode); return; }
  if (act === 'sortmenu') { const r = el.getBoundingClientRect(); openMenu(r.left, r.bottom + 6, sortItems(el.dataset.lid === 'today' ? 'today' : +el.dataset.lid)); return; }
  if (act === 'todaymenu') { const r = el.getBoundingClientRect(); openMenu(r.right - 230, r.bottom + 6, todayMenu()); return; }
  if (act === 'ropen' && el.classList.contains('item-body') && !isDoubleTap('R' + el.closest('[data-rid]').dataset.rid)) return;
  if (act === 'ropen') { openRoutineSheet(state.routines.find(r => r.id === +el.closest('[data-rid]').dataset.rid)); return; }
  const row = el.closest('.item');
  const it = row && state.idx[row.dataset.id];
  if (!it) return;
  if (act === 'toggle') toggleItem(it, row);
  else if (act === 'star') {
    await patchItem(it, { important: !it.important });
    rerender();
  } else if (act === 'recur') {
    const r = el.getBoundingClientRect();
    openMenu(r.right - 250, r.bottom + 6, recurMenu(it));
  } else if (act === 'pin') togglePin(it); else if (act === 'open') {
    const dbl = !e.shiftKey && !e.ctrlKey && !e.metaKey && isDoubleTap(it.id);
    if (!dbl) { selectClick(row, e); return; }
    clearSel();
    if (it.kind === 'task') openTaskSheet(it);
    else {
      if (!state.routines.length) state.routines = (await api('/routines')).items;
      const r = state.routines.find(x => x.id === it.routine_id);
      if (r) openRoutineSheet(r); else toast('Bu rutin silinmiş');
    }
  }
}

// a routine card's pin/star lives on the routine itself, so it holds on every day the routine comes back
const patchItem = (it, body) => it.kind === 'routine'
  ? api(`/routines/${it.routine_id}`, { method: 'PATCH', body })
  : api(`/tasks/${it.task_id}`, { method: 'PATCH', body });

async function togglePin(it) {
  await patchItem(it, { pinned: !it.pinned });
  toast(it.pinned ? 'Sabitleme kaldırıldı' : 'Başa sabitlendi 📌');
  rerender();
}

async function toggleItem(it, row) {
  const done = !it.done;
  if (done) { row.classList.add('completing'); haptic(); }
  try {
    await api(`/items/${it.id}/done`, { method: 'POST', body: { done } });
  } catch { row.classList.remove('completing'); return; }
  it.done = done;
  if (done) {
    celebrateIfAllDone();  // the last open card of the day → party
    setTimeout(() => row.classList.add('leaving'), 380);
    setTimeout(rerender, 760);
    toast('Tamamlandı ✓', 'Geri al', async () => {
      await api(`/items/${it.id}/done`, { method: 'POST', body: { done: false } });
      rerender();
    });
  } else rerender();
}

function ring(done, total) {
  const r = 30, c = 2 * Math.PI * r, p = total ? done / total : 0;
  return `<div class="ring"><svg width="74" height="74" viewBox="0 0 74 74">
    <circle class="bg" cx="37" cy="37" r="${r}"/><circle class="fg" cx="37" cy="37" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/>
    </svg><div class="lbl">${done}/${total}</div></div>`;
}

// ---------- Today ----------
async function viewToday(main) {
  const data = await api('/today');
  state.idx = {};
  const mode = sortOf('today');
  const openRaw = data.items.filter(i => !i.done);
  const open = mode === 'manual' ? openRaw.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))  // pinned on top
    : sortTasks(openRaw, mode, true);
  const done = data.items.filter(i => i.done);
  state.todayTotal = data.items.length;
  const h = new Date().getHours();
  const hi = h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const left = (open.length ? `${open.length} görev kaldı` : (data.items.length ? 'Hepsi tamam 🎉' : 'Liste boş'))
    + (data.items.length ? ` · ${done.length} yapıldı · ${data.items.length} toplam` : '');
  main.innerHTML = `<div class="wrap">
    <section class="hero">
      <div class="hero-main"><p class="hello">${hi}</p>
        <div class="hero-row"><h1>Bugün</h1><p class="greet">${left}<span id="hero-wx" class="mobile-only"></span></p></div>
        <p class="sub hero-date">${fmtLong(data.date)}</p></div>
      <div class="hero-side">${mode !== 'manual' ? `<button class="sort-tag" data-lid="today" data-act="sortmenu" title="Sıralama">${ico('sort', 13)} ${SORTS[mode]}</button>` : ''}${ring(done.length, data.items.length)}<button class="hero-dots" data-act="todaymenu" aria-label="Günüm seçenekleri" title="Sırala, yazdır, paylaş">${ico('dots', 18)}</button></div>
    </section>
    ${open.length ? sortToggle('today') : ''}${openSection(open.length, `<div class="list" ${mode === 'manual' ? 'data-sortable="today"' : ''}>${open.map(itemRow).join('')}</div>`)}
    ${open.length ? '' : data.items.length
      ? `<div class="empty"><div class="big">🎉</div><b>Bugünlük her şey tamam</b>Harika iş çıkardın.</div>`
      : `<div class="empty"><div class="big">☀️</div><b>Bugün için görev yok</b>Aşağıdan görev ekle ya da Rutinler'den günlerine görev tanımla.</div>`}
    ${doneSection(done)}
    <form class="quick-add sticky" id="qa">${ico('plus')}<input id="qa-in" placeholder="Bugüne görev ekle" enterkeyhint="done" autocomplete="off" maxlength="300">${findBox()}<button class="btn sm" type="submit">Ekle</button></form>
  </div>`;
  setCount(open.length);
  bindFind({ today: true });
  paintWx();
  $('#qa').onsubmit = async e => {
    e.preventDefault();
    const v = capWords($('#qa-in').value);
    if (!v) return;
    await api('/tasks', { method: 'POST', body: { title: v, my_day: true } });
    await rerender();
    $('#qa-in') && $('#qa-in').focus();
  };
}

// ---------- Inbox (Genel) and folders ----------
async function viewInbox(main, listId = 0) {
  const folder = listId ? realLists().find(l => l.id === listId) : null;
  if (listId && !folder) { go('inbox'); return; }
  const [open, done, today] = await Promise.all([api('/tasks?list=' + listId), api(`/tasks?done=true&list=${listId}`),
    api('/today', { quiet: true }).catch(() => null)]);
  state.todayTitles = today ? new Set(today.items.filter(i => !i.done).map(i => normTitle(i.title))) : null;
  state.idx = {};
  const f = state.inboxFilter;
  const mode = sortOf(listId);
  const items = sortTasks(open.items.filter(t => f === 'all' || (f === 'important' && t.important) || (f === 'planned' && t.due_date) || (f === 'myday' && inMyDay(t))), mode);
  const fb = (k, l) => `<button class="${f === k ? 'on' : ''}" data-f="${k}">${l}</button>`;
  const chip = (lid, name, on) => `<button class="fchip ${on ? 'on' : ''}" data-view="${lid ? 'list:' + lid : 'inbox'}" data-lid="${lid}">${ico(lid ? 'list' : 'inbox', 15)} ${esc(name)}</button>`;
  main.innerHTML = `<div class="wrap">
    <div class="folders mobile-only">${chip(0, 'Genel', !listId)}${realLists().map(l => chip(l.id, l.name, l.id === listId)).join('')}
      <button class="fchip add" data-act="newlist">${ico('listplus', 15)} Liste</button></div>
    <div class="page-h"><div><h1>${folder ? esc(folder.name) : 'Genel'}</h1><p class="sub">${open.items.length} açık görev${folder ? '' : ' · listesiz görevler'}${mode !== 'manual' ? ` · <button class="sort-tag" data-lid="${listId}" data-act="sortmenu">${ico('sort', 13)} ${SORTS[mode]}</button>` : ''}</p></div>
      <div class="row"><button class="btn ghost icon ls-btn" data-act="lsearch" aria-label="Bu listede ara" title="Bu listede ara">${ico('search', 18)}</button>
      <button class="btn ghost icon" data-lid="${listId}" data-act="foldermenu" aria-label="Liste seçenekleri">${ico('dots', 18)}</button></div></div>
    <div class="ls-bar" hidden>${ico('search', 17)}<input id="ls-in" type="search" placeholder="Bu listede ara… (birkaç kelime yazabilirsin)" autocomplete="off" enterkeyhint="search" maxlength="100">
      <span class="ls-n"></span><button type="button" class="ls-x" aria-label="Aramayı kapat">${ico('x', 16)}</button></div>
    <div class="ls-empty" hidden>Bu listede eşleşen görev yok</div>
    <form class="quick-add" id="qa">${ico('plus')}<input id="qa-in" placeholder="${folder ? esc(folder.name) + ' listesine görev ekle' : 'Yeni görev ekle'}" enterkeyhint="done" autocomplete="off" maxlength="300">
      ${pickBtn('date', 'qa-date', 'cal', 'Son tarih')}${findBox()}<button class="btn sm" type="submit">Ekle</button></form>
    <div class="filters">${fb('all', 'Tümü')}${fb('important', '★ Önemli')}${fb('planned', 'Tarihli')}${fb('myday', '☀ Bugünde')}</div>
    ${items.length ? sortToggle(listId) : ''}${openSection(items.length, `<div class="list" ${f === 'all' && mode === 'manual' ? 'data-sortable="tasks"' : ''}>${items.map(itemRow).join('')}</div>`)}
    ${items.length ? '' : `<div class="empty"><div class="big">${folder ? '📋' : '📥'}</div><b>${f !== 'all' ? 'Bu filtrede görev yok' : folder ? 'Liste boş' : 'Genel alan boş'}</b>Görev ekle. Bir göreve sağ tıklayarak (telefonda basılı tutarak) taşıyabilir, tekrarlatabilir, tarih verebilirsin.</div>`}
    ${doneSection(done.items)}
  </div>`;
  bindFind({ listId });
  bindListSearch(main);
  main.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { state.inboxFilter = b.dataset.f; rerender(); });
  main.querySelectorAll('.folders [data-view]').forEach(b => b.onclick = () => { if (!state.suppressClick) go(b.dataset.view); });
  $('#qa').onsubmit = async e => {
    e.preventDefault();
    const v = capWords($('#qa-in').value);
    if (!v) return;
    await api('/tasks', { method: 'POST', body: { title: v, due_date: $('#qa-date').value || null, list_id: listId || null } });
    await rerender();
    $('#qa-in') && $('#qa-in').focus();
  };
}

// ---------- search inside a list: every typed word (any order) must be in the card's title or note ----------
state.listQ = state.listQ || {};
function bindListSearch(main) {
  const bar = main.querySelector('.ls-bar'), inp = bar.querySelector('#ls-in'), key = state.view;
  const titles = new Map();  // card → its plain title html, to put back after highlighting
  const apply = () => {
    const words = normTitle(inp.value).split(/\s+/).filter(Boolean);
    state.listQ[key] = inp.value;
    let n = 0;
    main.querySelectorAll('.list .item[data-id]').forEach(card => {
      const it = state.idx[card.dataset.id], t = card.querySelector('.item-title');
      if (!it || !t) return;
      if (!titles.has(card)) titles.set(card, t.innerHTML);
      const hay = normTitle(it.title + ' ' + (it.notes || ''));
      const ok = words.every(w => hay.includes(w));
      card.hidden = !ok;
      if (ok && words.length) n++;
      let h = esc(it.title);
      if (ok && words.length) {  // highlight the words in the title
        const low = normTitle(it.title), marks = new Array(it.title.length).fill(false);
        words.forEach(w => { for (let i = low.indexOf(w); i >= 0; i = low.indexOf(w, i + 1)) for (let j = i; j < i + w.length; j++) marks[j] = true; });
        if (low.length === it.title.length) h = [...it.title].map((c, i) => (marks[i] && !marks[i - 1] ? '<mark>' : '') + esc(c) + (marks[i] && !marks[i + 1] ? '</mark>' : '')).join('');
      }
      t.innerHTML = words.length ? h : titles.get(card);
    });
    // a match among the completed ones opens that group
    const ds = main.querySelector('.done-sec');
    if (ds && words.length && ds.querySelector('.item:not([hidden])')) ds.open = true;
    main.querySelectorAll('.open-sec, .done-sec').forEach(s => s.hidden = !!words.length && !s.querySelector('.item:not([hidden])'));
    bar.querySelector('.ls-n').textContent = words.length ? `${n} sonuç` : '';
    main.querySelector('.ls-empty').hidden = !words.length || n > 0;
  };
  const open = () => { bar.hidden = false; inp.focus(); };
  const close = () => { inp.value = ''; apply(); bar.hidden = true; delete state.listQ[key]; };
  main.querySelector('[data-act="lsearch"]').onclick = e => { e.stopPropagation(); bar.hidden ? open() : close(); };
  bar.querySelector('.ls-x').onclick = close;
  inp.oninput = apply;
  inp.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  if (state.listQ[key]) { inp.value = state.listQ[key]; bar.hidden = false; apply(); }  // keep the search after an edit / refresh
}

// ---------- find & bring: search button in the add box (Günüm and lists) ----------
// The button grows into a search field; a few letters suggest existing tasks; picking one brings it here
// (Günüm: added to My Day; a list: moved into that list). A completed task is reopened.
const findBox = () => `<button type="button" class="qa-find" data-find-open aria-label="Görev ara" title="Var olan görevi ara ve buraya getir">${ico('search', 18)}</button>
  <div class="qa-search">${ico('search', 18)}<input id="qa-s" type="search" placeholder="Görev ara… (birkaç harf yeter)" autocomplete="off" enterkeyhint="go" maxlength="100">
    <button type="button" class="qa-x" data-find-close aria-label="Aramayı kapat">${ico('x', 16)}</button></div>
  <div class="qa-sug" hidden></div><div class="qa-ghost" hidden></div>`;

function bindFind(target) {
  const form = $('#qa');
  if (!form) return;
  const inp = form.querySelector('#qa-s'), box = form.querySelector('.qa-sug');
  let seq = 0, timer = null, results = [], active = 0;
  const here = target.today ? 'Günüm' : (realLists().find(l => l.id === target.listId) || { name: 'Genel' }).name;
  const open = () => { form.classList.add('finding'); inp.value = ''; setTimeout(() => inp.focus(), 60); paint(); };
  const close = () => { form.classList.remove('finding'); box.hidden = true; inp.value = ''; results = []; };
  const mark = (title, n) => {
    const i = normTitle(title).indexOf(n);
    return i < 0 ? esc(title) : esc(title.slice(0, i)) + '<mark>' + esc(title.slice(i, i + n.length)) + '</mark>' + esc(title.slice(i + n.length));
  };
  function paint() {
    const n = normTitle(inp.value);
    if (!n) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = results.length ? results.map((t, i) => `<button type="button" class="sug ${i === active ? 'on' : ''}" data-i="${i}">
        <span class="sug-t">${mark(t.title, n)}</span>
        <span class="sug-m">${t.done ? 'tamamlandı · ' : ''}${t.my_day ? '☀ Günüm · ' : ''}${esc(t.list_name || 'Genel')}</span></button>`).join('')
      : `<div class="sug-empty">Eşleşen görev yok</div>`;
  }
  // existing tasks matching q that are not already here, best first (title start, word start, inside, notes; done last)
  async function matches(q) {
    const r = await api('/search?q=' + encodeURIComponent(q), { quiet: true });
    const n = normTitle(q);
    const rank = t => { const s = normTitle(t.title); return (s.startsWith(n) ? 0 : s.split(/\s+/).some(w => w.startsWith(n)) ? 1 : s.includes(n) ? 2 : 3) + (t.done ? 10 : 0); };
    return r.tasks
      .filter(t => !t.done && (target.today ? !t.my_day : (t.list_id || 0) !== (target.listId || 0)))  // open, and not already here
      .map(t => ({ t, k: rank(t) })).sort((a, b) => a.k - b.k);
  }
  async function lookup() {
    const q = inp.value.trim(), my = ++seq;
    if (!q) { results = []; paint(); return; }
    let m;
    try { m = await matches(q); } catch { return; }
    if (my !== seq) return;  // an older answer arrived late
    results = m.slice(0, 8).map(x => x.t);
    active = 0;
    paint();
  }
  async function pick(t) {
    if (!t) return;
    close();
    const body = target.today ? { my_day: true } : { list_id: target.listId || null };
    const undoBody = target.today ? { my_day: false } : { list_id: t.list_id || null };
    try {
      if (t.done) await api(`/items/${t.id}/done`, { method: 'POST', body: { done: false } });
      await api(`/tasks/${t.task_id}`, { method: 'PATCH', body });
    } catch { return; }
    await rerender(); loadLists();
    if ($('#qa-in')) $('#qa-in').focus();
    toast(`"${t.title}" → ${here}`, 'Geri al', async () => {
      await api(`/tasks/${t.task_id}`, { method: 'PATCH', body: undoBody });
      if (t.done) await api(`/items/${t.id}/done`, { method: 'POST', body: { done: true } });
      rerender(); loadLists();
    });
  }
  form.querySelector('[data-find-open]').onclick = open;
  form.querySelector('[data-find-close]').onclick = close;
  inp.oninput = () => { clearTimeout(timer); timer = setTimeout(lookup, 120); };
  inp.onkeydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) { active = (active + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length; paint(); }
    } else if (e.key === 'Tab' && results[active] && !e.shiftKey) { e.preventDefault(); inp.value = results[active].title; lookup(); }  // complete the name
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]); }
  };
  box.onmousedown = e => e.preventDefault();  // keep the focus in the field while clicking a suggestion
  box.onclick = e => { const b = e.target.closest('.sug'); if (b) pick(results[+b.dataset.i]); };

  // Ghost suggestions on the add box: from 4 letters on, EVERY existing card whose name matches floats faintly above
  // the box (best match nearest to the box). Nothing is filled in; typing goes on undisturbed.
  // ↑ (or → with the cursor at the end) steps into the list, ↑/↓ move, Enter brings the chosen card here.
  // Plain Enter still adds the typed text as a new task. Phone / mouse: tap or click a card.
  const add = form.querySelector('#qa-in'), ghost = form.querySelector('.qa-ghost');
  if (!add || !ghost) return;
  let gseq = 0, gtimer = null, gl = [], gi = -1, gmore = 0;  // gl: matches, best first; gi: chosen one (-1 = none)
  const SHOW = 6;
  const gpaint = () => {
    ghost.hidden = !gl.length;
    ghost.classList.toggle('on', gi >= 0);
    if (!gl.length) return;
    const n = normTitle(add.value.trim());
    const hint = gi >= 0 ? '<kbd>Enter</kbd> buraya getir · <kbd>↑</kbd><kbd>↓</kbd> seç · <kbd>Esc</kbd> vazgeç'
      : matchMedia('(pointer: fine)').matches ? '<kbd>↑</kbd> veya <kbd>→</kbd> ile seç, <kbd>Enter</kbd> ile getir · ya da tıkla' : 'dokun: buraya getir';
    // best match at the bottom, right above the box
    ghost.innerHTML = `<div class="qg-h"><span>${gl.length + gmore} ilgili kart${gmore ? ` · ilk ${SHOW} gösteriliyor` : ''}</span><span class="qg-k">${hint}</span></div>`
      + gl.map((t, i) => ({ t, i })).reverse().map(({ t, i }) => `<button type="button" class="qg-row ${i === gi ? 'on' : ''}" data-gi="${i}">
        <span class="qg-t">${mark(t.title, n)}</span><span class="qg-m">${t.done ? 'tamamlandı · ' : ''}${t.my_day ? '☀ Günüm · ' : ''}${esc(t.list_name || 'Genel')}</span></button>`).join('');
    const on = ghost.querySelector('.qg-row.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  };
  const gclear = () => { gl = []; gi = -1; gmore = 0; gpaint(); };
  async function glook() {
    const q = add.value.trim(), my = ++gseq;
    if ([...q].length < 4) { gclear(); return; }
    let m;
    try { m = await matches(q); } catch { return; }
    if (my !== gseq || add.value.trim() !== q) return;
    const named = m.filter(x => x.k <= 2 || (x.k >= 10 && x.k <= 12)).map(x => x.t);  // a match in the name, not only in the notes
    gl = named.slice(0, SHOW);
    gmore = Math.max(0, named.length - SHOW);
    gi = -1;
    gpaint();
  }
  const bring = t => { if (!t) return; add.value = ''; gclear(); pick(t); };
  add.addEventListener('input', () => { gi = -1; clearTimeout(gtimer); gtimer = setTimeout(glook, 150); gpaint(); });
  add.addEventListener('keydown', e => {
    if (!gl.length || e.isComposing) return;
    const atEnd = add.selectionStart === add.value.length && add.selectionEnd === add.value.length;
    if (e.key === 'ArrowUp') { e.preventDefault(); gi = Math.min(gl.length - 1, gi + 1); gpaint(); }        // up = towards the top of the list
    else if (e.key === 'ArrowRight' && atEnd && gi < 0) { e.preventDefault(); gi = 0; gpaint(); }
    else if (e.key === 'ArrowDown' && gi >= 0) { e.preventDefault(); gi -= 1; gpaint(); }                      // back down to the box
    else if (e.key === 'Enter' && gi >= 0) { e.preventDefault(); e.stopPropagation(); bring(gl[gi]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); gclear(); }  // Esc closes the list (the text stays)
  });
  // a click anywhere else (empty space included) closes the list; clicks on the list itself keep the focus (mousedown below)
  add.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== add) gclear(); }, 120));
  state.ghostClose = () => { if (gl.length) gclear(); };
  form.addEventListener('submit', () => gclear(), true);
  ghost.onmousedown = e => e.preventDefault();  // keep typing focus
  ghost.onclick = e => { const b = e.target.closest('.qg-row'); if (b) bring(gl[+b.dataset.gi]); };
}

// one listener for the whole app: a click outside the add box closes its suggestion list
document.addEventListener('pointerdown', e => { if (state.ghostClose && !e.target.closest('#qa')) state.ghostClose(); }, true);

// ---------- Rapor: performance by day / week / month / year / any range, with comparisons and charts ----------
const REP_TABS = [['day', 'Günlük'], ['week', 'Haftalık'], ['month', 'Aylık'], ['year', 'Yıllık'], ['custom', 'Özel aralık']];
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function repRange(kind, off) {
  const t = parseD(todayStr());
  if (kind === 'day') { const d = addDays(t, off); return [d, d]; }
  if (kind === 'week') { const mon = addDays(t, -((t.getDay() + 6) % 7) + 7 * off); return [mon, addDays(mon, 6)]; }
  if (kind === 'month') { const a = new Date(t.getFullYear(), t.getMonth() + off, 1); return [a, new Date(a.getFullYear(), a.getMonth() + 1, 0)]; }
  const a = new Date(t.getFullYear() + off, 0, 1);
  return [a, new Date(a.getFullYear(), 11, 31)];
}

function repTitle(kind, off, a, b) {
  const s = d => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  if (kind === 'day') return off === 0 ? `Bugün · ${fmtLong(ymd(a))}` : off === -1 ? `Dün · ${fmtLong(ymd(a))}` : fmtLong(ymd(a));
  if (kind === 'week') return `${off === 0 ? 'Bu hafta' : off === -1 ? 'Geçen hafta' : 'Hafta'} · ${s(a)} – ${s(b)}`;
  if (kind === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()}${off === 0 ? ' · bu ay' : ''}`;
  if (kind === 'year') return `${a.getFullYear()}${off === 0 ? ' · bu yıl' : ''}`;
  return `${s(a)} ${a.getFullYear()} – ${s(b)} ${b.getFullYear()}`;
}

const repDelta = (cur, prev) => {
  if (!prev) return cur ? '<span class="rd up">▲ yeni</span>' : '<span class="rd">—</span>';
  const p = Math.round((cur - prev) / prev * 100);
  return p === 0 ? '<span class="rd">= aynı</span>' : `<span class="rd ${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} %${Math.abs(p)}</span>`;
};

async function viewReport(main) {
  const st = state.rep = state.rep || store.get('rep', { kind: 'week', off: 0 });
  if (!REP_TABS.some(t => t[0] === st.kind)) st.kind = 'week';
  let a, b;
  if (st.kind === 'custom') {
    a = parseD(st.from || ymd(addDays(parseD(todayStr()), -29)));
    b = parseD(st.to || todayStr());
  } else [a, b] = repRange(st.kind, st.off || 0);
  const r = await api(`/report?start=${ymd(a)}&end=${ymd(b)}`);
  state.repData = r;
  store.set('rep', { kind: st.kind, off: st.off || 0, from: st.from, to: st.to });
  const q = r.quick, c = r.cur, p = r.prev;
  const quick = [
    ['day', 'Bugün', 'Dün'], ['week', 'Bu hafta', 'Geçen hafta'], ['month', 'Bu ay', 'Geçen ay'], ['year', 'Bu yıl', 'Geçen yıl'],
  ].map(([k, now, before]) => {
    const x = q[k];
    const same = k === 'day' ? '' : `<div class="rq-l">${before} bu noktada: <b>${x.prev_same.done}</b> ${repDelta(x.cur.done, x.prev_same.done)}</div>`;
    return `<div class="rq">
      <div class="rq-h">${now}</div>
      <div class="rq-n">${x.cur.done}<small>tamamlandı</small></div>
      <div class="rq-l">${before}: <b>${x.prev.done}</b>${k === 'day' ? ' ' + repDelta(x.cur.done, x.prev.done) : ''}</div>${same}
      <div class="rq-l muted">Eklenen ${x.cur.added} · ${before.toLowerCase()} ${x.prev.added}</div></div>`;
  }).join('');
  const prevLbl = { day: 'önceki gün', week: 'önceki hafta', month: 'önceki ay', year: 'önceki yıl', custom: 'önceki dönem' }[st.kind];
  const kpi = (h, n, sub) => `<div class="rk"><div class="rk-h">${h}</div><div class="rk-n">${n}</div><div class="rk-s">${sub}</div></div>`;
  const kpis = [
    kpi('Tamamlanan', c.done, `${c.tasks} görev · ${c.routines} rutin<br>${prevLbl}: ${p.done} ${repDelta(c.done, p.done)}`),
    kpi('Yeni eklenen', c.added, `${prevLbl}: ${p.added} ${repDelta(c.added, p.added)}`),
    kpi('Rutin uyumu', c.routine_rate == null ? '—' : '%' + c.routine_rate, c.due ? `${c.routines}/${c.due} rutin kartı yapıldı` : 'Bu dönemde rutin kartı yok'),
    kpi('Günlük ortalama', r.avg_per_day == null ? '—' : r.avg_per_day, `${r.active_days} gün iş yapıldı`),
    kpi('En iyi gün', r.best_day ? r.best_day.done : '—', r.best_day ? fmtLong(r.best_day.date) : 'Henüz yok'),
    kpi('Seri', `${r.streak.current} gün`, `en uzun seri ${r.streak.best} gün`),
    kpi('Şu an açık', r.now.open, r.now.overdue ? `<span class="rd down">${r.now.overdue} gecikmiş</span>` : 'gecikmiş yok'),
  ].join('');
  const nav = st.kind === 'custom'
    ? `<div class="rep-custom"><input type="date" id="rep-from" value="${ymd(a)}" max="${todayStr()}"><span>–</span><input type="date" id="rep-to" value="${ymd(b)}"><button class="btn sm" data-rep-apply>Göster</button></div>`
    : `<div class="rep-nav"><button class="ub" data-rep-step="-1" aria-label="Önceki">${ico('left', 18)}</button><b>${esc(repTitle(st.kind, st.off || 0, a, b))}</b>
        <button class="ub" data-rep-step="1" aria-label="Sonraki" ${(st.off || 0) >= 0 ? 'disabled' : ''}>${ico('right', 18)}</button>
        ${(st.off || 0) !== 0 ? '<button class="btn ghost sm" data-rep-now>Bugüne dön</button>' : ''}</div>`;
  const card = (title, body, cls = '') => `<section class="rep-card ${cls}"><h3>${title}</h3>${body}</section>`;
  const hbars = (rows, val, label) => {
    const max = Math.max(1, ...rows.map(val));
    return rows.length ? `<div class="hb">${rows.map(x => `<div class="hb-r"><span class="hb-l">${esc(x.name || x.title)}</span>
      <span class="hb-t"><i style="width:${Math.max(2, val(x) / max * 100)}%"></i></span><span class="hb-v">${label(x)}</span></div>`).join('')}</div>`
      : '<p class="rep-empty">Bu dönemde veri yok</p>';
  };
  const legend = `<div class="rep-legend"><span><i class="sw s1"></i>Tamamlanan</span><span><i class="sw s2"></i>Eklenen</span></div>`;
  const table = `<details class="rep-table"><summary>Tablo olarak göster</summary><table><thead><tr><th>Dönem</th><th>Tamamlanan</th><th>Eklenen</th></tr></thead>
    <tbody>${r.series.map(x => `<tr><td>${esc(repKeyLabel(x.key, r.bucket, true))}</td><td>${x.done}</td><td>${x.added}</td></tr>`).join('')}</tbody></table></details>`;
  main.innerHTML = `<div class="wrap rep-page">
    <div class="page-h"><div><h1>Rapor</h1><p class="sub">Ne kadar iş bitti, ne kadar yeni iş geldi — kıyaslarla</p></div></div>
    <div class="rep-quick">${quick}</div>
    <div class="rep-bar"><div class="filters rep-tabs">${REP_TABS.map(([k, l]) => `<button class="${k === st.kind ? 'on' : ''}" data-rep-kind="${k}">${l}</button>`).join('')}</div>${nav}</div>
    <div class="rep-kpis">${kpis}</div>
    ${card(`Tamamlanan ve eklenen <small>${{ hour: 'saat saat', day: 'gün gün', week: 'hafta hafta', month: 'ay ay' }[r.bucket]}</small>`, legend + '<div class="rep-chart" data-chart="main"></div>' + table)}
    <div class="rep-grid">
      ${card('Haftanın günlerine göre <small>tamamlanan</small>', '<div class="rep-chart sm" data-chart="weekday"></div>')}
      ${card('Saatlere göre <small>tamamlanan</small>', '<div class="rep-chart sm" data-chart="hours"></div>')}
    </div>
    <div class="rep-grid">
      ${card('Listelere göre <small>tamamlanan</small>', hbars(r.by_list, x => x.done, x => x.done))}
      ${card('Rutin uyumu <small>yapılan / gelen</small>', hbars(r.routines, x => x.rate, x => `${x.done}/${x.total} · %${x.rate}`))}
    </div>
    <div class="rep-tip" hidden></div>
  </div>`;
  main.querySelectorAll('[data-rep-kind]').forEach(btn => btn.onclick = () => { st.kind = btn.dataset.repKind; st.off = 0; rerender(); });
  main.querySelectorAll('[data-rep-step]').forEach(btn => btn.onclick = () => { st.off = (st.off || 0) + +btn.dataset.repStep; rerender(); });
  const now = main.querySelector('[data-rep-now]');
  if (now) now.onclick = () => { st.off = 0; rerender(); };
  const apply = main.querySelector('[data-rep-apply]');
  if (apply) apply.onclick = () => { st.from = $('#rep-from').value; st.to = $('#rep-to').value; if (st.from && st.to) rerender(); };
  drawReportCharts();
}

function repKeyLabel(k, bucket, long) {
  if (bucket === 'hour') return long ? `${k}:00–${k}:59` : k;
  if (bucket === 'month') { const [y, m] = k.split('-').map(Number); return long ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1].slice(0, 3); }
  const d = parseD(k);
  if (bucket === 'week') return long ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} haftası` : `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  return long ? fmtLong(k) : (state.repData && state.repData.days <= 14 ? `${DAYS[(d.getDay() + 6) % 7]} ${d.getDate()}` : `${d.getDate()}`);
}

// Bars drawn as inline SVG: thin marks, 4px rounded tops on the baseline, 2px gap between a group's bars,
// recessive grid, one y axis; every group has a hover / tap target with a tooltip.
function repBars(el, groups, series) {
  const W = Math.max(260, el.clientWidth), H = el.classList.contains('sm') ? 170 : 230;
  const ml = 30, mr = 6, mt = 10, mb = 24, pw = W - ml - mr, ph = H - mt - mb;
  const max = Math.max(1, ...groups.flatMap(g => g.values));
  const step = max <= 5 ? 1 : Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const top = Math.ceil(max / step) * step;
  const y = v => mt + ph - v / top * ph;
  const gw = pw / groups.length, inner = Math.max(2, gw * 0.72), bw = Math.max(1.5, (inner - 2 * (series.length - 1)) / series.length);
  const every = Math.max(1, Math.ceil(groups.length / Math.max(1, Math.floor(pw / 34))));
  const bar = (x, v) => { const h = y(0) - y(v); if (h <= 0) return ''; const r = Math.min(4, bw / 2, h);
    return `M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + bw - r} Q${x + bw},${y(v)} ${x + bw},${y(v) + r} V${y(0)} Z`; };
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">`;
  for (let v = 0; v <= top; v += step) svg += `<line class="g" x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${ml - 6}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`;
  groups.forEach((g, i) => {
    const x0 = ml + i * gw + (gw - inner) / 2;
    svg += `<rect class="hit" x="${ml + i * gw}" y="${mt}" width="${gw}" height="${ph}" data-gi="${i}"/>`;
    g.values.forEach((v, s) => { svg += `<path class="${series[s].cls}" d="${bar(x0 + s * (bw + 2), v)}"/>`; });
    if (i % every === 0) svg += `<text class="ax" x="${ml + i * gw + gw / 2}" y="${H - 7}" text-anchor="middle">${esc(g.label)}</text>`;
  });
  svg += `<line class="base" x1="${ml}" x2="${W - mr}" y1="${y(0)}" y2="${y(0)}"/></svg>`;
  el.innerHTML = svg;
  const tip = el.closest('.rep-page').querySelector('.rep-tip');
  const show = (e, i) => {
    const g = groups[i];
    tip.innerHTML = `<b>${esc(g.long)}</b>${series.map((s, k) => `<span><i class="sw ${s.cls}"></i>${s.name}: <b>${g.values[k]}</b></span>`).join('')}`;
    tip.hidden = false;
    const box = el.closest('.rep-page').getBoundingClientRect(), hit = e.target.getBoundingClientRect();
    tip.style.left = Math.min(box.width - tip.offsetWidth - 4, Math.max(4, hit.left - box.left + hit.width / 2 - tip.offsetWidth / 2)) + 'px';
    tip.style.top = (hit.top - box.top - tip.offsetHeight + 4) + 'px';
    el.querySelectorAll('.hit.on').forEach(h => h.classList.remove('on'));
    e.target.classList.add('on');
  };
  el.querySelectorAll('.hit').forEach(h => {
    h.addEventListener('pointerenter', e => show(e, +h.dataset.gi));
    h.addEventListener('click', e => show(e, +h.dataset.gi));
    h.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { tip.hidden = true; h.classList.remove('on'); } });
  });
}

function drawReportCharts() {
  const r = state.repData, main = $('#main');
  if (!r || !main || state.view !== 'report') return;
  const el = n => main.querySelector(`[data-chart="${n}"]`);
  const two = [{ name: 'Tamamlanan', cls: 's1' }, { name: 'Eklenen', cls: 's2' }];
  if (el('main')) repBars(el('main'), r.series.map(x => ({ label: repKeyLabel(x.key, r.bucket), long: repKeyLabel(x.key, r.bucket, true), values: [x.done, x.added] })), two);
  if (el('weekday')) repBars(el('weekday'), r.weekday.map((v, i) => ({ label: DAYS[i], long: DAYS_LONG[i], values: [v] })), [{ name: 'Tamamlanan', cls: 's1' }]);
  if (el('hours')) repBars(el('hours'), r.hours.map((v, h) => ({ label: String(h).padStart(2, '0'), long: `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59`, values: [v] })), [{ name: 'Tamamlanan', cls: 's1' }]);
}
let repResize;
window.addEventListener('resize', () => { clearTimeout(repResize); repResize = setTimeout(drawReportCharts, 150); });
document.addEventListener('pointerdown', e => { const t = $('.rep-tip'); if (t && !e.target.closest('.rep-chart')) t.hidden = true; });

// ---------- "Gelecek": what is coming (tomorrow … all) ----------
// Each card is shown once: repeating ones (more than one date in the range) in "Tekrarlayanlar" with how often,
// the rest on their date — by day (Yarın, 1 hafta), by week (2–4 hafta) or by month (Aylık, Hepsi).
const UP_RANGES = [
  ['tomorrow', 'Yarın', 'Yarın neler var'], ['w1', '1 hafta içinde', 'Önümüzdeki 7 gün'], ['w2', '2 hafta içinde', 'Önümüzdeki 14 gün'],
  ['w3', '3 hafta içinde', 'Önümüzdeki 21 gün'], ['w4', '4 hafta içinde', 'Önümüzdeki 28 gün'],
  ['month', 'Aylık', 'Önümüzdeki 3 ay, ay ay — haftalık ve günlük rutinler hariç'], ['all', 'Hepsini görüntüle', 'Planlanmış her şey'],
];
const upLabel = k => (UP_RANGES.find(r => r[0] === k) || [k, k])[1];

async function viewUpcoming(main, rng) {
  const data = await api('/upcoming?range=' + rng);
  if (!state.routines.length) state.routines = (await api('/routines')).items;
  const items = data.items;
  state.upItems = items;
  const tomorrow = data.start;
  const dayName = d => { const x = parseD(d); return `${DAYS_LONG[(x.getDay() + 6) % 7]}, ${x.getDate()} ${MONTHS[x.getMonth()]}`; };
  const weekOf = d => Math.floor((parseD(d) - parseD(tomorrow)) / 864e5 / 7);
  const bucket = d => rng === 'tomorrow' || rng === 'w1' ? d : rng === 'month' || rng === 'all' ? d.slice(0, 7) : 'w' + weekOf(d);
  const bucketLabel = b => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(b)) return b === tomorrow ? `Yarın · ${dayName(b)}` : dayName(b);
    if (/^\d{4}-\d{2}$/.test(b)) { const [y, m] = b.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; }
    const i = +b.slice(1), a = new Date(parseD(tomorrow).getTime() + i * 7 * 864e5), z = new Date(a.getTime() + 6 * 864e5);
    return `${i + 1}. hafta · ${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} – ${z.getDate()} ${MONTHS[z.getMonth()].slice(0, 3)}`;
  };
  const row = e => {
    const i = items.indexOf(e), d = parseD(e.first), chips = [];
    if (e.routine) chips.push(`<span class="chip ok">${ico('repeat', 12)} ${esc(ruleLabel(e.routine))}</span>`);
    if (e.count > 1) chips.push(`<span class="chip">${e.count} kez</span>`);
    if (e.time) chips.push(`<span class="chip">${ico('clock', 12)} ${esc(e.time)}</span>`);
    if (e.task && e.task.due_date) chips.push(`<span class="chip">${ico('cal', 12)} Son tarih ${fmtShort(e.task.due_date)}</span>`);
    if (e.task && e.task.remind_at && e.task.remind_at.slice(0, 10) > todayStr()) chips.push(`<span class="chip">${ico('bell', 12)} ${fmtShort(e.task.remind_at.slice(0, 10))}</span>`);
    if (e.task && e.task.list_name) chips.push(`<span class="chip">${ico('list', 12)} ${esc(e.task.list_name)}</span>`);
    return `<div class="up-row ${e.important ? 'imp imp-pulse' : ''}" data-up="${i}" role="button" tabindex="0">
      <span class="up-date"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()].slice(0, 3)}</small></span>
      <span class="up-body"><span class="up-title">${esc(e.title)}</span>
        <span class="up-meta">${e.count > 1 ? `<span class="chip accent">ilk: ${e.first === tomorrow ? 'yarın' : fmtShort(e.first)}</span>` : ''}${chips.join('')}</span></span>
      <button class="star ${e.important ? 'on' : ''}" data-up-star="${i}" aria-label="Önemli" title="${e.important ? 'Önemli — kaldırmak için dokun' : 'Önemli yap'}">${ico('star', 18)}</button></div>`;
  };
  const repeat = items.filter(e => e.count > 1);
  const once = items.filter(e => e.count <= 1);
  const groups = [];
  for (const e of once) {
    const b = bucket(e.first);
    let g = groups.find(x => x.b === b);
    if (!g) groups.push(g = { b, items: [] });
    g.items.push(e);
  }
  const span = data.end ? `${fmtShort(data.start)} – ${fmtShort(data.end)}` : `${fmtShort(data.start)} ve sonrası`;
  main.innerHTML = `<div class="wrap">
    <div class="page-h"><div><h1>Gelecek · ${esc(upLabel(rng))}</h1><p class="sub">${span}${rng === 'month' ? ' · haftalık ve günlük rutinler gösterilmez' : ''} · ${items.length} kart${repeat.length ? ` · ${repeat.length} tekrarlayan` : ''}</p></div></div>
    <div class="filters up-ranges">${UP_RANGES.map(([k, l]) => `<button class="${k === rng ? 'on' : ''}" data-up-range="${k}">${esc(l)}</button>`).join('')}</div>
    ${items.length ? '' : `<div class="empty"><div class="big">🔭</div><b>Bu aralıkta planlanmış bir şey yok</b>Görevlere son tarih ver ya da Tekrarla ile rutine çevir; burada görünürler.</div>`}
    ${repeat.length ? `<details class="open-sec up-sec" ${store.get('upRepOpen', true) ? 'open' : ''} data-up-rep>
      <summary>${ico('down', 16)} Tekrarlayanlar (${repeat.length}) <small>— her biri bir kez, kaç kez geleceğiyle</small></summary>
      <div class="up-list">${repeat.map(row).join('')}</div></details>` : ''}
    ${groups.map(g => `<section class="up-group"><h3>${esc(bucketLabel(g.b))} <small>${g.items.length}</small></h3><div class="up-list">${g.items.map(row).join('')}</div></section>`).join('')}
  </div>`;
  store.set('upRange', rng);
  main.querySelectorAll('[data-up-range]').forEach(b => b.onclick = () => go('upcoming:' + b.dataset.upRange));
  const rep = main.querySelector('[data-up-rep]');
  if (rep) rep.addEventListener('toggle', () => store.set('upRepOpen', rep.open));
  main.querySelectorAll('[data-up-star]').forEach(b => b.onclick = async ev => {
    ev.stopPropagation();
    const e = state.upItems[+b.dataset.upStar];
    if (!e) return;
    try {
      if (e.task) await api(`/tasks/${e.task.task_id}`, { method: 'PATCH', body: { important: !e.important } });
      if (e.routine) await api(`/routines/${e.routine.id}`, { method: 'PATCH', body: { important: !e.important } });
    } catch { return; }
    rerender();
  });
  main.querySelectorAll('[data-up]').forEach(b => b.onkeydown = ev => { if (ev.key === 'Enter' && ev.target === b) b.click(); });
  main.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
    const e = state.upItems[+b.dataset.up];
    if (!e) return;
    if (e.task) openTaskSheet(e.task);
    else openRoutineSheet(state.routines.find(r => r.id === e.routine.id) || e.routine);
  });
}

// ---------- Search ----------
async function viewSearch(main) {
  main.innerHTML = `<div class="wrap">
    <div class="page-h"><div><h1>Ara</h1><p class="sub">Görevler, notlar, adımlar ve rutinler içinde</p></div></div>
    <div class="quick-add">${ico('search')}<input id="s-in" type="search" placeholder="Aramak istediğin kelime…" value="${esc(state.q || '')}" autocomplete="off" enterkeyhint="search" maxlength="100"></div>
    <div id="s-res"></div></div>`;
  const inp = $('#s-in');
  if (window.innerWidth > 760 || !state.q) inp.focus();
  let timer;
  const run = async () => {
    state.q = inp.value;
    const v = inp.value.trim();
    const box = $('#s-res');
    if (!v) { box.innerHTML = '<div class="empty"><div class="big">🔎</div><b>Ne arıyorsun?</b>Bir kelime yaz; tamamlanmış görevler de dahil hepsinde arar.</div>'; return; }
    const r = await api('/search?q=' + encodeURIComponent(v));
    if (inp.value.trim() !== v || !$('#s-res')) return;  // a newer query is on the way
    state.idx = {};
    state.routines = r.routines;
    const open = r.tasks.filter(t => !t.done), done = r.tasks.filter(t => t.done);
    box.innerHTML = (!r.tasks.length && !r.routines.length) ? `<div class="empty"><div class="big">🤷</div><b>"${esc(v)}" bulunamadı</b>Başka bir kelime dene.</div>`
      : `${open.length ? `<div class="sec-h">Görevler (${open.length})</div><div class="list">${open.map(itemRow).join('')}</div>` : ''}
         ${r.routines.length ? `<div class="sec-h">Rutinler (${r.routines.length})</div><div class="list">${r.routines.map(routineRow).join('')}</div>` : ''}
         ${doneSection(done)}`;
  };
  inp.oninput = () => { clearTimeout(timer); timer = setTimeout(run, 200); };
  await run();
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || !$('#main') || $('#sheet-root').innerHTML || menuEl) return;
  if (isTyping(e)) return;
  if (e.key === '/') { e.preventDefault(); go('search'); }
  else if (e.key === 'n' || e.key === 'N') { const qa = $('#qa-in'); if (qa) { e.preventDefault(); qa.focus(); } }
});

// ---------- Routines ----------
async function viewRoutines(main) {
  const tab = state.rtab;
  const [rs, on] = await Promise.all([api('/routines'), typeof tab === 'number' ? api('/once') : { items: [] }]);
  state.routines = rs.items;
  const once = on.items.filter(it => wdOf(it.once) === tab);  // "Sadece 1 seferlik" cards on this weekday (soonest first)
  const todayWd = (new Date().getDay() + 6) % 7;
  const weekly = r => (r.kind || 'weekly') === 'weekly';
  const list = state.routines.filter(r => tab === 'other' ? !weekly(r)
    : weekly(r) && (tab === 'all' ? r.days === 127 : (r.days & (1 << tab))));
  const tabs = [['all', 'Her gün'], ...DAYS.map((d, i) => [i, d]), ['other', 'Aylık / Tarihli']];
  main.innerHTML = `<div class="wrap">
    <div class="page-h"><div><h1>Rutinler</h1><p class="sub">Buraya eklediklerin, ilgili günün sabahı Bugün listene düşer.</p></div></div>
    <div class="seg">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}${k === todayWd ? '<i class="today-dot"></i>' : ''}</button>`).join('')}</div>
    ${tab === 'other' ? '' : `<form class="quick-add" id="qa">${ico('plus')}<input id="qa-in" placeholder="${tab === 'all' ? 'Her gün için rutin ekle' : `Her ${DAYS_LONG[tab]} için rutin ekle`}" enterkeyhint="done" autocomplete="off" maxlength="300">
      ${pickBtn('time', 'qa-time', 'clock', 'Saat (isteğe bağlı)')}<button class="btn sm" type="submit">Ekle</button></form>`}
    ${once.length ? `<div class="once-sec"><div class="once-h">${ico('sun', 16)} 1 seferlik <small>— sadece o gün Günüm'e gelir, tekrar etmez</small></div>
      <div class="list">${once.map(itemRow).join('')}</div></div>` : ''}
    ${once.length && list.length ? `<div class="once-h rt-h">${ico('repeat', 16)} Her ${DAYS_LONG[tab]} tekrarlananlar</div>` : ''}
    <div class="list">${list.map(routineRow).join('')}</div>
    ${list.length || once.length ? '' : tab === 'other'
      ? `<div class="empty"><div class="big">📅</div><b>Aylık ya da tarihli rutin yok</b>Bir görevin sağındaki 🔁 Tekrarla düğmesinden "Ayda bir" ya da "Belirli tarihlerde" seçebilirsin.</div>`
      : `<div class="empty"><div class="big">🔁</div><b>${tab === 'all' ? 'Her gün rutini yok' : DAYS_LONG[tab] + ' için rutin yok'}</b>Yukarıdan ekleyebilirsin. Saat verirsen o saatte bildirim gelir.</div>`}
  </div>`;
  main.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    state.rtab = b.dataset.tab === 'all' || b.dataset.tab === 'other' ? b.dataset.tab : +b.dataset.tab;
    rerender();
  });
  if ($('#qa')) $('#qa').onsubmit = async e => {
    e.preventDefault();
    const v = capWords($('#qa-in').value);
    if (!v) return;
    await api('/routines', { method: 'POST', body: { title: v, days: tab === 'all' ? 127 : 1 << tab, time: $('#qa-time').value || null } });
    await rerender();
    $('#qa-in') && $('#qa-in').focus();
  };
}

// Human text for a routine's rule: "Her gün", "Pzt, Çar", "Her ayın 15'i", "3 tarih: 24 Eki, 5 Kas…"
function ruleLabel(r, long) {
  const kind = r.kind || 'weekly';
  if (kind === 'monthly') return r.month_day >= 31 ? 'Her ayın son günü' : `Her ayın ${r.month_day}. günü`;
  if (kind === 'dates') {
    const ds = (r.dates || []).filter(d => d >= todayStr());
    const shown = (long ? r.dates || [] : ds).map(fmtShort);
    if (!shown.length) return 'Tarihler geçti';
    return `${long ? (r.dates || []).length : ds.length} tarih: ${shown.slice(0, long ? 20 : 3).join(', ')}${shown.length > (long ? 20 : 3) ? '…' : ''}`;
  }
  return daysLabel(r.days);
}

function routineRow(r) {
  const meta = [`<span class="chip ${r.days === 127 && (r.kind || 'weekly') === 'weekly' ? 'accent' : ''}">${esc(ruleLabel(r))}</span>`];
  if (r.time) meta.push(`<span class="chip">${ico('clock', 12)} ${r.time}</span>`);
  if (!r.active) meta.push('<span class="chip red">Durduruldu</span>');
  return `<div class="item ${r.active ? '' : 'paused'}" data-rid="${r.id}">
    <div class="rdot">${ico('repeat', 16)}</div>
    <div class="item-body" data-act="ropen"><div class="item-title">${esc(r.title)}</div><div class="item-meta">${meta.join('')}</div></div>
    <button class="star" data-act="ropen" aria-label="Düzenle">${ico('right', 18)}</button>
  </div>`;
}

// ---------- folders ----------
const realLists = () => state.lists.filter(l => l.kind !== 'group');  // lists that hold tasks (not "ana liste" groups)

// One request refreshes the whole sidebar: lists, weekday counts and the "Bugün" badge.
async function loadLists() {
  try {
    const sb = await api('/sidebar', { quiet: true });
    state.lists = sb.lists;
    state.dayCounts = sb.day_counts;
    state.listSort = sb.list_sort || {};
    state.monthly = new Map((sb.monthly || []).map(m => [normTitle(m.title), m.month_day]));
    state.recurring = new Set((sb.recurring || []).map(normTitle));
    setCount(sb.today_open);
  } catch { return; }
  renderSideLists();
  loadLeft();
}

// ---------- right panel: yesterday's Günüm cards left open; a click offers to send one back to Günüm ----------
let leftSeq = 0;
async function loadLeft() {
  const my = ++leftSeq;
  let r, people;
  try { [r, people] = await Promise.all([api('/leftovers', { quiet: true }), loadPeople(true)]); } catch { return; }
  if (my !== leftSeq) return;
  state.left = r.items;
  const n = r.items.length;
  document.documentElement.classList.add('has-left');
  const nb = $('#rp-notch b');
  if (nb) { nb.textContent = n || ''; nb.hidden = !n; }
  const body = $('#rp-body');
  if (!body) return;
  body.innerHTML = `<div class="rp-h"><div><b>Dünden kalanlar</b><small>${fmtLong(r.date)} · ${n} görev</small></div>
      <button class="rp-x" data-left-hide title="Paneli gizle" aria-label="Paneli gizle">${ico('x', 16)}</button></div>
    ${n ? `<button class="rp-all" data-left-all>${ico('sun', 15)} Hepsini Günüme gönder</button>
    <div class="rp-list">${r.items.map((it, i) => `<button class="rp-item" data-li="${i}">
      ${ico(it.kind === 'routine' ? 'repeat' : 'circle', 15)}<span class="rp-t">${esc(it.title)}</span>
      <small>${it.kind === 'routine' ? 'Rutin' : esc(it.list_name || 'Genel')}</small></button>`).join('')}</div>` : '<p class="rp-none">Dünden kalan görev yok 🎉</p>'}
    <div class="rp-people">
      <div class="rp-ph"><b>Kişiler</b><button class="rp-link" data-people>${people.length ? 'Tümü · içe aktar' : 'İçe aktar'}</button></div>
      ${people.length ? `<div class="rp-avs">${people.slice(0, 14).map(p => `<button class="av" data-person="${p.id}" title="${esc(p.name + (p.email ? ' · ' + p.email : ''))} — görev ata">${esc(initialsOf(p.name))}</button>`).join('')}</div>` : ''}
      <button class="rp-assign" data-assign>${ico('user', 17)} Kişi ata</button></div>`;
}

async function sendBack(it, quiet) {
  if (it.kind === 'task') await api(`/tasks/${it.task_id}`, { method: 'PATCH', body: { my_day: true } });
  else {  // a routine's yesterday card: comes into today as a one-time task
    await api('/tasks', { method: 'POST', body: { title: it.title, my_day: true, important: !!it.important } });
    await api(`/leftovers/${it.id}/hide`, { method: 'POST' });
  }
  if (!quiet) toast(`"${it.title}" Günüm'e geri gönderildi`);
}
async function leftChanged() {
  await loadLists();
  if (state.view === 'today') await rerender();
}

function leftMenu(it) {
  return [
    { icon: 'sun', label: 'Günüme geri gönder', run: async () => { await sendBack(it); await leftChanged(); } },
    { icon: 'check', label: 'Tamamlandı (dün yapıldı)', run: async () => {
      await api(`/items/${it.id}/done`, { method: 'POST', body: { done: true } });
      toast(`"${it.title}" tamamlandı`); await leftChanged();
    } },
    { sep: true },
    { icon: 'x', label: 'Listeden kaldır', run: async () => {
      await api(`/leftovers/${it.id}/hide`, { method: 'POST' });
      toast(`"${it.title}" dünden kalanlardan kaldırıldı`); await leftChanged();
    } },
  ];
}

// ---------- Kişiler: assign a task to a person (an e-mail goes to them); contacts work with Google / Outlook (Hotmail) files ----------
const initialsOf = name => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toLocaleUpperCase('tr') || '?';
async function loadPeople(force) {
  if (!state.people || force) state.people = (await api('/contacts', { quiet: true })).items;
  return state.people;
}
async function peopleChanged() { await rerender(); loadLeft(); }

const personFields = (p = {}) => `<div class="pp-form">
  <div class="pp-row"><div class="field"><label>Ad *</label><input id="pp-first" value="${esc(p.first_name || '')}" maxlength="80" autocomplete="given-name"></div>
    <div class="field"><label>Soyad</label><input id="pp-last" value="${esc(p.last_name || '')}" maxlength="80" autocomplete="family-name"></div></div>
  <div class="field"><label>E-posta * <small>(görev maili buraya gider)</small></label><input id="pp-email" type="email" value="${esc(p.email || '')}" maxlength="200" autocomplete="email" inputmode="email"></div>
  <div class="field"><label>Cep telefonu</label><input id="pp-phone" type="tel" value="${esc(p.phone || '')}" maxlength="20" placeholder="05xx xxx xx xx" autocomplete="tel" inputmode="tel"></div></div>`;
const readPerson = root => ({ first_name: root.querySelector('#pp-first').value, last_name: root.querySelector('#pp-last').value,
  email: root.querySelector('#pp-email').value, phone: root.querySelector('#pp-phone').value });
async function savePerson(id, f) {
  if (!f.first_name.trim()) { toast('Ad gerekli'); return null; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) { toast('Geçerli bir e-posta adresi yaz'); return null; }
  try { return await api(id ? `/contacts/${id}` : '/contacts', { method: id ? 'PATCH' : 'POST', body: f }); } catch { return null; }
}

// target: the card(s) it was opened from (fixed: a task, a routine card, or several selected cards); otherwise
// pick one of the open tasks (Günüm first). pre: a person already chosen. A routine card is assigned as a task
// with its title, made in Günüm today (the routine itself keeps repeating for you).
async function openAssignSheet(target = null, pre = null) {
  const fixed = target ? [].concat(target) : null;
  let people, mail, tasks = [];
  try {
    [people, mail] = await Promise.all([loadPeople(true), api('/mail/settings')]);
    if (!fixed) {
      const [all, today] = await Promise.all([api('/tasks'), api('/today', { quiet: true }).catch(() => ({ items: [] }))]);
      const seen = new Set();
      tasks = [...today.items.filter(i => i.kind === 'task' && !i.done), ...all.items].filter(t => !seen.has(t.task_id) && seen.add(t.task_id));
    }
  } catch { return; }
  const one = fixed && fixed.length === 1 ? fixed[0] : null;
  let picked = fixed, who = pre || (one && one.assignee ? one.assignee.id : null), adding = !people.length, tq = '';
  const s = sheet(`<div class="sheet-h"><b>Kişi ata</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    <div class="field"><label>Görev</label><div id="as-task"></div></div>
    <div class="field"><label>Kişi</label><div id="as-people"></div></div>
    <div id="as-new"></div>
    <label class="as-mail"><input type="checkbox" id="as-mail" ${mail.configured ? 'checked' : 'disabled'}><span>Kişiye e-posta ile bildir</span></label>
    ${mail.configured ? '' : `<p class="as-note">Mail ayarı henüz yapılmadı: atama yapılır ama mail gitmez. <button class="rp-link" data-mail-setup>Mail ayarla</button></p>`}
    <div class="sheet-f"><button class="btn ghost sm" data-manage>Kişiler · içe/dışa aktar</button>
      <div class="row">${one && one.assignee ? '<button class="btn ghost sm" id="as-un">Atamayı kaldır</button>' : ''}<button class="btn sm" id="as-go">Ata</button></div></div>`);
  const el = s.el;
  const paintTask = () => {
    const box = el.querySelector('#as-task');
    if (picked) {
      const label = picked.length === 1 ? esc(picked[0].title)
        : `${picked.length} görev<small>${picked.map(t => esc(t.title)).join(' · ')}</small>`;
      const rt = picked.some(t => t.kind === 'routine') ? '<small>Rutin kartı bugün için görev olarak atanır; rutin senin için tekrar etmeye devam eder.</small>' : '';
      box.innerHTML = `<div class="as-picked">${ico(picked.length > 1 ? 'list' : 'circle', 15)}<span>${label}${rt}</span>${fixed ? '' : '<button class="rp-link" data-retask>Değiştir</button>'}</div>`;
      const b = box.querySelector('[data-retask]');
      if (b) b.onclick = () => { picked = null; paintTask(); };
      return;
    }
    box.innerHTML = `<input id="as-tq" type="search" placeholder="Görev ara…" autocomplete="off" value="${esc(tq)}"><div class="as-list"></div>`;
    const inp = box.querySelector('#as-tq'), list = box.querySelector('.as-list');
    const draw = () => {
      const words = normTitle(inp.value).split(/\s+/).filter(Boolean);
      const m = tasks.filter(t => words.every(w => normTitle(t.title).includes(w))).slice(0, 8);
      list.innerHTML = m.length ? m.map(t => `<button type="button" class="as-opt" data-tid="${t.task_id}">${esc(t.title)}
          <small>${t.my_day ? '☀ Günüm' : esc(t.list_name || 'Genel')}${t.assignee ? ' · ' + esc(t.assignee.name) : ''}</small></button>`).join('')
        : '<div class="as-empty">Eşleşen görev yok</div>';
      list.querySelectorAll('[data-tid]').forEach(b => b.onclick = () => { picked = [tasks.find(t => t.task_id === +b.dataset.tid)]; tq = inp.value; paintTask(); });
    };
    inp.oninput = draw;
    draw();
  };
  const paintPeople = () => {
    const box = el.querySelector('#as-people');
    box.innerHTML = `<div class="pp-list">${people.map(p => `<button type="button" class="pp ${p.id === who && !adding ? 'on' : ''}" data-pid="${p.id}">
        <span class="av">${esc(initialsOf(p.name))}</span><span class="pp-n">${esc(p.name)}<small>${esc(p.email || 'e-posta yok')}</small></span></button>`).join('')}
      <button type="button" class="pp add ${adding ? 'on' : ''}" data-padd><span class="av">${ico('plus', 15)}</span><span class="pp-n">Yeni kişi</span></button></div>`;
    box.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => { who = +b.dataset.pid; adding = false; paintPeople(); });
    box.querySelector('[data-padd]').onclick = () => { adding = true; who = null; paintPeople(); };
    el.querySelector('#as-new').innerHTML = adding ? personFields() : '';
    if (adding && people.length) setTimeout(() => el.querySelector('#pp-first')?.focus(), 50);
  };
  paintTask();
  paintPeople();
  if (!picked) setTimeout(() => el.querySelector('#as-tq')?.focus(), 60);
  el.querySelector('[data-manage]').onclick = () => { s.close(false); openPeopleSheet(); };
  const ms = el.querySelector('[data-mail-setup]');
  if (ms) ms.onclick = () => { s.close(false); openPeopleSheet(true); };
  const un = el.querySelector('#as-un');
  if (un) un.onclick = async () => {
    try { await api(`/tasks/${one.task_id}/assign`, { method: 'POST', body: { contact_id: null, mail: false } }); } catch { return; }
    s.close(false); toast('Atama kaldırıldı'); peopleChanged();
  };
  el.querySelector('#as-go').onclick = async () => {
    if (!picked) { toast('Önce bir görev seç'); return; }
    let p = people.find(x => x.id === who);
    if (adding) { p = await savePerson(null, readPerson(el)); if (!p) return; }
    if (!p) { toast('Bir kişi seç ya da yeni kişi ekle'); return; }
    const go = el.querySelector('#as-go');
    go.disabled = true; go.textContent = 'Atanıyor…';
    const doMail = el.querySelector('#as-mail').checked;
    let sent = 0, err = null;
    try {
      for (const t of picked) {
        const tid = t.kind === 'routine' || !t.task_id
          ? (await api('/tasks', { method: 'POST', body: { title: t.title, my_day: true, important: !!t.important } })).task_id
          : t.task_id;
        const r = await api(`/tasks/${tid}/assign`, { method: 'POST', body: { contact_id: p.id, mail: doMail } });
        if (r.mailed) sent++;
        err = err || r.mail_error;
      }
    } catch { go.disabled = false; go.textContent = 'Ata'; return; }
    s.close(false);
    const what = picked.length === 1 ? `"${picked[0].title}"` : `${picked.length} görev`;
    toast(sent ? `${what} → ${p.name} — ${sent > 1 ? sent + ' mail' : 'mail'} gönderildi ✉️`
      : `${what} → ${p.name} atandı${err ? ' — mail gitmedi: ' + err : ''}`);
    clearSel?.();
    peopleChanged();
  };
}

// all people: add / edit / delete, import a Google or Outlook (Hotmail) file, export for them; the mailbox the e-mails go from
async function openPeopleSheet(mailOpen = false) {
  let people, mail;
  try { [people, mail] = await Promise.all([loadPeople(true), api('/mail/settings')]); } catch { return; }
  const s = sheet(`<div class="sheet-h"><b>Kişiler</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    <div class="pp-tools"><button class="btn sm" data-new>${ico('plus', 15)} Yeni kişi</button>
      <label class="btn ghost sm pp-file">${ico('download', 15)} İçe aktar (.csv / .vcf)<input type="file" id="pp-file" accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv" hidden></label></div>
    <p class="as-note">Google Kişiler (contacts.google.com → Dışa aktar) ya da Outlook / Hotmail (outlook.com → Kişiler → Kişileri yönet → Dışa aktar) dosyasını buradan içe aktarabilirsin. Aynı e-postalı kişi tekrar eklenmez, güncellenir.</p>
    <div class="pp-all">${people.length ? people.map(p => `<div class="pp-line"><span class="av">${esc(initialsOf(p.name))}</span>
        <span class="pp-n">${esc(p.name)}<small>${esc([p.email, p.phone].filter(Boolean).join(' · ') || '—')}</small></span>
        <button class="btn ghost icon" data-edit="${p.id}" aria-label="Düzenle" title="Düzenle">${ico('pencil', 16)}</button>
        <button class="btn ghost icon" data-del="${p.id}" aria-label="Sil" title="Sil">${ico('trash', 16)}</button></div>`).join('') : '<div class="as-empty">Henüz kişi yok</div>'}</div>
    ${people.length ? `<div class="pp-exp"><span>Dışa aktar:</span><a href="/api/contacts/export?fmt=vcf" download>vCard (.vcf)</a><a href="/api/contacts/export?fmt=google" download>Google CSV</a><a href="/api/contacts/export?fmt=outlook" download>Outlook / Hotmail CSV</a></div>` : ''}
    <details class="pp-mail" ${mailOpen || !mail.configured ? 'open' : ''}><summary>${ico('mail', 16)} Mail ayarları ${mail.configured ? '<span class="ok-dot">hazır</span>' : '<span class="warn-dot">yapılmadı</span>'}</summary>
      <p class="as-note">Görev maili <b>senin</b> mail adresinden gider. Normal şifren çalışmaz, <b>uygulama şifresi</b> gerekir.<br>
      <b>Gmail:</b> Google Hesabı → Güvenlik → 2 Adımlı Doğrulama açık olmalı → <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</a> → 16 harfli şifreyi kopyala.<br>
      <b>Outlook / Hotmail:</b> <a href="https://account.microsoft.com/security" target="_blank" rel="noopener">account.microsoft.com/security</a> → Gelişmiş güvenlik seçenekleri → Uygulama parolası.</p>
      <div class="field"><label>Servis</label><select id="m-prov"><option value="gmail">Gmail</option><option value="outlook">Outlook / Hotmail</option><option value="other">Diğer (SMTP)</option></select></div>
      <div class="m-other"><div class="pp-row"><div class="field"><label>SMTP sunucu</label><input id="m-host" value="${esc(mail.host)}"></div><div class="field"><label>Port</label><input id="m-port" type="number" value="${mail.port}"></div></div></div>
      <div class="field"><label>Mail adresin</label><input id="m-user" type="email" value="${esc(mail.user)}" placeholder="ornek@gmail.com"></div>
      <div class="field"><label>Uygulama şifresi</label><input id="m-pass" type="password" autocomplete="new-password" placeholder="${mail.has_pass ? '•••••••• kayıtlı — değiştirmek için yaz' : 'xxxx xxxx xxxx xxxx'}"></div>
      <div class="field"><label>Gönderen adı</label><input id="m-name" value="${esc(mail.from_name)}" placeholder="Örn. Ayşe Yılmaz"></div>
      <div class="row"><button class="btn sm" id="m-save">Kaydet</button><button class="btn ghost sm" id="m-test" ${mail.configured ? '' : 'disabled'}>Deneme maili gönder</button></div></details>
    <div class="sheet-f"><span></span><button class="btn sm" data-assign-from>${ico('user', 15)} Kişi ata</button></div>`);
  const el = s.el;
  const prov = el.querySelector('#m-prov');
  prov.value = mail.provider;
  const other = () => { el.querySelector('.m-other').hidden = prov.value !== 'other'; };
  prov.onchange = other;
  other();
  el.querySelector('[data-new]').onclick = () => { s.close(false); openPersonSheet(null); };
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { s.close(false); openPersonSheet(people.find(p => p.id === +b.dataset.edit)); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const p = people.find(x => x.id === +b.dataset.del);
    if (!confirm(`"${p.name}" silinsin mi? Atandığı görevlerden de kaldırılır.`)) return;
    try { await api(`/contacts/${p.id}`, { method: 'DELETE' }); } catch { return; }
    s.close(false); toast('Kişi silindi'); await peopleChanged(); openPeopleSheet();
  });
  el.querySelector('#pp-file').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3e6) { toast('Dosya çok büyük (en fazla 3 MB)'); return; }
    const buf = await f.arrayBuffer();
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { text = new TextDecoder('windows-1254').decode(buf); }  // old Outlook CSV
    let r;
    try { r = await api('/contacts/import', { method: 'POST', body: { text } }); } catch { e.target.value = ''; return; }
    s.close(false);
    toast(`${r.added} kişi eklendi${r.updated ? `, ${r.updated} güncellendi` : ''}${r.skipped ? `, ${r.skipped} atlandı` : ''}`);
    await peopleChanged(); openPeopleSheet();
  };
  const saveMail = async () => {
    const body = { provider: prov.value, user: el.querySelector('#m-user').value, from_name: el.querySelector('#m-name').value,
      password: el.querySelector('#m-pass').value || null, host: el.querySelector('#m-host').value, port: +el.querySelector('#m-port').value || null };
    try { mail = await api('/mail/settings', { method: 'PATCH', body }); } catch { return false; }
    toast(mail.configured ? 'Mail ayarı kaydedildi — deneme maili gönderebilirsin' : 'Kaydedildi — mail adresi ve uygulama şifresi gerekli');
    el.querySelector('#m-test').disabled = !mail.configured;
    el.querySelector('#m-pass').value = '';
    el.querySelector('#m-pass').placeholder = mail.has_pass ? '•••••••• kayıtlı — değiştirmek için yaz' : 'xxxx xxxx xxxx xxxx';
    const dot = el.querySelector('.pp-mail summary span');
    dot.className = mail.configured ? 'ok-dot' : 'warn-dot'; dot.textContent = mail.configured ? 'hazır' : 'yapılmadı';
    return true;
  };
  el.querySelector('#m-save').onclick = saveMail;
  el.querySelector('#m-pass').oninput = () => { el.querySelector('#m-test').disabled = false; };
  el.querySelector('#m-test').onclick = async () => {
    const b = el.querySelector('#m-test');
    if (el.querySelector('#m-pass').value && !(await saveMail())) return;
    b.disabled = true; b.textContent = 'Gönderiliyor…';
    try { await api('/mail/test', { method: 'POST' }); toast(`Deneme maili ${mail.user} adresine gönderildi ✉️`); } catch { /* toast already shown */ }
    b.disabled = false; b.textContent = 'Deneme maili gönder';
  };
  el.querySelector('[data-assign-from]').onclick = () => { s.close(false); openAssignSheet(); };
}

function openPersonSheet(p) {
  const s = sheet(`<div class="sheet-h"><b>${p ? 'Kişiyi düzenle' : 'Yeni kişi'}</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    ${personFields(p || {})}
    <div class="sheet-f"><button class="btn ghost sm" data-back>${ico('left', 15)} Kişiler</button><button class="btn sm" id="pp-save">Kaydet</button></div>`);
  setTimeout(() => s.el.querySelector('#pp-first').focus(), 50);
  s.el.querySelector('[data-back]').onclick = () => { s.close(false); openPeopleSheet(); };
  s.el.querySelector('#pp-save').onclick = async () => {
    const r = await savePerson(p && p.id, readPerson(s.el));
    if (!r) return;
    s.close(false); toast(p ? 'Kişi güncellendi' : `${r.name} eklendi`); await peopleChanged(); openPeopleSheet();
  };
}

const wideRight = () => window.innerWidth >= 1100;
function showRight(on) {
  const html = document.documentElement;
  if (wideRight()) { html.classList.toggle('right-off', !on); store.set('rightOff', !on); }
  else html.classList.toggle('right-show', on);
}
document.documentElement.classList.toggle('right-off', store.get('rightOff', false));
{
  const w = store.get('rw', 0);
  if (w) document.documentElement.style.setProperty('--rw', w + 'px');
}
document.addEventListener('click', async e => {
  if (e.target.closest('[data-left-toggle]')) {
    const html = document.documentElement;
    showRight(wideRight() ? html.classList.contains('right-off') : !html.classList.contains('right-show'));
    return;
  }
  if (e.target.closest('[data-left-hide]')) { showRight(false); return; }
  if (e.target.closest('[data-assign]')) { openAssignSheet(); return; }
  if (e.target.closest('[data-people]')) { openPeopleSheet(); return; }
  const pb = e.target.closest('[data-person]');
  if (pb) { openAssignSheet(null, +pb.dataset.person); return; }
  if (e.target.closest('[data-left-all]')) {
    const items = state.left || [];
    for (const it of items) await sendBack(it, true);
    toast(`${items.length} görev Günüm'e geri gönderildi`);
    await leftChanged();
    return;
  }
  const b = e.target.closest('.rp-item');
  if (b) { const it = (state.left || [])[+b.dataset.li]; if (it) openMenu(e.clientX, e.clientY, leftMenu(it)); }
});
// drag the panel's left edge to set its width (remembered); double click = default width
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('.rp-grip');
  if (!g) return;
  e.preventDefault();
  const html = document.documentElement;
  html.classList.add('rp-resizing');
  const move = ev => {
    const w = Math.round(Math.min(560, Math.max(220, window.innerWidth - ev.clientX)));
    html.style.setProperty('--rw', w + 'px');
    store.set('rw', w);
  };
  const up = () => { html.classList.remove('rp-resizing'); removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
});
document.addEventListener('dblclick', e => {
  if (!e.target.closest('.rp-grip')) return;
  document.documentElement.style.removeProperty('--rw'); store.set('rw', 0);
});

// Sidebar tree: "Günler" (Mon…Sun) first, then each "ana liste" with its lists, then loose lists. Groups fold open on click.
function renderSideLists() {
  const box = $('#side-lists');
  if (!box) return;
  box.innerHTML = listTreeHtml();
  markNav();
}

function listTreeHtml() {
  const todayWd = (new Date().getDay() + 6) % 7;
  const dayCount = i => (state.dayCounts || [])[i] || 0;
  const listBtn = (l, child) => `<button class="nav-item ${child ? 'child' : ''}" data-view="list:${l.id}" data-lid="${l.id}">${ico('list', 18)}<span class="nm">${esc(l.name)}</span><b class="count">${l.open || ''}</b></button>`;
  const group = (key, name, icon, inner, attrs = '', hasActive = false, gid = '') => {
    const open = store.get('grp_' + key, false) || hasActive;
    return `<div class="grp ${open ? 'open' : ''}" ${gid ? `data-gid="${gid}"` : ''}><button class="nav-item grp-h" data-grp-toggle="${key}" ${attrs}>
      <span class="chev">${ico('right', 14)}</span>${ico(icon, 18)}<span class="nm">${esc(name)}</span></button><div class="grp-body" ${gid ? `data-gid="${gid}"` : ''}>${inner}</div></div>`;
  };
  const days = DAYS_LONG.map((d, i) => `<button class="nav-item child ${i === todayWd ? 'is-today' : ''}" data-day-nav="${i}" title="${d} rutinleri — görevi buraya sürükleyip bırakırsan her ${d} gelir">
    ${ico('cal', 16)}<span class="nm">${d}${i === todayWd ? ' <i class="today-dot"></i>' : ''}</span><b class="count">${dayCount(i) || ''}</b></button>`).join('');
  const future = UP_RANGES.map(([k, l, hint]) => `<button class="nav-item child" data-view="upcoming:${k}" title="${esc(hint)}">${ico('cal', 16)}<span class="nm">${esc(l)}</span></button>`).join('');
  let html = group('future', 'Gelecek', 'telescope', future, '', isUpView(state.view));
  html += group('days', 'Günler', 'calcheck', days, '', state.view === 'routines' && typeof state.rtab === 'number');
  // top level in manual (sort) order: groups and loose lists mixed
  for (const l of state.lists.filter(x => x.kind === 'group' || !x.parent_id)) {
    if (l.kind !== 'group') { html += listBtn(l, false); continue; }
    const kids = realLists().filter(k => k.parent_id === l.id);
    html += group('g' + l.id, l.name, 'folder',
      kids.map(k => listBtn(k, true)).join('') || '<div class="grp-empty">Boş — bir listeyi buraya sürükle</div>',
      `data-lid="${l.id}"`, kids.some(k => state.view === 'list:' + k.id), l.id);
  }
  return html;
}

// Sidebar drag & drop (mouse): reorder lists and "ana liste" groups; drop a list inside a group to put it there.
function bindSideDrag(side) {
  let d = null;
  const box = () => $('#side-lists');
  side.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.pointerType !== 'mouse') return;
    const btn = e.target.closest('#side-lists [data-lid]');
    if (!btn) return;
    const grp = btn.classList.contains('grp-h') ? btn.closest('.grp[data-gid]') : null;
    if (btn.classList.contains('grp-h') && !grp) return;           // the built-in "Günler" group is fixed
    d = { el: grp || btn, isGroup: !!grp, x: e.clientX, y: e.clientY, id: e.pointerId, started: false };
  });
  window.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
      d.started = true;
      d.el.classList.add('side-drag-src');
      document.body.classList.add('dragging');
    }
    e.preventDefault();
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || !box().contains(under)) return;
    // where can it go? lists: top level or inside a user group; groups: top level only
    let container = box();
    const body = under.closest('.grp-body[data-gid]');
    const head = under.closest('.grp[data-gid] > .grp-h');
    if (!d.isGroup && body) container = body;
    else if (!d.isGroup && head && head.closest('.grp') !== d.el) {
      const g = head.closest('.grp');
      if (!g.classList.contains('open')) { g.classList.add('open'); store.set('grp_g' + g.dataset.gid, true); }
      container = g.querySelector('.grp-body');
    }
    const kids = [...container.children].filter(c => c !== d.el && (c.matches('[data-lid]') || c.matches('.grp[data-gid]')));
    const next = kids.find(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + Math.min(r.height, 40) / 2; });
    container.querySelector(':scope > .grp-empty')?.remove();
    if (next) { if (next !== d.el.nextElementSibling || d.el.parentElement !== container) container.insertBefore(d.el, next); }
    else if (container.lastElementChild !== d.el) container.appendChild(d.el);
    d.el.classList.toggle('child', !d.isGroup && container !== box());
  }, { passive: false });
  window.addEventListener('pointerup', async e => {
    if (!d || e.pointerId !== d.id) return;
    const cur = d;
    d = null;
    if (!cur.started) return;
    cur.el.classList.remove('side-drag-src');
    document.body.classList.remove('dragging');
    state.suppressSideClick = true;
    setTimeout(() => { state.suppressSideClick = false; }, 60);
    const container = cur.el.parentElement;
    const gid = container.dataset && container.dataset.gid ? +container.dataset.gid : null;
    const ids = [...container.children].map(c => c.matches('.grp[data-gid]') ? +c.dataset.gid : c.dataset.lid ? +c.dataset.lid : null).filter(Boolean);
    try { await api('/lists/order', { method: 'POST', body: { ids, parent_id: gid } }); } catch { /* shown */ }
    loadLists();
  });
}

function toggleGroup(key, btn) {
  const g = btn.closest('.grp');
  g.classList.toggle('open');
  store.set('grp_' + key, g.classList.contains('open'));
}

function markNav() {
  const gt = $('.topbar [data-go-today]');
  if (gt) gt.classList.toggle('on', state.view === 'today');
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === state.view));
  document.querySelectorAll('[data-day-nav]').forEach(b => b.classList.toggle('on', state.view === 'routines' && state.rtab === +b.dataset.dayNav));
}

async function createGroup() {
  const name = await askText('Yeni ana liste', '', 'Örn. İş, Ev işleri…');
  if (!name) return null;
  const g = await api('/lists', { method: 'POST', body: { name, kind: 'group' } });
  store.set('grp_g' + g.id, true);
  await loadLists();
  toast(`"${name}" ana listesi oluşturuldu — listelerini sağ tık → Ana listeye taşı ile içine al`);
  return g;
}

function askText(title, value = '', placeholder = '') {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const s = sheet(`
      <form id="ask"><div class="sheet-h"><b>${esc(title)}</b><button type="button" class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
      <div class="field"><input id="ask-in" class="title-input" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="60" autocomplete="off"></div>
      <div class="sheet-f"><span></span><div class="row"><button type="button" class="btn ghost sm" data-close>Vazgeç</button><button class="btn sm" type="submit">Kaydet</button></div></div></form>
    `, () => finish(null));
    const inp = $('#ask-in');
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
    $('#ask').onsubmit = e => {
      e.preventDefault();
      const v = inp.value.trim();
      if (!v) return;
      finish(v);
      s.close(false);
    };
  });
}

async function createFolder() {
  const name = await askText('Yeni liste', '', 'Örn. İş, Ev, Okul…');
  if (!name) return null;
  const l = await api('/lists', { method: 'POST', body: { name } });
  await loadLists();
  toast(`"${name}" listesi oluşturuldu`);
  return l;
}

// lid 0 = Genel (no rename / duplicate / delete)
function groupMenu(g) {
  return [
    { icon: 'listplus', label: 'Bu ana listeye yeni liste', run: async () => {
      const name = await askText(`"${g.name}" içine yeni liste`, '', 'Örn. Siparişler');
      if (!name) return;
      const l = await api('/lists', { method: 'POST', body: { name, parent_id: g.id } });
      store.set('grp_g' + g.id, true);
      await loadLists();
      go('list:' + l.id);
    } },
    { icon: 'pencil', label: 'Yeniden adlandır', run: async () => {
      const name = await askText('Ana listeyi yeniden adlandır', g.name);
      if (!name || name === g.name) return;
      await api(`/lists/${g.id}`, { method: 'PATCH', body: { name } });
      loadLists();
    } },
    { sep: true },
    { icon: 'trash', label: 'Ana listeyi sil', danger: true, run: async () => {
      if (!confirm(`"${g.name}" ana listesi silinsin mi? İçindeki listeler silinmez, ana listenin dışına çıkar.`)) return;
      await api(`/lists/${g.id}`, { method: 'DELETE' });
      await loadLists();
      toast('Ana liste silindi');
    } },
  ];
}

function folderMenu(lid) {
  const l = lid ? state.lists.find(x => x.id === lid) : { id: 0, name: 'Genel' };
  if (!l) return [];
  if (l.kind === 'group') return groupMenu(l);
  const short = fmtShort;
  const send = async (date, myDay = false) => {
    const r = await api(`/lists/${lid}/schedule`, { method: 'POST', body: { due_date: date, my_day: myDay } });
    toast(r.updated ? `${r.updated} görev ${fmtDue(date)} tarihine gönderildi` : 'Listede açık görev yok');
    rerender();
  };
  const top = [
    { icon: 'sort', label: `Sırala: ${SORTS[sortOf(lid)]}`, sub: sortItems(lid) },
    { icon: 'printer', label: 'Listeyi yazdır', run: () => printList(l) },
    { sep: true },
  ];
  const share = [{ sep: true }, { icon: 'share', label: 'Listeyi paylaş', run: () => shareList(l) }];
  const common = [
    { icon: 'sun', label: 'Tüm listeyi günüme ekle', run: async () => {
      const r = await api(`/lists/${lid}/myday`, { method: 'POST' });
      toast(r.updated ? `${r.updated} görev Bugün listene eklendi` : 'Listedeki görevler zaten Bugün\'de (ya da açık görev yok)');
      rerender();
      updateCount();
    } },
    { icon: 'send', label: 'Şu tarihe veya güne gönder', sub: [
      { icon: 'sun', label: 'Bugün (Günüme ekle)', run: () => send(dateIn(0), true) },
      { icon: 'cal', label: `Yarın (${short(dateIn(1))})`, run: () => send(dateIn(1)) },
      { sep: true },
      ...[2, 3, 4, 5, 6, 7].map(k => { const d = dateIn(k); return { icon: 'cal', label: `${DAYS_LONG[wdOf(d)]} (${short(d)})`, run: () => send(d) }; }),
      { sep: true },
      { icon: 'calcheck', label: 'Tarih seç…', date: true, run: v => send(v) },
    ] },
    { icon: 'mail', label: 'Listeyi e-posta ile gönder', run: () => emailList(l) },
  ];
  if (!lid) return [...top, ...common, ...share];
  return [
    ...top,
    ...common,
    { icon: 'folder', label: 'Ana listeye taşı', sub: [
      ...state.lists.filter(g => g.kind === 'group').map(g => ({ icon: 'folder', label: g.name, check: l.parent_id === g.id, run: async () => {
        await api(`/lists/${lid}/parent`, { method: 'POST', body: { parent_id: g.id } });
        store.set('grp_g' + g.id, true);
        await loadLists();
        toast(`"${l.name}" → ${g.name}`);
      } })),
      ...(l.parent_id ? [{ sep: true }, { icon: 'x', label: 'Ana listeden çıkar', run: async () => {
        await api(`/lists/${lid}/parent`, { method: 'POST', body: { parent_id: null } });
        await loadLists();
      } }] : []),
      { sep: true },
      { icon: 'folderplus', label: 'Yeni ana liste…', run: async () => {
        const g = await createGroup();
        if (!g) return;
        await api(`/lists/${lid}/parent`, { method: 'POST', body: { parent_id: g.id } });
        await loadLists();
      } },
    ] },
    { icon: 'copy', label: 'Listeyi çoğalt', run: async () => {
      const n = await api(`/lists/${lid}/duplicate`, { method: 'POST' });
      await loadLists();
      toast(`"${n.name}" oluşturuldu`);
      go('list:' + n.id);
    } },
    { sep: true },
    { icon: 'pencil', label: 'Yeniden adlandır', run: async () => {
      const name = await askText('Listeyi yeniden adlandır', l.name);
      if (!name || name === l.name) return;
      await api(`/lists/${lid}`, { method: 'PATCH', body: { name } });
      await loadLists();
      rerender();
    } },
    { icon: 'trash', label: 'Listeyi sil', danger: true, run: async () => {
      if (!confirm(`"${l.name}" listesi silinsin mi? İçindeki görevler Genel'e taşınır.`)) return;
      await api(`/lists/${lid}`, { method: 'DELETE' });
      await loadLists();
      toast('Liste silindi');
      if (state.view === 'list:' + lid) go('inbox'); else rerender();
    } },
    ...share,
  ];
}

// ---------- list order (per list, saved on the server: the same on every device) ----------
const SORTS = { manual: 'Elle (sürükle-bırak)', important: 'Önem derecesi', alpha: 'Alfabetik', due: 'Son tarih', created: 'Yeniden eskiye', oldest: 'Eskiden yeniye' };
const sortOf = lid => (state.listSort || {})[String(lid)] || 'manual';

// inToday: Günüm orders "Yeni → Eski" by when a card came INTO Günüm (added_at), lists by when it was written
function sortTasks(items, mode, inToday) {
  const at = x => (inToday && x.added_at) || x.created_at || '';
  const by = {
    important: (a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0),
    alpha: (a, b) => a.title.localeCompare(b.title, 'tr', { sensitivity: 'base', numeric: true }),
    due: (a, b) => (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99'),
    created: (a, b) => at(b).localeCompare(at(a)) || (b.task_id || 0) - (a.task_id || 0),  // newest first; same second → higher id
    oldest: (a, b) => (at(a) || '9999').localeCompare(at(b) || '9999') || (a.task_id || 0) - (b.task_id || 0),
  }[mode];
  if (!by) return items;  // manual: the server's drag & drop order
  // pinned tasks stay on top; ties keep the manual order (Array.sort is stable)
  return [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || by(a, b));
}

const TODAY_LIST = { id: 'today', name: 'Bugün' };

function todayMenu() {
  return [
    { icon: 'sort', label: `Sırala: ${SORTS[sortOf('today')]}`, sub: sortItems('today') },
    { icon: 'printer', label: 'Listeyi yazdır', run: () => printList(TODAY_LIST) },
    { sep: true },
    { icon: 'mail', label: 'Listeyi e-posta ile gönder', run: () => emailList(TODAY_LIST) },
    { sep: true },
    { icon: 'share', label: 'Listeyi paylaş', run: () => shareList(TODAY_LIST) },
  ];
}

async function setSort(lid, k) {
  if (k === sortOf(lid)) return;
  try { await api('/settings', { method: 'PATCH', body: { list_sort: { list: lid, mode: k } } }); } catch { return; }
  state.listSort = { ...(state.listSort || {}), [String(lid)]: k };
  if (k === 'manual') delete state.listSort[String(lid)];
  toast(k === 'manual' ? 'Elle sıralama: kartları sürükleyerek dizebilirsin' : `Sıralama: ${SORTS[k]}`);
  rerender();
}

function sortItems(lid) {
  const cur = sortOf(lid);
  const icons = { manual: 'grip', important: 'star', alpha: 'sort', due: 'cal', created: 'clock', oldest: 'clock' };
  return Object.entries(SORTS).map(([k, label]) => ({ icon: icons[k], label, check: cur === k, run: () => setSort(lid, k) }));
}

// Always-visible "Yeni → Eski | Eski → Yeni" switch above the open cards (lists and Günüm), whatever the order is.
// Tapping the lit one again goes back to the manual (drag & drop) order.
function sortToggle(lid) {
  const cur = sortOf(lid);
  const b = (k, txt, tip) => `<button class="${cur === k ? 'on' : ''}" data-act="sortset" data-lid="${lid}" data-mode="${k}" title="${tip}${cur === k ? ' — tekrar dokun: elle sıralama' : ''}" aria-pressed="${cur === k}">${txt}</button>`;
  return `<div class="sort-row"><div class="sort-toggle" role="group" aria-label="Tarihe göre sırala">${b('created', 'Yeni → Eski', 'Yeniden eskiye')}${b('oldest', 'Eski → Yeni', 'Eskiden yeniye')}</div></div>`;
}

// ---------- list export: e-mail / print / share ----------
// the open items of a list (l.id 0 = Genel) or of Günüm (l.id 'today'), in the order chosen for it
async function listItems(l) {
  const items = l.id === 'today' ? (await api('/today')).items.filter(i => !i.done) : (await api('/tasks?list=' + l.id)).items;
  return sortTasks(items, sortOf(l.id), l.id === 'today');
}

async function listLines(l) {
  const items = await listItems(l);
  return items.map(t => `☐ ${t.title}${t.due_date ? ` (${fmtShort(t.due_date)})` : ''}${t.important ? ' ★' : ''}${t.notes ? `\n    ${t.notes.replace(/\n/g, '\n    ')}` : ''}`);
}

async function listText(l) {
  const lines = await listLines(l);
  return `${l.name} — ${fmtLong(todayStr())}\n\n${lines.length ? lines.join('\n') : '(Açık görev yok)'}`;
}

async function emailList(l) {
  const body = await listText(l);
  location.href = `mailto:?subject=${encodeURIComponent('Liste: ' + l.name)}&body=${encodeURIComponent(body)}`;
}

async function shareList(l) {
  const text = await listText(l);
  if (navigator.share) {
    try { await navigator.share({ title: l.name, text }); } catch (e) { if (e.name !== 'AbortError') toast('Paylaşılamadı'); }
    return;
  }
  try { await navigator.clipboard.writeText(text); toast('Liste panoya kopyalandı — istediğin yere yapıştır'); } catch { toast('Paylaşma bu tarayıcıda desteklenmiyor'); }
}

async function printList(l) {
  const items = await listItems(l);
  let root = $('#print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = `<h1>${esc(l.name)}</h1><p class="pd">${fmtLong(todayStr())} · ${items.length} görev</p>
    <ul>${items.map(t => `<li><span class="box"></span><div><b>${esc(t.title)}</b>${t.important ? ' ★' : ''}${t.due_date ? `<small> · ${fmtShort(t.due_date)}</small>` : ''}${t.notes ? `<p>${esc(t.notes)}</p>` : ''}</div></li>`).join('') || '<li>Açık görev yok</li>'}</ul>`;
  setTimeout(() => window.print(), 50);
}

// ---------- context menu (right click / long press) ----------
let menuEl = null;
function closeMenu() {
  if (!menuEl) return;
  menuEl.remove();
  menuEl = null;
  document.removeEventListener('keydown', menuKey);
}
const menuKey = e => { if (e.key === 'Escape') closeMenu(); };

function openMenu(x, y, items) {
  closeMenu();
  if (!items.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'ctx-wrap';
  wrap.innerHTML = '<div class="ctx" role="menu"></div>';
  document.body.appendChild(wrap);
  menuEl = wrap;
  document.addEventListener('keydown', menuKey);
  wrap.addEventListener('click', e => { if (e.target === wrap) closeMenu(); });
  wrap.addEventListener('contextmenu', e => { e.preventDefault(); if (e.target === wrap) closeMenu(); });
  const box = wrap.firstElementChild;
  const render = (list, back) => {
    box.innerHTML = (back ? `<button class="ctx-i ctx-back">${ico('left', 16)}<span>Geri</span></button><div class="ctx-sep"></div>` : '') +
      list.map((it, i) => it.sep ? '<div class="ctx-sep"></div>'
        : it.info ? `<div class="ctx-info">${it.html}</div>`
        : it.date ? `<label class="ctx-i">${ico(it.icon, 16)}<span>${esc(it.label)}</span><input type="date" data-i="${i}" data-show-picker></label>`
        : `<button class="ctx-i ${it.danger ? 'danger' : ''}" data-i="${i}" role="menuitem">${ico(it.icon, 16)}<span>${esc(it.label)}</span>${it.check ? ico('check', 15) : ''}${it.sub ? `<i class="ctx-more">${ico('right', 15)}</i>` : ''}</button>`).join('');
    box.querySelectorAll('button[data-i]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      const it = list[+b.dataset.i];
      if (it.sub) render(it.sub, () => render(list, back));
      else { closeMenu(); it.run(); }
    });
    box.querySelectorAll('input[data-i]').forEach(inp => inp.onchange = () => {
      if (!inp.value) return;
      const it = list[+inp.dataset.i];
      closeMenu();
      it.run(inp.value);
    });
    const b = box.querySelector('.ctx-back');
    if (b) b.onclick = e => { e.stopPropagation(); back(); };
    place();
  };
  const place = () => {
    if (window.innerWidth <= 760) { box.style.left = box.style.top = ''; return; }  // bottom sheet on phones
    const w = box.offsetWidth, h = box.offsetHeight;
    box.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + 'px';
    box.style.top = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
  };
  render(items);
}

function openCtxFor(row, x, y) {
  if (row.matches('.done-sec > summary')) { openMenu(x, y, doneSecMenu(row.parentElement)); return; }
  if (row.dataset.id && state.sel.size > 1 && state.sel.has(row.dataset.id)) { openMenu(x, y, bulkMenu()); return; }
  if (row.dataset.lid && !row.classList.contains('item')) { openMenu(x, y, folderMenu(+row.dataset.lid)); return; }
  if (row.dataset.rid) { openMenu(x, y, routineMenu(state.routines.find(r => r.id === +row.dataset.rid))); return; }
  const it = state.idx[row.dataset.id];
  if (!it) return;
  openMenu(x, y, it.kind === 'task' ? taskMenu(it, row) : routineItemMenu(it, row));
}

function bindLongPress(root) {
  let t = null, sx = 0, sy = 0;
  root.addEventListener('touchstart', e => {
    const row = e.target.closest('.item, [data-lid], .done-sec > summary');
    if (!row || e.touches.length > 1 || e.target.closest('.grip')) return;  // the grip is for dragging
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    t = setTimeout(() => { t = null; state.suppressClick = true; haptic(); openCtxFor(row, sx, sy); }, 480);
  }, { passive: true });
  root.addEventListener('touchmove', e => {
    if (t && (Math.abs(e.touches[0].clientX - sx) > 10 || Math.abs(e.touches[0].clientY - sy) > 10)) { clearTimeout(t); t = null; }
  }, { passive: true });
  root.addEventListener('touchend', e => {
    if (t) { clearTimeout(t); t = null; }
    if (state.suppressClick) { e.preventDefault(); setTimeout(() => { state.suppressClick = false; }, 400); }
  });
}

// ---------- multi-select (click = select, Ctrl = add/remove, Shift = range) + bulk actions ----------
const touchUi = () => window.matchMedia('(hover: none)').matches;

function selectClick(row, e) {
  const id = row.dataset.id;
  const ids = [...row.parentElement.querySelectorAll(':scope > .item[data-id]')].map(r => r.dataset.id);
  if (e.shiftKey && state.anchor && ids.includes(state.anchor)) {
    const [a, b] = [ids.indexOf(state.anchor), ids.indexOf(id)].sort((m, n) => m - n);
    if (!(e.ctrlKey || e.metaKey)) state.sel.clear();
    ids.slice(a, b + 1).forEach(i => state.sel.add(i));
  } else if (e.ctrlKey || e.metaKey || (touchUi() && state.sel.size)) {
    if (state.sel.has(id)) state.sel.delete(id); else state.sel.add(id);
    state.anchor = id;
  } else {
    state.sel.clear();
    state.sel.add(id);
    state.anchor = id;
  }
  paintSel();
}

function paintSel() {
  document.querySelectorAll('#main .item[data-id]').forEach(r => r.classList.toggle('selected', state.sel.has(r.dataset.id)));
  renderSelBar();
}

function clearSel() {
  state.sel.clear();
  state.anchor = null;
  paintSel();
}

const selItems = () => [...state.sel].map(id => state.idx[id]).filter(Boolean);
const selTasks = () => selItems().filter(i => i.kind === 'task');

function renderSelBar() {
  let bar = $('#selbar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'selbar'; document.body.appendChild(bar); }
  const n = state.sel.size;
  document.body.classList.toggle('has-sel', n > 0);
  if (!n) { bar.hidden = true; bar.innerHTML = ''; return; }
  const b = (act, icon, label) => `<button data-bulk="${act}" title="${label}">${ico(icon, 17)}<span>${label}</span></button>`;
  bar.hidden = false;
  bar.innerHTML = `<b>${n} seçili</b>
    ${selItems().every(it => it.done) ? b('done', 'circle', 'Geri aç') : b('done', 'check', 'Tamamla')}${b('myday', 'sun', 'Günüme ekle')}${b('pin', 'pin', 'Sabitle')}
    ${b('week', 'send', 'Güne gönder')}${b('date', 'cal', 'Tarih')}${b('move', 'move', 'Taşı')}${b('del', 'trash', 'Sil')}
    <button data-bulk="clear" class="x" title="Seçimi kaldır (Esc)">${ico('x', 17)}</button>`;
  bar.querySelectorAll('[data-bulk]').forEach(btn => btn.onclick = () => {
    const act = btn.dataset.bulk;
    if (act === 'clear') return clearSel();
    const item = bulkMenu().find(m => m.key === act);
    const r = btn.getBoundingClientRect();
    if (item.sub) openMenu(r.left, r.top - 8 - Math.min(380, item.sub.length * 40), item.sub);
    else item.run();
  });
}

async function bulkRun(label, fn, undo) {
  const items = selItems();
  if (!items.length) return;
  try { await Promise.all(items.map(fn)); } catch { /* api() already showed the error */ }
  clearSel();
  await rerender();
  loadLists();
  if (undo) toast(label, 'Geri al', async () => { await Promise.all(items.map(undo)); rerender(); loadLists(); });
  else toast(label);
  celebrateIfAllDone();
}

// ---------- "all done today" celebration (celebrate.js is fetched only the first time it is needed) ----------
let celebrationScript = null;
function loadCelebration() {
  celebrationScript = celebrationScript || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/celebrate.js?v=7';
    s.onload = resolve;
    s.onerror = () => { celebrationScript = null; reject(); };
    document.head.appendChild(s);
  });
  return celebrationScript;
}

// Called only after the user completes cards, so every "last open card done" is a real finish: the party plays
// each time (a reopened card ticked again celebrates again — user request), just not on top of a running one.
async function celebrateIfAllDone() {
  if (state.view !== 'today' || !state.todayTotal || document.getElementById('celebrate')) return;
  // count from the server, not the DOM: the card list looks different under a non-manual order (no data-sortable)
  let data;
  try { data = await api('/today', { quiet: true }); } catch { return; }
  if (!data.items.length || data.items.some(i => !i.done) || state.view !== 'today' || document.getElementById('celebrate')) return;
  loadCelebration().then(() => window.runCelebration && window.runCelebration()).catch(() => {});
}

// right-click / long-press on the "Tamamlananlar (N)" header
function doneSecMenu(sec) {
  const items = [...sec.querySelectorAll('.item')].map(r => state.idx[r.dataset.id]).filter(Boolean);
  const set = done => it => api(`/items/${it.id}/done`, { method: 'POST', body: { done } });
  return [{ icon: 'circle', label: `Tümünü tamamlanmadı olarak işaretle (${items.length})`, run: async () => {
    try { await Promise.all(items.map(set(false))); } catch { return; }
    await rerender(); loadLists();
    toast(`${items.length} kart yeniden açıldı`, 'Geri al', async () => { await Promise.all(items.map(set(true))); rerender(); loadLists(); });
  } }];
}

function bulkMenu() {
  const n = state.sel.size;
  const tasks = selTasks();
  const allDone = selItems().every(it => it.done);
  const patch = body => it => it.kind === 'task' ? api(`/tasks/${it.task_id}`, { method: 'PATCH', body }) : null;
  const nextMon = (8 - new Date().getDay()) % 7 || 7;
  const setDate = v => bulkRun(`${tasks.length} göreve tarih verildi`, patch({ due_date: v }));
  return [
    allDone ? { key: 'done', icon: 'circle', label: `${n} kartı tamamlanmadı olarak işaretle`, run: () => bulkRun(`${n} kart yeniden açıldı`,
      it => api(`/items/${it.id}/done`, { method: 'POST', body: { done: false } }),
      it => api(`/items/${it.id}/done`, { method: 'POST', body: { done: true } })) } :
    { key: 'done', icon: 'check', label: `${n} kartı tamamla`, run: () => bulkRun(`${n} kart tamamlandı ✓`,
      it => api(`/items/${it.id}/done`, { method: 'POST', body: { done: true } }),
      it => api(`/items/${it.id}/done`, { method: 'POST', body: { done: false } })) },
    { key: 'assign', icon: 'user', label: `${n} kartı kişiye ata`, run: () => openAssignSheet(selItems()) },
    { key: 'myday', icon: 'sun', label: 'Günüme ekle', run: () => bulkRun(`${tasks.length} görev Bugün'e eklendi`, patch({ my_day: true })) },
    { key: 'pin', icon: 'pin', label: 'Başa sabitle', run: () => bulkRun(`${tasks.length} görev sabitlendi 📌`, patch({ pinned: true })) },
    { key: 'date', icon: 'cal', label: 'Tarih seçin', sub: [
      { icon: 'cal', label: 'Bugün', run: () => setDate(dateIn(0)) },
      { icon: 'cal', label: 'Yarın', run: () => setDate(dateIn(1)) },
      { icon: 'cal', label: 'Gelecek hafta (Pzt)', run: () => setDate(dateIn(nextMon)) },
      { icon: 'calcheck', label: 'Tarih seç…', date: true, run: v => setDate(v) },
      { sep: true },
      { icon: 'x', label: 'Tarihi kaldır', run: () => bulkRun('Tarihler kaldırıldı', patch({ due_date: null })) },
    ] },
    { key: 'week', icon: 'send', label: 'Haftanın gününe gönder', sub: weekdayItems(day => sendWeekly(selItems(), day)) },
    { key: 'move', icon: 'move', label: 'Taşı', sub: [
      { icon: 'inbox', label: 'Genel', run: () => bulkRun(`${tasks.length} görev Genel'e taşındı`, patch({ list_id: null })) },
      ...realLists().map(l => ({ icon: 'list', label: l.name, run: () => bulkRun(`${tasks.length} görev → ${l.name}`, patch({ list_id: l.id })) })),
    ] },
    { sep: true },
    { key: 'del', icon: 'trash', label: `${tasks.length} görevi sil`, danger: true, run: () => bulkRun(`${tasks.length} görev silindi`,
      it => it.kind === 'task' ? api(`/tasks/${it.task_id}`, { method: 'DELETE' }) : null,
      it => it.kind === 'task' ? api(`/tasks/${it.task_id}/restore`, { method: 'POST' }) : null) },
  ];
}

document.addEventListener('keydown', e => {
  if (!$('#main') || $('#sheet-root').innerHTML || menuEl || isTyping(e)) return;
  if (e.key === 'Escape' && state.sel.size) clearSel();
  else if (e.key === 'Delete' && state.sel.size) { e.preventDefault(); bulkMenu().find(m => m.key === 'del').run(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
    const rows = document.querySelectorAll('#main .list[data-sortable] > .item[data-id]');
    if (!rows.length) return;
    e.preventDefault();
    rows.forEach(r => state.sel.add(r.dataset.id));
    paintSel();
  }
});

// ---------- drag & drop: reorder cards, or drop a task on a list in the sidebar / list chips ----------
function dropTargetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const dn = el.closest('.side [data-day-nav]');
  if (dn) return { el: dn, day: +dn.dataset.dayNav };  // weekday under "Günler" → weekly routine
  const t = el.closest('.side [data-view], .fchip[data-lid]');
  if (!t) return null;
  if (t.classList.contains('fchip')) return { el: t, list: +t.dataset.lid };  // phone list chips (0 = Genel)
  const v = t.dataset.view;
  if (v === 'today') return { el: t, today: true };
  if (v === 'inbox') return { el: t, list: 0 };
  if (/^list:\d+$/.test(v)) return { el: t, list: +v.slice(5) };
  return null;
}

async function dropOnTarget(it, target) {
  if (it.kind !== 'task') { toast('Rutinler listeye taşınamaz'); return; }
  if (target.day !== undefined) { await sendWeekly([it], target.day); loadLists(); return; }
  if (target.today) {
    await api(`/tasks/${it.task_id}`, { method: 'PATCH', body: { my_day: true } });
    toast(`"${it.title}" Bugün'e eklendi`);
  } else {
    if ((it.list_id || 0) === target.list) return;
    await api(`/tasks/${it.task_id}`, { method: 'PATCH', body: { list_id: target.list || null } });
    const name = target.list ? (state.lists.find(l => l.id === target.list) || {}).name : 'Genel';
    toast(`"${it.title}" → ${name} listesine taşındı`);
  }
  await loadLists();
  rerender();
}

async function saveOrder(list) {
  const ids = [...list.querySelectorAll(':scope > .item[data-id]')].map(r => r.dataset.id);
  if (list.dataset.sortable === 'today') await api('/today/order', { method: 'POST', body: { ids }, quiet: true });
  else await api('/tasks/order', { method: 'POST', body: { ids: ids.map(i => +i.slice(1)) }, quiet: true });
}

function bindDrag(main) {
  let d = null;
  const clearHover = () => document.querySelectorAll('.drop-hover').forEach(e => e.classList.remove('drop-hover'));
  main.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const row = e.target.closest('.list[data-sortable] > .item[data-id]');
    if (!row) return;
    const onGrip = !!e.target.closest('.grip');
    if (e.pointerType !== 'mouse' && !onGrip) return;          // touch: only from the grip, so scrolling still works
    if (!onGrip && e.target.closest('button, input, a')) return; // clicks on the checkbox / star stay clicks
    d = { row, list: row.parentElement, x: e.clientX, y: e.clientY, id: e.pointerId, started: false, target: null };
  });
  window.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
      const r = d.row.getBoundingClientRect();
      // a narrow copy held near its left edge, so list names in the sidebar stay visible under it
      d.offX = Math.min(e.clientX - r.left, 48); d.offY = e.clientY - r.top;
      d.ghost = d.row.cloneNode(true);
      d.ghost.classList.add('drag-ghost');
      d.ghost.style.width = Math.min(r.width, 420) + 'px';
      d.ghost.style.transformOrigin = `${d.offX}px ${d.offY}px`;
      document.body.appendChild(d.ghost);
      d.row.classList.add('drag-src');
      document.body.classList.add('dragging');
      d.started = true;
      closeMenu();
    }
    e.preventDefault();
    const target = dropTargetAt(e.clientX, e.clientY);
    d.ghost.style.transform = `translate(${e.clientX - d.offX}px, ${e.clientY - d.offY}px)${target ? ' scale(.6)' : ''}`;
    d.ghost.style.opacity = target ? '.75' : '';
    clearHover();
    d.target = target;
    if (target) target.el.classList.add('drop-hover');
    else {
      const sibs = [...d.list.querySelectorAll(':scope > .item')].filter(s => s !== d.row);
      const next = sibs.find(s => { const r = s.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if (next) { if (next !== d.row.nextElementSibling) d.list.insertBefore(d.row, next); }
      else if (sibs.length && d.list.lastElementChild !== d.row) d.list.appendChild(d.row);
    }
    if (e.clientY < 70) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
  }, { passive: false });
  const finish = async (e, cancelled) => {
    if (!d || (e && e.pointerId !== d.id)) return;
    const cur = d;
    d = null;
    if (!cur.started) return;
    cur.ghost.remove();
    cur.row.classList.remove('drag-src');
    document.body.classList.remove('dragging');
    clearHover();
    state.suppressClick = true;
    setTimeout(() => { state.suppressClick = false; }, 60);
    if (cancelled) { rerender(); return; }
    const it = state.idx[cur.row.dataset.id];
    try {
      if (cur.target && it) await dropOnTarget(it, cur.target);
      else await saveOrder(cur.list);
    } catch { rerender(); }
  };
  window.addEventListener('pointerup', e => finish(e, false));
  window.addEventListener('pointercancel', e => finish(e, true));
}

// Monday…Sunday; send(dayIndex) is called with 0 = Monday … 6 = Sunday.
function weekdayItems(send) {
  const today = (new Date().getDay() + 6) % 7;
  return DAYS_LONG.map((name, i) => ({ icon: 'repeat', label: `Her ${name}${i === today ? ' (bugün)' : ''}`, run: () => send(i) }));
}

// "Haftanın gününe gönder": the tasks stay in their list and also become weekly routines on that day.
async function sendWeekly(items, day) {
  const tasks = items.filter(i => i.kind === 'task');
  if (!tasks.length) { toast('Rutinler zaten haftalık'); return; }
  try {
    await Promise.all(tasks.map(t => api(`/tasks/${t.task_id}/weekly`, { method: 'POST', body: { day } })));
  } catch { return; }
  if (state.sel.size) clearSel();
  state.routines = [];
  toast(`${tasks.length > 1 ? tasks.length + ' görev' : '"' + tasks[0].title + '"'} her ${DAYS_LONG[day]} gelecek — Rutinler → ${DAYS[day]}`);
  rerender();
}

function taskMenu(it, row) {
  const patch = async body => { await api(`/tasks/${it.task_id}`, { method: 'PATCH', body }); rerender(); };
  const nextMon = (8 - new Date().getDay()) % 7 || 7;
  const move = async lid => { await patch({ list_id: lid }); toast(lid ? `"${state.lists.find(l => l.id === lid).name}" listesine taşındı` : 'Genel\'e taşındı'); };
  return [
    { icon: 'user', label: it.assignee ? `Atanan: ${it.assignee.name} — değiştir` : 'Kişi ata', run: () => openAssignSheet(it) },
    { icon: 'repeat', label: 'Görevi tekrarla', sub: recurMenu(it) },
    { icon: 'sun', label: it.my_day ? 'Günümden kaldır' : 'Günüme ekle', run: () => patch({ my_day: !it.my_day }) },
    { icon: 'pin', label: it.pinned ? 'Sabitlemeyi kaldır' : 'Başa sabitle', run: () => togglePin(it) },
    { icon: it.done ? 'circle' : 'check', label: it.done ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle', run: () => toggleItem(it, row) },
    { icon: 'cal', label: 'Tarih seçin', sub: [
      { icon: 'cal', label: 'Bugün', run: () => patch({ due_date: dateIn(0) }) },
      { icon: 'cal', label: 'Yarın', run: () => patch({ due_date: dateIn(1) }) },
      { icon: 'cal', label: 'Gelecek hafta (Pzt)', run: () => patch({ due_date: dateIn(nextMon) }) },
      { icon: 'calcheck', label: 'Tarih seç…', date: true, run: v => patch({ due_date: v }) },
      ...(it.due_date ? [{ sep: true }, { icon: 'x', label: 'Tarihi kaldır', run: () => patch({ due_date: null }) }] : []),
    ] },
    { icon: 'send', label: 'Haftanın gününe gönder', sub: weekdayItems(day => sendWeekly([it], day)) },
    { icon: 'move', label: 'Görevi taşı', sub: [
      { icon: 'inbox', label: 'Genel', check: !it.list_id, run: () => move(null) },
      ...realLists().map(l => ({ icon: 'list', label: l.name, check: it.list_id === l.id, run: () => move(l.id) })),
      { sep: true },
      { icon: 'listplus', label: 'Yeni liste…', run: async () => { const l = await createFolder(); if (l) move(l.id); } },
    ] },
    ...(it.assignee && it.assignee.link ? [{ icon: 'copy', label: 'Atama bağlantısını kopyala', run: async () => {
      try { await navigator.clipboard.writeText(location.origin + it.assignee.link); toast('Bağlantı kopyalandı — WhatsApp vb. ile gönderebilirsin'); }
      catch { prompt('Bağlantı:', location.origin + it.assignee.link); }
    } }] : []),
    { sep: true },
    { icon: 'trash', label: 'Görevi sil', danger: true, run: () => deleteTask(it) },
  ];
}

function routineItemMenu(it, row) {
  return [
    { icon: 'user', label: 'Kişi ata', run: () => openAssignSheet(it) },
    { icon: it.done ? 'circle' : 'check', label: it.done ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle', run: () => toggleItem(it, row) },
    { icon: 'pencil', label: 'Rutini düzenle', run: async () => {
      if (!state.routines.length) state.routines = (await api('/routines')).items;
      openRoutineSheet(state.routines.find(r => r.id === it.routine_id));
    } },
    ...(it.routine_id ? [onceEntry('Sadece 1 seferlik yap', d => routineOnce({ id: it.routine_id, title: it.title }, d))] : []),
  ];
}

function routineMenu(r) {
  if (!r) return [];
  return [
    { icon: 'pencil', label: 'Düzenle', run: () => openRoutineSheet(r) },
    { icon: 'user', label: 'Kişi ata', run: () => openAssignSheet({ kind: 'routine', title: r.title, important: r.important }) },
    onceEntry('Sadece 1 seferlik yap', d => routineOnce(r, d)),
    { icon: r.active ? 'pause' : 'play', label: r.active ? 'Durdur' : 'Devam ettir', run: async () => {
      await api(`/routines/${r.id}`, { method: 'PATCH', body: { active: !r.active } });
      rerender();
    } },
    { sep: true },
    { icon: 'trash', label: 'Rutini sil', danger: true, run: async () => {
      if (!confirm(`"${r.title}" rutini silinsin mi? Geçmiş kayıtları korunur.`)) return;
      await api(`/routines/${r.id}`, { method: 'DELETE' });
      toast('Rutin silindi');
      rerender();
    } },
  ];
}

function openRepeatSheet(it) {
  let days = 1 << ((new Date().getDay() + 6) % 7);
  const dayBtns = () => DAYS.map((d, i) => `<button type="button" class="${days & (1 << i) ? 'on' : ''}" data-day="${i}">${d}</button>`).join('');
  const s = sheet(`
    <div class="sheet-h"><b>Görevi tekrarla</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    <p class="desc" style="color:var(--muted);margin:0 0 14px">"${esc(it.title)}" seçtiğin günlerde Bugün listene düşer; görev listesinde de kalır.</p>
    <div class="field"><label>Hangi günler</label><div class="daypick" id="rp-days">${dayBtns()}</div></div>
    <div class="field"><label>Saat (isteğe bağlı)</label><input type="time" id="rp-time"></div>
    <div class="sheet-f"><span></span><div class="row"><button class="btn ghost sm" data-close>Vazgeç</button><button class="btn sm" id="rp-ok">Tekrarla</button></div></div>`);
  const bind = () => s.el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
    days ^= 1 << +b.dataset.day;
    b.classList.toggle('on', !!(days & (1 << +b.dataset.day)));
  });
  bind();
  $('#rp-ok').onclick = async () => {
    if (!days) { toast('En az bir gün seç'); return; }
    const rule = { kind: 'weekly', days, time: $('#rp-time').value || null };  // read before the sheet closes
    s.close(false);
    recur(it, rule);
  };
}

// ---------- "Tekrarla": weekly / monthly / chosen dates ----------
async function recur(it, rule) {
  let r;
  try { r = await api(`/tasks/${it.task_id}/recur`, { method: 'POST', body: rule }); } catch { return; }
  state.routines = [];
  const where = (r.kind || 'weekly') === 'weekly' ? 'Rutinler' : 'Rutinler → Aylık / Tarihli';
  toast(`"${it.title}" tekrarlanacak: ${ruleLabel(r)} — ${where}`);
  await loadLists();  // refreshes state.monthly (yellow "ayda bir" frame)
  rerender();
}

function recurMenu(it) {
  const today = new Date();
  const dom = today.getDate();
  const weekly = days => () => recur(it, { kind: 'weekly', days });
  const monthly = d => () => recur(it, { kind: 'monthly', month_day: d });
  return [
    { icon: 'repeat', label: 'Her gün', run: weekly(127) },
    { icon: 'repeat', label: 'Hafta içi (Pzt–Cum)', run: weekly(31) },
    { icon: 'repeat', label: 'Haftada bir', sub: weekdayItems(day => recur(it, { kind: 'weekly', days: 1 << day })) },
    { icon: 'sliders', label: 'Haftanın birkaç günü…', run: () => openRepeatSheet(it) },
    { sep: true },
    { icon: 'cal', label: 'Ayda bir', sub: [
      { icon: 'cal', label: `Her ayın ${dom}. günü (bugünkü gibi)`, run: monthly(dom) },
      ...(dom !== 1 ? [{ icon: 'cal', label: 'Her ayın 1. günü', run: monthly(1) }] : []),
      ...(dom !== 15 ? [{ icon: 'cal', label: 'Her ayın 15. günü', run: monthly(15) }] : []),
      { icon: 'cal', label: 'Her ayın son günü', run: monthly(31) },
      { icon: 'sliders', label: 'Gün seç…', run: () => openMonthlySheet(it) },
    ] },
    { icon: 'calcheck', label: 'Belirli tarihlerde…', run: () => openDatesSheet(it) },
    { sep: true },
    onceEntry('Sadece 1 seferlik', d => once(it, d), it.my_day_on ? [{ sep: true }, { icon: 'x', label: 'İptal et', run: async () => {
      await api(`/tasks/${it.task_id}`, { method: 'PATCH', body: { my_day: false } });
      toast(`"${it.title}" planı iptal edildi`);
      rerender();
    } }] : []),
  ];
}

// The page already says the day (Günüm = today, Günler → Salı = the coming Salı): no list of dates, just that day
function onceHere() {
  if (state.view === 'today') return dateIn(0);
  if (state.view === 'routines' && typeof state.rtab === 'number') {
    for (let i = 0; i < 7; i++) if (wdOf(dateIn(i)) === state.rtab) return dateIn(i);
  }
  return null;
}

// "Sadece 1 seferlik" menu entry: straight to the page's day, otherwise a list of days
function onceEntry(label, pick, extra = []) {
  const d = onceHere();
  if (d) return { icon: 'sun', label: `${label} (${d === todayStr() ? 'bugün' : `${DAYS_LONG[wdOf(d)]} ${fmtShort(d)}`})`, run: () => pick(d) };
  return { icon: 'sun', label, sub: [...onceDays(pick), ...extra] };
}

// Bugün, Yarın, the next 6 days by name, or any date; `cur` = the day already chosen (ticked)
function onceDays(pick, cur) {
  return [
    { icon: 'sun', label: 'Bugün', check: cur === dateIn(0), run: () => pick(dateIn(0)) },
    ...Array.from({ length: 7 }, (_, i) => {
      const d = dateIn(i + 1);
      return { icon: 'sun', label: `${i ? DAYS_LONG[wdOf(d)] : 'Yarın'} · ${fmtShort(d)}`, check: cur === d, run: () => pick(d) };
    }),
    { icon: 'calcheck', label: 'Tarih seç…', date: true, run: v => pick(v) },
  ];
}

// a routine (Rutinler / Günler / its card in Günüm) made "Sadece 1 seferlik": it stops repeating and comes once
async function routineOnce(r, d) {
  if (!d) return;
  if (d < todayStr()) { toast('Geçmiş bir gün seçilemez'); return; }
  try { await api(`/routines/${r.id}/once`, { method: 'POST', body: { date: d } }); } catch { return; }
  state.routines = [];
  const when = d === todayStr() ? 'bugün' : `${DAYS_LONG[wdOf(d)]} ${fmtShort(d)} günü`;
  toast(`"${r.title}" artık tekrar etmeyecek — sadece ${when} Günüm'e gelecek`);
  await loadLists();
  rerender();
}

// "Sadece 1 seferlik": the task comes into Günüm once, on that day; it does not repeat
async function once(it, d) {
  if (!d) return;
  if (d < todayStr()) { toast('Geçmiş bir gün seçilemez'); return; }
  let r;
  try { r = await api(`/tasks/${it.task_id}/once`, { method: 'POST', body: { date: d } }); } catch { return; }
  state.routines = [];
  const when = d === todayStr() ? 'bugün' : `${DAYS_LONG[wdOf(d)]} ${fmtShort(d)} günü`;
  toast(`"${it.title}" sadece ${when} Günüm'e gelecek, tekrar etmeyecek${r.repeat_removed ? ' — eski tekrarı kaldırıldı' : ''}`);
  await loadLists();  // the "Tekrarla" button is no longer green if the repeat was removed
  rerender();
}

function openMonthlySheet(it) {
  const s = sheet(`
    <div class="sheet-h"><b>Ayda bir tekrarla</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    <p class="desc" style="color:var(--muted);margin:0 0 14px">"${esc(it.title)}" her ay seçtiğin gün Bugün listene düşer.</p>
    <div class="field"><label>Ayın hangi günü</label>
      <select id="mo-day">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}" ${i + 1 === new Date().getDate() ? 'selected' : ''}>${i + 1}. gün</option>`).join('')}
        <option value="31">Ayın son günü</option></select></div>
    <div class="field"><label>Saat (isteğe bağlı)</label><input type="time" id="mo-time"></div>
    <div class="sheet-f"><span></span><div class="row"><button class="btn ghost sm" data-close>Vazgeç</button><button class="btn sm" id="mo-ok">Tekrarla</button></div></div>`);
  $('#mo-ok').onclick = () => {
    const rule = { kind: 'monthly', month_day: +$('#mo-day').value, time: $('#mo-time').value || null };
    s.close(false);
    recur(it, rule);
  };
}

function openDatesSheet(it) {
  const dates = [];
  const s = sheet(`
    <div class="sheet-h"><b>Belirli tarihlerde tekrarla</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    <p class="desc" style="color:var(--muted);margin:0 0 14px">"${esc(it.title)}" sadece seçtiğin tarihlerde Bugün listene düşer.</p>
    <div class="field"><label>Tarih ekle</label><div class="row"><input type="date" id="dt-in" class="grow" min="${todayStr()}"><button class="btn sm" id="dt-add">${ico('plus', 15)} Ekle</button></div></div>
    <div class="tchips" id="dt-list"></div>
    <div class="field" style="margin-top:12px"><label>Saat (isteğe bağlı)</label><input type="time" id="dt-time"></div>
    <div class="sheet-f"><span class="meta" id="dt-count"></span><div class="row"><button class="btn ghost sm" data-close>Vazgeç</button><button class="btn sm" id="dt-ok">Kaydet</button></div></div>`);
  const draw = () => {
    dates.sort();
    $('#dt-list').innerHTML = dates.map(d => `<span class="tchip">${DAYS_LONG[wdOf(d)].slice(0, 3)} ${fmtShort(d)}<button data-rm="${d}" aria-label="Kaldır">${ico('x', 13)}</button></span>`).join('')
      || '<span style="color:var(--muted);font-size:13px">Henüz tarih eklenmedi</span>';
    $('#dt-count').textContent = dates.length ? `${dates.length} tarih` : '';
    s.el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { dates.splice(dates.indexOf(b.dataset.rm), 1); draw(); });
  };
  const add = () => {
    const v = $('#dt-in').value;
    if (!v) { toast('Önce tarih seç'); return; }
    if (!dates.includes(v)) dates.push(v);
    $('#dt-in').value = '';
    draw();
  };
  $('#dt-add').onclick = add;
  $('#dt-in').onchange = add;  // picking a date adds it straight away
  $('#dt-ok').onclick = () => {
    if (!dates.length) { toast('En az bir tarih ekle'); return; }
    const rule = { kind: 'dates', dates: [...dates], time: $('#dt-time').value || null };  // read before the sheet closes
    s.close(false);
    recur(it, rule);
  };
  draw();
}

// ---------- sheets ----------
function sheet(html, onClose) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const ov = root.firstElementChild;
  let closed = false;
  const close = async (save = true) => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    if (save && onClose) { try { await onClose(); } catch { /* toast already shown */ } }
    root.innerHTML = '';
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  ov.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close());
  return { el: ov, close };
}

function dateIn(days) { const d = new Date(); d.setDate(d.getDate() + days); return ymd(d); }

async function deleteTask(t) {
  await api(`/tasks/${t.task_id}`, { method: 'DELETE' });
  rerender();
  toast('Görev silindi', 'Geri al', async () => {
    await api(`/tasks/${t.task_id}/restore`, { method: 'POST' });
    toast('Görev geri geldi');
    rerender();
  });
}

const fmtRemind = s => { const [d, h] = s.split(' '); return `${fmtDue(d)} ${h}`; };

function remindPresets() {
  const now = new Date();
  const later = new Date(now.getTime() + 3 * 3600e3);
  const today18 = now.getHours() < 17 ? `${todayStr()} 18:00` : `${ymd(later)} ${pad(later.getHours())}:00`;
  const nextMon = (8 - now.getDay()) % 7 || 7;
  return [[now.getHours() < 17 ? 'Bugün 18:00' : '3 saat sonra', today18], ['Yarın 09:00', `${dateIn(1)} 09:00`], ['Gelecek hafta 09:00', `${dateIn(nextMon)} 09:00`]];
}

function openTaskSheet(t) {
  const st = { my_day: t.my_day, important: t.important, done: t.done };
  const steps = (t.steps || []).map(x => ({ ...x }));
  const s = sheet(`
    <div class="sheet-h"><b>Görev</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    <div class="field"><input class="title-input" id="t-title" value="${esc(t.title)}" maxlength="300"></div>
    <div class="toggles">
      <button class="toggle ${st.my_day ? 'on' : ''}" data-t="my_day">${ico('sun', 16)} <span>${st.my_day ? 'Bugünde' : 'Bugüne ekle'}</span></button>
      <button class="toggle star-t ${st.important ? 'on' : ''}" data-t="important">${ico('star', 16)} Önemli</button>
      <button class="toggle ${st.done ? 'on' : ''}" data-t="done">${ico('check', 16)} Tamamlandı</button>
    </div>
    <div class="field"><label>Adımlar</label><div class="steps" id="t-steps"></div>
      <form class="step-add" id="t-step-form">${ico('plus', 16)}<input id="t-step-in" placeholder="Adım ekle" maxlength="200" autocomplete="off" enterkeyhint="done"></form></div>
    <div class="field"><label>Son tarih</label><input type="date" id="t-due" value="${t.due_date || ''}">
      <div class="presets"><button data-d="0">Bugün</button><button data-d="1">Yarın</button><button data-d="7">Gelecek hafta</button><button data-d="">Kaldır</button></div></div>
    <div class="field"><label>${ico('bell', 13)} Hatırlat (o an bildirim gelir)</label><input type="datetime-local" id="t-remind" value="${t.remind_at ? t.remind_at.replace(' ', 'T') : ''}">
      <div class="presets">${remindPresets().map(([l, v]) => `<button data-r="${v}">${l}</button>`).join('')}<button data-r="">Kaldır</button></div></div>
    <div class="field"><label>Liste</label><select id="t-list"><option value="">Genel</option>${realLists().map(l => `<option value="${l.id}" ${t.list_id === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Notlar</label><textarea id="t-notes" placeholder="Not ekle…" maxlength="5000">${esc(t.notes || '')}</textarea></div>
    <div class="sheet-f"><span class="meta">Oluşturuldu: ${esc((t.created_at || '').slice(0, 16))}</span>
      <div class="row"><button class="btn danger sm" id="t-del">${ico('trash', 16)} Sil</button><button class="btn sm" data-close>Kaydet</button></div></div>
  `, async () => {
    const body = {};
    const title = $('#t-title').value.trim();
    if (title && title !== t.title) body.title = title;
    if ($('#t-notes').value !== (t.notes || '')) body.notes = $('#t-notes').value;
    if (($('#t-due').value || null) !== (t.due_date || null)) body.due_date = $('#t-due').value || null;
    for (const k of ['my_day', 'important', 'done']) if (st[k] !== t[k]) body[k] = st[k];
    const lid = +$('#t-list').value || null;
    if (lid !== (t.list_id || null)) body.list_id = lid;
    if (JSON.stringify(steps) !== JSON.stringify(t.steps || [])) body.steps = steps;
    const rem = $('#t-remind').value ? $('#t-remind').value.replace('T', ' ').slice(0, 16) : null;
    if (rem !== (t.remind_at || null)) body.remind_at = rem;
    if (Object.keys(body).length) {
      await api(`/tasks/${t.task_id}`, { method: 'PATCH', body });
      if (body.remind_at) toast(`Hatırlatma kuruldu: ${fmtRemind(body.remind_at)}`);
      rerender();
    }
  });
  const drawSteps = () => {
    $('#t-steps').innerHTML = steps.map((x, i) => `<div class="step ${x.d ? 'done' : ''}">
      <button class="chk sm" data-si="${i}" aria-label="Adımı tamamla">${ico('check', 11, 3)}</button>
      <input value="${esc(x.t)}" data-se="${i}" maxlength="200"><button class="step-x" data-sx="${i}" aria-label="Adımı sil">${ico('x', 14)}</button></div>`).join('');
    s.el.querySelectorAll('[data-si]').forEach(b => b.onclick = () => { steps[+b.dataset.si].d = !steps[+b.dataset.si].d; drawSteps(); });
    s.el.querySelectorAll('[data-sx]').forEach(b => b.onclick = () => { steps.splice(+b.dataset.sx, 1); drawSteps(); });
    s.el.querySelectorAll('[data-se]').forEach(inp => inp.oninput = () => { steps[+inp.dataset.se].t = inp.value; });
  };
  drawSteps();
  $('#t-step-form').onsubmit = e => {
    e.preventDefault();
    const v = $('#t-step-in').value.trim();
    if (!v || steps.length >= 50) return;
    steps.push({ t: v, d: false });
    $('#t-step-in').value = '';
    drawSteps();
  };
  s.el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const k = b.dataset.t;
    st[k] = !st[k];
    b.classList.toggle('on', st[k]);
    if (k === 'my_day') b.querySelector('span').textContent = st[k] ? 'Bugünde' : 'Bugüne ekle';
  });
  s.el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { $('#t-due').value = b.dataset.d === '' ? '' : dateIn(+b.dataset.d); });
  s.el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { $('#t-remind').value = b.dataset.r.replace(' ', 'T'); });
  $('#t-del').onclick = async () => { s.close(false); deleteTask(t); };
}

function openRoutineSheet(r) {
  if (!r) return;
  let days = r.days;
  const dayBtns = () => DAYS.map((d, i) => `<button type="button" class="${days & (1 << i) ? 'on' : ''}" data-day="${i}">${d}</button>`).join('');
  const s = sheet(`
    <div class="sheet-h"><b>Rutin</b><button class="btn ghost icon" data-close aria-label="Kapat">${ico('x', 18)}</button></div>
    <div class="field"><input class="title-input" id="r-title" value="${esc(r.title)}" maxlength="300"></div>
    ${(r.kind || 'weekly') === 'weekly' ? `<div class="field"><label>Hangi günler</label><div class="daypick" id="r-days">${dayBtns()}</div>
      <div class="presets"><button data-p="127">Her gün</button><button data-p="31">Hafta içi</button><button data-p="96">Hafta sonu</button></div></div>`
    : `<div class="field"><label>Tekrar</label><div class="kbd">${esc(ruleLabel(r, true))}</div>
      <p class="meta" style="color:var(--muted);font-size:12.5px;margin:6px 0 0">Değiştirmek için ilgili görevin 🔁 Tekrarla düğmesini kullan ya da bu rutini silip yeniden kur.</p></div>`}
    <div class="field"><label>Saat (isteğe bağlı — o saatte bildirim gelir)</label><div class="row"><input type="time" id="r-time" value="${r.time || ''}" class="grow"><button class="btn ghost sm" id="r-notime">Saati kaldır</button></div></div>
    <div class="field row" style="justify-content:space-between"><span><b>Aktif</b><br><span class="meta" style="color:var(--muted);font-size:13px">Kapatırsan Bugün listesine düşmez</span></span>
      <label class="switch"><input type="checkbox" id="r-active" ${r.active ? 'checked' : ''}><span></span></label></div>
    <div class="sheet-f"><span class="meta"></span><div class="row"><button class="btn danger sm" id="r-del">${ico('trash', 16)} Sil</button><button class="btn sm" data-close>Kaydet</button></div></div>
  `, async () => {
    const body = {};
    const title = $('#r-title').value.trim();
    if (title && title !== r.title) body.title = title;
    if (days !== r.days) {
      if (!days) { toast('En az bir gün seçmelisin — günler değiştirilmedi'); } else body.days = days;
    }
    if (($('#r-time').value || null) !== (r.time || null)) body.time = $('#r-time').value || null;
    if ($('#r-active').checked !== !!r.active) body.active = $('#r-active').checked;
    if (Object.keys(body).length) { await api(`/routines/${r.id}`, { method: 'PATCH', body }); rerender(); }
  });
  const bindDays = () => s.el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
    days ^= 1 << +b.dataset.day;
    b.classList.toggle('on', !!(days & (1 << +b.dataset.day)));
  });
  bindDays();
  s.el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { days = +b.dataset.p; $('#r-days').innerHTML = dayBtns(); bindDays(); });
  if ((r.kind || 'weekly') !== 'weekly') days = r.days;  // no day picker: never send days
  $('#r-notime').onclick = () => { $('#r-time').value = ''; };
  $('#r-del').onclick = async () => {
    if (!confirm('Bu rutin silinsin mi? Geçmiş kayıtları korunur.')) return;
    await api(`/routines/${r.id}`, { method: 'DELETE' });
    s.close(false);
    toast('Rutin silindi');
    rerender();
  };
}

// ---------- History ----------
async function viewHistory(main) {
  const today = todayStr();
  const ym = state.hmonth || today.slice(0, 7);
  state.hday = state.hday || today;
  const [h, st] = await Promise.all([api('/history?month=' + ym), api('/stats')]);
  const pct = st.last30.total ? Math.round(100 * st.last30.done / st.last30.total) : 0;
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1), nDays = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push('<div class="d blank"></div>');
  for (let d = 1; d <= nDays; d++) {
    const ds = `${ym}-${pad(d)}`, info = h.days[ds];
    let cls = '', sub = '';
    if (info && info.total) {
      const r = info.done / info.total;
      cls = r >= 1 ? 'l4' : r >= .75 ? 'l3' : r >= .5 ? 'l2' : r > 0 ? 'l1' : (ds < today ? 'miss' : '');
      sub = `${info.done}/${info.total}`;
    } else if (info && info.tasks) { cls = 'l1'; sub = `${info.tasks} görev`; }
    if (ds > today) cls += ' future';
    if (ds === today) cls += ' today';
    if (ds === state.hday) cls += ' sel';
    cells.push(`<button class="d ${cls}" data-day="${ds}" ${ds > today ? 'disabled' : ''}>${d}${sub ? `<small>${sub}</small>` : ''}</button>`);
  }
  main.innerHTML = `<div class="wrap">
    <div class="page-h"><div><h1>Geçmiş</h1><p class="sub">Hangi gün ne yaptığının kaydı</p></div></div>
    <div class="stats">
      <div class="stat"><div class="v"><span style="color:#f97316;display:inline-flex;vertical-align:-3px">${ico('flame', 22)}</span> ${st.streak}</div><div class="k">gün seri</div></div>
      <div class="stat"><div class="v">%${pct}</div><div class="k">son 30 gün rutin</div></div>
      <div class="stat"><div class="v">${st.tasks_done_30}</div><div class="k">görev bitti (30 gün)</div></div>
    </div>
    <div class="card">
      <div class="cal-head"><button class="btn ghost icon" id="m-prev" aria-label="Önceki ay">${ico('left', 18)}</button>
        <b>${MONTHS[m - 1]} ${y}</b><button class="btn ghost icon" id="m-next" aria-label="Sonraki ay" ${ym >= today.slice(0, 7) ? 'disabled' : ''}>${ico('right', 18)}</button></div>
      <div class="cal">${DAYS.map(d => `<div class="dow">${d}</div>`).join('')}${cells.join('')}</div>
      <div class="legend">Az <i style="background:var(--surface-2)"></i><i class="l1" style="background:color-mix(in srgb,var(--ok) 22%,var(--surface-2))"></i><i style="background:color-mix(in srgb,var(--ok) 45%,var(--surface-2))"></i><i style="background:color-mix(in srgb,var(--ok) 70%,var(--surface-2))"></i><i style="background:var(--ok)"></i> Tam</div>
    </div>
    <div class="card" id="day-card"><div class="loading">Yükleniyor…</div></div>
    ${st.per_routine.length ? `<div class="card"><h3>${ico('repeat', 18)} Rutin başarısı <span class="meta" style="color:var(--muted);font-weight:500;font-size:13px">(son 30 gün)</span></h3>
      ${st.per_routine.map(r => { const p = Math.round(100 * (r.done || 0) / r.total); return `<div class="rstat"><div class="row"><span>${esc(r.title)}</span><b>${r.done || 0}/${r.total} · %${p}</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`; }).join('')}</div>` : ''}
  </div>`;
  const shift = k => { const d = new Date(y, m - 1 + k, 1); state.hmonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; rerender(); };
  $('#m-prev').onclick = () => shift(-1);
  $('#m-next').onclick = () => shift(1);
  main.querySelectorAll('.cal [data-day]').forEach(b => b.onclick = () => {
    state.hday = b.dataset.day;
    main.querySelectorAll('.cal .sel').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    loadDay();
  });
  await loadDay();
}

async function loadDay() {
  const d = await api('/history/day?date=' + state.hday);
  const r = d.items.filter(i => i.kind === 'routine');
  const card = $('#day-card');
  if (!card) return;
  card.innerHTML = `<h3>${ico('calcheck', 18)} ${fmtLong(d.date)}</h3>
    <p class="desc">${r.length ? `${r.filter(i => i.done).length}/${r.length} rutin tamamlandı` : 'Bu gün için rutin kaydı yok'}</p>
    ${d.items.map(i => `<div class="hist-item"><span class="dot ${i.done ? 'y' : 'n'}">${ico(i.done ? 'check' : 'x', 13, 3)}</span>
      <span class="t">${esc(i.title)} <span class="chip">${i.kind === 'routine' ? 'Rutin' : 'Görev'}</span></span>
      <span class="when">${i.done && i.done_at ? i.done_at.slice(11, 16) + srcLabel(i.source) : 'yapılmadı'}</span></div>`).join('') || '<div class="empty" style="padding:14px">Kayıt yok</div>'}`;
}

// ---------- Settings ----------
function b64ToU8(b64) {
  const p = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function pushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

async function enablePush(vapid) {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Bildirim izni verilmedi'); return; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(vapid) });
    await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
    toast('Bildirimler açıldı ✓');
    rerender();
  } catch (e) { toast('Bildirim açılamadı: ' + e.message); }
}

// Ayarlar: every card folds to its title with the notch at its top right (or a click on the title).
// All folded at first; each card stays the way it was left (remembered on this device).
const foldKey = c => 'fold_' + (c.id || normTitle(c.querySelector('h3')?.textContent || '').replace(/[^a-z0-9çğıöşü]+/g, '-'));
function setFold(c, folded, save = true) {
  c.classList.toggle('folded', folded);
  const b = c.querySelector(':scope > .fold-btn');
  if (b) { b.setAttribute('aria-expanded', String(!folded)); b.title = folded ? 'Aç' : 'Gizle'; }
  if (save) store.set(foldKey(c), folded);
}
function foldCards(main) {
  const prep = c => {
    if (c.querySelector(':scope > .fold-btn') || !c.querySelector(':scope > h3')) return;
    c.classList.add('foldable');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fold-btn'; b.setAttribute('aria-label', 'Gizle / aç');
    b.innerHTML = ico('down', 16, 2.6);
    b.onclick = e => { e.stopPropagation(); setFold(c, !c.classList.contains('folded')); };
    c.prepend(b);
    c.querySelector(':scope > h3').onclick = () => setFold(c, !c.classList.contains('folded'));
    setFold(c, store.get(foldKey(c), true), false);
  };
  const all = () => main.querySelectorAll('.wrap > .card').forEach(prep);
  all();
  // cards that draw themselves later (Kullanıcılar, Giriş) or redraw get their notch back
  state.foldObs?.disconnect();
  state.foldObs = new MutationObserver(() => { if (state.view !== 'settings') state.foldObs.disconnect(); else all(); });
  state.foldObs.observe(main, { childList: true, subtree: true });
}

async function viewSettings(main) {
  const s = await api('/settings');
  const ps = await pushStatus();
  const base = location.origin;
  const tok = s.api_token;
  const iosNotInstalled = isIOS() && !standalone();
  const pushText = {
    on: '✅ Bu cihazda bildirimler açık.',
    off: 'Bu cihazda bildirimler kapalı.',
    denied: '⛔ Bildirim izni reddedilmiş. Telefon/tarayıcı ayarlarından bu siteye izin ver.',
    unsupported: iosNotInstalled ? '📲 iPhone\'da bildirim için önce uygulamayı Ana Ekrana eklemelisin (aşağıda anlatılıyor), sonra oradan açıp bu düğmeye bas.' : 'Bu tarayıcı bildirimleri desteklemiyor.',
  }[ps];
  main.innerHTML = `<div class="wrap">
    <div class="page-h"><div><h1>Ayarlar</h1><p class="sub">Görünüm, bildirimler, iPhone, Hatırlatıcılar ve eklenti</p></div></div>
    ${s.is_owner ? `<div class="owner-card"><div class="owner-ic">👑</div><div class="grow"><b>Yönetici (Owner) hesabı</b>
        <span>${esc(s.account.email || '')} · Kullanıcılar, giriş ayarları ve yedekler yalnızca bu hesapta görünür.</span></div>
        <button class="btn sm" data-jump="users-card">Kullanıcılar</button><button class="btn ghost sm" data-jump="auth-card">Giriş ayarları</button></div>` : ''}

    ${appearanceCard()}

    <div class="card"><h3>${ico('bell', 18)} Bildirimler</h3><p class="desc">${pushText} Kayıtlı cihaz sayısı: ${s.push_count}</p>
      <div class="row" style="margin-bottom:14px">
        ${ps === 'off' ? '<button class="btn" id="push-on">Bu cihazda bildirimleri aç</button>' : ''}
        ${s.push_count ? '<button class="btn ghost" id="push-test">Test bildirimi gönder</button>' : ''}
      </div>
      <div class="row" style="justify-content:space-between;margin-bottom:12px"><span>Sabah özeti saati<br><span style="color:var(--muted);font-size:13px">"Bugün N görevin var" bildirimi</span></span>
        <input type="time" id="s-morning" value="${s.morning_time}" style="width:120px"></div>
      <div class="row" style="justify-content:space-between"><span>Saatli rutinlerde hatırlat<br><span style="color:var(--muted);font-size:13px">Saati gelen rutin için bildirim</span></span>
        <label class="switch"><input type="checkbox" id="s-alerts" ${s.item_alerts ? 'checked' : ''}><span></span></label></div>
      <div id="nudge"></div>
    </div>

    <div class="card kur-card" id="kur-card"><h3>${ico('download', 18)} Uygulamayı kur</h3>${kurBar()}${installHtml(true)}</div>

    <div class="card"><h3>${ico('link', 18)} iPhone Hatırlatıcılar ile eşitleme</h3>
      <p class="desc">iPhone'daki <b>Kestirmeler</b> uygulamasıyla çalışır: sabah görevlerin Hatırlatıcılar'daki <b>Günlük</b> listesine düşer, orada tiklediklerin buraya "yapıldı" olarak döner, burada tiklediklerin orada da kapanır.</p>
      <div class="field"><label>Kişisel anahtarın (token) — kimseyle paylaşma</label>
        <div class="kbd" id="tok">${'•'.repeat(24)}</div>
        <div class="row" style="margin-top:8px"><button class="btn ghost sm" id="tok-show">Göster</button><button class="btn ghost sm" id="tok-copy">Kopyala</button><button class="btn danger sm" id="tok-rot">Yenile</button></div></div>
      <details><summary style="cursor:pointer;font-weight:600;color:var(--accent)">Kurulum adımlarını göster</summary>
        <p class="note">Önce <b>Hatırlatıcılar</b> uygulamasında <b>Günlük</b> adında yeni bir liste oluştur. Adımlarda <b>TOKEN</b> yazan yere yukarıdaki anahtarı yapıştır.</p>
        <h4>1) Kestirme: "Günlük → Hatırlatıcı"</h4>
        <ol class="steps">
          <li>Kestirmeler → <b>+</b> → adı: <i>Günlük → Hatırlatıcı</i></li>
          <li><b>URL</b> eylemi: <div class="kbd">${esc(base)}/api/sync/today?token=TOKEN</div></li>
          <li><b>URL'nin İçeriğini Al</b> (Get Contents of URL) — Yöntem: GET</li>
          <li><b>Sözlük Değerini Al</b>: Anahtar <code>items</code></li>
          <li><b>Her Biri ile Yinele</b> (Repeat with Each) içine:
            <ul><li><b>Sözlük Değerini Al</b>: <code>title</code> (Yineleme Öğesi'nden)</li>
              <li><b>Sözlük Değerini Al</b>: <code>notes</code> (Yineleme Öğesi'nden)</li>
              <li><b>Yeni Hatırlatıcı Ekle</b>: Başlık = <i>title</i>, Liste = <b>Günlük</b>, Notlar = <i>notes</i></li></ul></li>
          <li>Otomasyon: Kestirmeler → <b>Otomasyon</b> → <b>+</b> → <b>Günün Saati</b> → 07:00, Her Gün → <b>Hemen Çalıştır</b> → bu kestirme.</li>
        </ol>
        <h4>2) Kestirme: "Hatırlatıcı ↔ Günlük"</h4>
        <ol class="steps">
          <li><b>Hatırlatıcıları Bul</b>: Liste = Günlük, <i>Tamamlandı</i> = açık, <i>Tamamlanma Tarihi</i> = son 2 gün içinde, <i>Notlar</i> içerir <code>#g</code></li>
          <li><b>Hatırlatıcıların Ayrıntılarını Al</b>: <i>Notlar</i></li>
          <li><b>Metni Birleştir</b> (Combine Text): Yeni Satır ile</li>
          <li><b>URL'nin İçeriğini Al</b>: <div class="kbd">${esc(base)}/api/sync/done?token=TOKEN</div> Yöntem: <b>POST</b>, İstek Gövdesi: <b>JSON</b>, alan <code>text</code> = <i>Birleştirilmiş Metin</i></li>
          <li><b>URL'nin İçeriğini Al</b>: <div class="kbd">${esc(base)}/api/sync/state?token=TOKEN</div></li>
          <li><b>Sözlük Değerini Al</b>: <code>tags</code> → <b>Her Biri ile Yinele</b> içine:
            <ul><li><b>Hatırlatıcıları Bul</b>: Liste = Günlük, Tamamlandı = kapalı, Notlar içerir <i>Yineleme Öğesi</i></li>
              <li><b>Hatırlatıcıyı Düzenle</b> → <i>Tamamlandı</i> = açık (bu eylem yoksa: <b>Hatırlatıcıları Sil</b>)</li></ul></li>
          <li>Otomasyon: 10:00, 13:00, 16:00, 19:00, 22:00 için ayrı ayrı <b>Günün Saati</b> → <b>Hemen Çalıştır</b>. İstediğinde elle de çalıştırabilirsin.</li>
        </ol>
        <p class="note">Apple, Hatırlatıcılar'a dışarıdan anlık erişim vermediği için eşitleme bu saatlerde olur. Notlardaki <code>#g…#</code> işaretine dokunma; eşleştirme onunla yapılıyor. Bir şey yanlış giderse aynı günü tekrar göndermek için: <code>/api/sync/today?token=TOKEN&resend=1</code></p>
      </details>
    </div>

    <div class="card"><h3>${ico('database', 18)} Verilerin ve yedek</h3>
      <p class="desc">Sunucu her gece verilerini otomatik yedekler ve son 30 günü saklar.
        ${!s.is_owner ? '' : s.last_backup ? `Son yedek: <b>${fmtLong(s.last_backup)}</b> · ${s.backup_count} yedek duruyor.` : 'İlk yedek bu gece 03:00\'te alınacak.'}</p>
      <div class="row"><a class="btn ghost" href="/api/export" download>${ico('download', 16)} Verilerimi indir</a></div>
      <p class="note">Bilgisayarda kısayollar: <b>N</b> yeni görev, <b>/</b> arama, <b>Esc</b> pencereyi kapatır. Göreve sağ tık (telefonda basılı tut) menü açar.</p>
    </div>

    <div class="card"><h3>${ico('sun', 18)} Hava durumu</h3>
      <p class="desc">Sol altta tarihin altında (telefonda Bugün ekranında) görünür. Şimdiki şehir: <b id="wx-city">${esc(s.weather_city.name)}${s.weather_city.region ? ' · ' + esc(s.weather_city.region) : ''}</b></p>
      <div class="row"><input id="wx-in" class="grow" placeholder="Şehir veya ilçe (örn. Ankara, Kadıköy)" maxlength="60" autocomplete="off"><button class="btn sm" id="wx-save">Değiştir</button></div>
    </div>

    ${s.is_owner ? '<div class="card" id="users-card"></div><div class="card" id="auth-card"></div>' : ''}

    <div class="card"><h3>${ico('user', 18)} Hesap</h3>
      <div class="field"><label>Ad Soyad (sağ üstte görünür)</label>
        <div class="row"><input id="pf-name" class="grow" value="${esc(s.profile_name)}" placeholder="Adın ve soyadın" maxlength="60" autocomplete="name"><button class="btn sm" id="pf-save">Kaydet</button></div></div>
      ${accountInfo(s.account)}
      <div class="set-h">${s.account.has_password ? 'Şifreyi değiştir' : 'Şifre ekle (e-posta + şifreyle de girebilmek için)'}</div>
      ${s.account.has_password ? '<div class="field"><input type="password" id="pw-old" placeholder="Mevcut şifre" autocomplete="current-password"></div>' : ''}
      <div class="field"><input type="password" id="pw-new" placeholder="Yeni şifre (en az 6 karakter)" autocomplete="new-password"></div>
      <div class="row"><button class="btn" id="pw-save">${s.account.has_password ? 'Şifreyi değiştir' : 'Şifre ekle'}</button><button class="btn ghost" id="logout">Çıkış yap</button></div>
      <div id="sessions"></div>
    </div>
  </div>`;

  if (s.ui) applyUi(s.ui);
  foldCards(main);
  bindKur(main);
  bindAppearance($('#appearance'));
  nudgeSection($('#nudge'), s.nudge);
  if (s.is_owner) { authSection($('#auth-card'), s.auth); usersSection($('#users-card'), s); }
  main.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => {
    const c = document.getElementById(b.dataset.jump);
    if (!c) return;
    setFold(c, false);
    c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#wx-save').onclick = async () => {
    const name = $('#wx-in').value.trim();
    if (!name) { toast('Önce şehir yaz'); return; }
    let r;
    try { r = await api('/weather/city', { method: 'POST', body: { name } }); } catch { return; }  // api() already showed the message
    $('#wx-city').textContent = r.city.name + (r.city.region ? ' · ' + r.city.region : '');
    $('#wx-in').value = '';
    state.wx = r.weather;
    paintWx();
    toast(`Hava durumu: ${r.city.name}`);
  };
  $('#pf-save').onclick = async () => {
    await api('/settings', { method: 'PATCH', body: { profile_name: $('#pf-name').value } });
    const m = await api('/me', { quiet: true });
    state.me = m.user;
    paintMe();
    toast('Ad Soyad kaydedildi');
  };
  $('#push-on') && ($('#push-on').onclick = () => enablePush(s.vapid_public));
  $('#push-test') && ($('#push-test').onclick = async () => { const r = await api('/push/test', { method: 'POST' }); toast(`${r.sent} cihaza gönderildi`); });
  $('#s-morning').onchange = async e => { await api('/settings', { method: 'PATCH', body: { morning_time: e.target.value || '07:00' } }); toast('Kaydedildi'); };
  $('#s-alerts').onchange = async e => { await api('/settings', { method: 'PATCH', body: { item_alerts: e.target.checked } }); toast('Kaydedildi'); };
  $('#tok-show').onclick = () => { $('#tok').textContent = tok; };
  $('#tok-copy').onclick = async () => { try { await navigator.clipboard.writeText(tok); toast('Kopyalandı'); } catch { $('#tok').textContent = tok; toast('Elle seçip kopyala'); } };
  $('#tok-rot').onclick = async () => {
    if (!confirm('Token yenilensin mi? Kestirmeler ve eklentide yenisini girmen gerekir.')) return;
    await api('/settings/token', { method: 'POST' });
    toast('Yeni token oluşturuldu');
    rerender();
  };
  $('#pw-save').onclick = async () => {
    const body = { new_password: $('#pw-new').value };
    if ($('#pw-old')) body.old_password = $('#pw-old').value;
    if (body.new_password.length < 6) { toast('Yeni şifre en az 6 karakter olmalı'); return; }
    try { await api('/settings', { method: 'PATCH', body }); } catch { return; }
    toast('Şifre kaydedildi ✓');
    rerender();
  };
  $('#logout').onclick = logout;
  sessionsSection($('#sessions'));
}

// ---------- Google / Microsoft sign-in settings ----------
const OAUTH_STEPS = {
  google: `<li><a href="https://console.cloud.google.com/" target="_blank" rel="noopener">console.cloud.google.com</a> adresine Gmail hesabınla gir, üstten <b>yeni proje</b> oluştur (adı: Günlük).</li>
    <li>Menüden <b>APIs &amp; Services → OAuth consent screen</b> (yeni arayüzde <b>Google Auth Platform</b>) → <b>Get started</b>: uygulama adı <i>Günlük</i>, destek e-postası senin adresin, kitle (Audience) <b>External</b>.</li>
    <li><b>Audience → Test users</b> kısmına giriş yapacağın Gmail adresini ekle.</li>
    <li><b>Clients</b> (ya da <b>Credentials</b>) → <b>Create client</b> → tür: <b>Web application</b>.</li>
    <li><b>Authorized redirect URIs</b> kısmına aşağıdaki yönlendirme adresini yapıştır → <b>Create</b>.</li>
    <li>Çıkan <b>Client ID</b> ve <b>Client Secret</b>'ı aşağıya yapıştırıp <b>Kaydet</b>'e bas.</li>`,
  microsoft: `<li><a href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener">entra.microsoft.com → App registrations</a> adresine Hotmail/Outlook hesabınla gir (ilk girişte ücretsiz hesap oluşturmanı isteyebilir).</li>
    <li><b>New registration</b>: ad <i>Günlük</i>; hesap türü: <b>Accounts in any organizational directory and personal Microsoft accounts</b>.</li>
    <li><b>Redirect URI</b>: platform <b>Web</b>, adres olarak aşağıdaki yönlendirme adresini yapıştır → <b>Register</b>.</li>
    <li>Açılan sayfadaki <b>Application (client) ID</b>'yi aşağıya yapıştır.</li>
    <li><b>Certificates &amp; secrets → New client secret</b> → oluşan <b>Value</b> değerini (Secret ID'yi değil) aşağıya yapıştırıp <b>Kaydet</b>'e bas.</li>`,
};

function authSection(box, a) {
  const save = async (patch, msg) => {
    try {
      const r = await api('/settings', { method: 'PATCH', body: { auth: patch } });
      a = r.auth;
      toast(msg || 'Kaydedildi');
    } catch { /* toast shown by api() */ }
    draw();
  };
  const provider = (p, name, logo) => {
    const c = a[p];
    return `<div class="set-h prov-h">${logo} ${name} ${c.ready ? '<span class="chip ok">Hazır</span>' : '<span class="chip">Ayarlanmadı</span>'}</div>
      <details ${c.ready ? '' : 'open'}><summary class="mini-sum">Kurulum ve anahtarlar</summary>
        <ol class="steps">${OAUTH_STEPS[p]}</ol>
        <div class="field"><label>Yönlendirme adresi (kayıtta bunu kullan)</label><div class="kbd">${esc(c.redirect_uri)}</div></div>
        <div class="field"><label>Client ID</label><input data-cid="${p}" value="${esc(c.client_id)}" autocomplete="off" spellcheck="false"></div>
        <div class="field"><label>Client Secret ${c.secret_set ? '(kayıtlı — değiştirmek istersen yenisini yaz)' : ''}</label>
          <input type="password" data-sec="${p}" placeholder="${c.secret_set ? '••••••••••' : ''}" autocomplete="new-password"></div>
        <div class="row"><button class="btn sm" data-save="${p}">Kaydet</button>
          ${c.ready ? `<a class="btn ghost sm" href="/auth/${p}/start">Şimdi dene</a><button class="btn danger sm" data-clear="${p}">Kaldır</button>` : ''}</div>
      </details>`;
  };
  const draw = () => {
    box.innerHTML = `<h3>${ico('user', 18)} Google / Microsoft ile giriş</h3>
      <p class="desc">Şifre yazmadan giriş. Yeni kayıtlar kapalıyken sadece aşağıdaki e-postalar yeni hesap açabilir. Her e-posta yalnızca kendi görevlerini görür.</p>
      <div class="set-h">Kayıtlar kapalıyken izinli e-postalar</div>
      <div class="tchips">${a.allowed.map(e => `<span class="tchip">${esc(e)}<button data-rm-mail="${esc(e)}" aria-label="${esc(e)} kaldır">${ico('x', 13)}</button></span>`).join('') || '<span style="color:var(--muted);font-size:13px">Henüz yok</span>'}</div>
      <div class="row" style="margin-top:10px"><input id="mail-in" type="email" placeholder="ornek@hotmail.com" class="grow" autocomplete="off"><button class="btn sm" id="mail-add">${ico('plus', 15)} Ekle</button></div>
      ${provider('google', 'Google (Gmail)', GOOGLE_LOGO)}
      ${provider('microsoft', 'Microsoft (Hotmail / Outlook)', MS_LOGO)}
      <p class="note">iPhone'da Ana Ekran uygulamasının içinden Google/Microsoft girişi bazen tamamlanmaz; o durumda adresi önce Safari'de açıp giriş yap, sonra Ana Ekrana ekle. Girişli cihazlar girişli kalır.</p>`;
    box.querySelectorAll('[data-rm-mail]').forEach(b => b.onclick = () => save({ allowed: a.allowed.filter(e => e !== b.dataset.rmMail) }, 'E-posta kaldırıldı'));
    $('#mail-add', box).onclick = () => {
      const v = $('#mail-in', box).value.trim().toLowerCase();
      if (!v) { toast('Önce e-posta yaz'); return; }
      save({ allowed: [...a.allowed, v] }, 'E-posta eklendi');
    };
    box.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
      const p = b.dataset.save;
      save({ [p]: { client_id: $(`[data-cid="${p}"]`, box).value, client_secret: $(`[data-sec="${p}"]`, box).value } });
    });
    box.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => {
      if (confirm('Bu giriş yöntemi kaldırılsın mı?')) save({ [b.dataset.clear]: { clear: true } }, 'Kaldırıldı');
    });
  };
  draw();
}

// ---------- day-long reminders ("Gün içi hatırlatmalar") ----------
const NUDGE_PRESETS = [
  ['Sabah · öğle · akşam', ['09:00', '13:00', '18:00']],
  ['Mesai saatleri', ['10:00', '12:00', '15:00', '17:00']],
  ['Her 2 saatte bir', ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']],
];

function nudgeSection(box, n) {
  const save = async patch => {
    try {
      const r = await api('/settings', { method: 'PATCH', body: { nudge: patch } });
      Object.assign(n, r.nudge);
      toast('Kaydedildi');
    } catch { /* toast shown by api() */ }
    draw();
  };
  const draw = () => {
    const modes = [['off', 'Kapalı'], ['times', 'Belirli saatler'], ['count', 'Gün boyu X kez']];
    let body = '';
    if (n.mode === 'times') {
      body = `<div class="tchips">${n.times.map(t => `<span class="tchip">${t}<button data-rm="${t}" aria-label="${t} kaldır">${ico('x', 13)}</button></span>`).join('') || '<span class="meta" style="color:var(--muted);font-size:13px">Henüz saat yok</span>'}</div>
        <div class="row" style="margin-top:10px"><input type="time" id="ng-t" style="width:140px"><button class="btn sm" id="ng-add">${ico('plus', 15)} Saat ekle</button></div>
        <div class="presets">${NUDGE_PRESETS.map(([l], i) => `<button data-pre="${i}">${l}</button>`).join('')}</div>`;
    } else if (n.mode === 'count') {
      const counts = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24];
      body = `<div class="row nudge-count">Günde
        <select id="ng-count" style="width:auto">${counts.map(c => `<option ${c === n.count ? 'selected' : ''}>${c}</option>`).join('')}</select> kez,
        <input type="time" id="ng-start" value="${n.start}" style="width:120px"> ile
        <input type="time" id="ng-end" value="${n.end}" style="width:120px"> arası</div>`;
    }
    box.innerHTML = `<div class="set-h">Gün içi hatırlatmalar</div>
      <p class="desc" style="margin:0 0 10px">Kalan görevlerini gün içinde bildirimle hatırlatır. O an görev kalmadıysa bildirim gelmez.</p>
      <div class="seg mode">${modes.map(([k, l]) => `<button class="${n.mode === k ? 'on' : ''}" data-nm="${k}">${l}</button>`).join('')}</div>
      ${body}
      <p class="note">${n.mode === 'off' || !n.schedule.length ? 'Gün içi hatırlatma kapalı.' : `${ico('bell', 13)} Bildirim saatleri: <b>${n.schedule.join(', ')}</b>`}</p>`;
    box.querySelectorAll('[data-nm]').forEach(b => b.onclick = () => save({ mode: b.dataset.nm }));
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => save({ times: n.times.filter(t => t !== b.dataset.rm) }));
    box.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => save({ times: NUDGE_PRESETS[+b.dataset.pre][1] }));
    const add = $('#ng-add', box);
    if (add) add.onclick = () => { const v = $('#ng-t', box).value; if (v) save({ times: [...n.times, v] }); else toast('Önce bir saat seç'); };
    const cnt = $('#ng-count', box);
    if (cnt) {
      cnt.onchange = () => save({ count: +cnt.value });
      $('#ng-start', box).onchange = e => save({ start: e.target.value });
      $('#ng-end', box).onchange = e => save({ end: e.target.value });
    }
  };
  draw();
}

// ---------- appearance (theme / mode / background) ----------
function applyUi(ui) {
  ui = { theme: 'mavi', mode: 'auto', bg: 'none', ...Object.fromEntries(Object.entries(ui || {}).filter(([, v]) => v)) };
  const root = document.documentElement;
  if (ui.theme === 'mavi') delete root.dataset.theme; else root.dataset.theme = ui.theme;
  if (ui.mode === 'auto') delete root.dataset.mode; else root.dataset.mode = ui.mode;
  const scene = (window.ART && ART.SCENES.find(s => s.k === ui.bg)) || { k: 'none', html: '' };
  const layer = $('#bg-layer');
  if (layer && layer.dataset.bg !== scene.k) { layer.innerHTML = scene.html; layer.dataset.bg = scene.k; }
  state.ui = ui;
  store.set('ui', ui);
}

async function setUi(patch) {
  applyUi({ ...state.ui, ...patch });
  try { await api('/settings', { method: 'PATCH', body: { ui: patch } }); } catch { /* applied locally anyway */ }
}

function appearanceCard() {
  const ui = state.ui || {};
  const modes = [['auto', 'Otomatik'], ['light', 'Açık'], ['dark', 'Koyu']];
  return `<div class="card" id="appearance"><h3>${ico('sun', 18)} Görünüm</h3>
    <p class="desc">Seçimin tüm cihazlarında (telefon, bilgisayar) aynı görünür.</p>
    <div class="set-h">Yakınlaştırma (bu cihaz)</div>
    <div class="row">${zoomer()}<span style="color:var(--muted);font-size:13px">Bilgisayarda Ctrl + / Ctrl − / Ctrl 0</span></div>
    <div class="set-h">Mod</div>
    <div class="seg mode">${modes.map(([k, l]) => `<button class="${(ui.mode || 'auto') === k ? 'on' : ''}" data-mode="${k}">${l}</button>`).join('')}</div>
    <div class="set-h">Kutlama</div>
    <div class="row"><button class="btn ghost sm" id="cel-preview">🎉 Kutlamayı önizle</button>
      <span style="color:var(--muted);font-size:13px">Bugünün bütün işleri bitince kendiliğinden çıkar</span></div>
    <div class="set-h">Renk teması</div>
    <div class="swatches">${ART.THEMES.map(t => `<button class="swatch ${(ui.theme || 'mavi') === t.k ? 'on' : ''}" data-theme="${t.k}">
      <i style="background:linear-gradient(135deg,${t.c[0]},${t.c[1]})"></i>${t.name}</button>`).join('')}</div>
    <div class="set-h">Arka plan</div>
    <div class="bgs">${ART.SCENES.map(s => `<button class="bgopt ${(ui.bg || 'none') === s.k ? 'on' : ''}" data-bg="${s.k}">
      <span class="pv">${s.html}</span>${s.name}</button>`).join('')}</div>
  </div>`;
}

function bindAppearance(root) {
  const prev = $('#cel-preview', root);
  if (prev) prev.onclick = () => loadCelebration().then(() => window.runCelebration && window.runCelebration()).catch(() => toast('Kutlama yüklenemedi'));
  const mark = (attr, v) => root.querySelectorAll(`[data-${attr}]`).forEach(b => b.classList.toggle('on', b.dataset[attr] === v));
  root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mark('mode', b.dataset.mode); setUi({ mode: b.dataset.mode }); });
  root.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { mark('theme', b.dataset.theme); setUi({ theme: b.dataset.theme }); });
  root.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { mark('bg', b.dataset.bg); setUi({ bg: b.dataset.bg }); });
}

applyUi(store.get('ui', {}));  // cached choice first, so there is no flash before /api/me answers

// ---------- zoom (per device, remembered in localStorage) ----------
const ZOOMS = [70, 80, 90, 100, 110, 125, 140, 160, 180];
const zoomer = () => `<div class="zoomer" role="group" aria-label="Yakınlaştırma">
  <button data-z="-1" aria-label="Uzaklaştır" title="Uzaklaştır (Ctrl −)">−</button>
  <button data-z="0" class="zoom-val" title="Sıfırla (Ctrl 0)">${state.zoom || 100}%</button>
  <button data-z="1" aria-label="Yakınlaştır" title="Yakınlaştır (Ctrl +)">+</button></div>`;

function applyZoom(z) {
  z = ZOOMS.includes(z) ? z : 100;
  state.zoom = z;
  store.set('zoom', z);
  document.documentElement.style.setProperty('--zoom', z / 100);
  document.querySelectorAll('.zoom-val').forEach(e => { e.textContent = z + '%'; });
}

function stepZoom(d) {
  if (!d) { applyZoom(100); return; }
  const i = ZOOMS.indexOf(state.zoom || 100);
  applyZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + d))]);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-z]');
  if (b) stepZoom(+b.dataset.z);
  if (e.target.closest('[data-retry]')) go(state.view);
  const sp = e.target.closest('[data-show-picker]');
  if (sp) try { sp.showPicker(); } catch { /* older browsers open it themselves */ }
  if (e.target.closest('[data-side-toggle]')) toggleSide();
  const r = e.target.closest('[data-refresh]');
  if (r) { r.classList.add('spinning'); location.reload(); }  // full reload: fresh data + newest app version (view/zoom are remembered)
});
function toggleSide(off = !document.documentElement.classList.contains('side-off')) {
  document.documentElement.classList.toggle('side-off', off);
  store.set('sideOff', off);
}
toggleSide(store.get('sideOff', false));
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  if (e.key.toLowerCase() === 'b' && !e.shiftKey) { e.preventDefault(); toggleSide(); return; }
  const d = { '+': 1, '=': 1, '-': -1, '0': 0 }[e.key];
  if (d === undefined) return;
  e.preventDefault();  // use the app zoom instead of the browser's, so the choice is remembered here
  stepZoom(d);
});

applyZoom(store.get('zoom', 100));

// ---------- boot ----------
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && $('#main') && !$('#sheet-root').innerHTML && Date.now() - state.lastLoad > 60000) rerender();
});

// The app may stay open past midnight: move to the new day by itself (not while a sheet/menu/selection is in use).
state.renderDay = todayStr();
setInterval(() => {
  if (todayStr() === state.renderDay || !$('#main')) return;
  if ($('#sheet-root').innerHTML || menuEl || state.sel.size || isTyping({ target: document.activeElement })) return;
  state.renderDay = todayStr();
  rerender();
}, 60 * 1000);

// ---------- live sync ----------
// Changes made on another device (or by Shortcuts / the extension) show up here within seconds, and a new app
// version loads by itself. Both wait while the user is busy (typing, a sheet/menu, a selection or a drag).
// revisions look like "<server start>-<n>"; a poll answer that left before our own change must not count as news
function revNewer(a, b) {
  const [ab, an] = a.split('-').map(Number), [bb, bn] = b.split('-').map(Number);
  return ab !== bb ? ab > bb : an > bn;
}
function noteRev(r) {
  const rev = r.headers.get('X-Rev');
  if (!rev) return;
  const prev = r.headers.get('X-Rev-Prev');
  if (state.rev == null) state.rev = rev;
  else if (prev && prev === state.rev) state.rev = rev;  // our own change: nothing to refresh
}
function liveBusy() {
  const a = document.activeElement;
  return $('#sheet-root').innerHTML || menuEl || state.sel.size || document.body.classList.contains('dragging')
    || (a && a.matches && a.matches('input, textarea, select, [contenteditable]') && (a.value || a.isContentEditable));
}
async function checkLive() {
  if (document.visibilityState !== 'visible' || !$('#main') || state.liveBusyCall) return;
  state.liveBusyCall = true;
  try {
    const r = await api('/rev', { quiet: true, noAuthRedirect: true });
    if (!state.build) state.build = r.build;
    else if (r.build !== state.build) state.newBuild = true;
    if (state.rev != null && revNewer(r.rev, state.rev)) state.pendingRev = r.rev;
  } catch { /* offline: try again on the next tick */ } finally { state.liveBusyCall = false; }
  if (liveBusy()) return;
  if (state.newBuild) {
    try { sessionStorage.setItem('g_updated', '1'); } catch { /* ignore */ }
    location.reload();
    return;
  }
  if (state.pendingRev && revNewer(state.pendingRev, state.rev)) {
    state.rev = state.pendingRev;
    const focused = document.activeElement && document.activeElement.id;
    if (state.view === 'settings') loadLists(); else await rerender();
    refreshUndo();  // a change from another device may add or drop steps
    if (focused && $('#' + focused)) $('#' + focused).focus();
  }
}
setInterval(checkLive, 4000);
document.addEventListener('visibilitychange', checkLive);
window.addEventListener('focus', checkLive);
try { if (sessionStorage.getItem('g_updated')) { sessionStorage.removeItem('g_updated'); setTimeout(() => toast('Program güncellendi ✓'), 800); } } catch { /* ignore */ }

// Last line of defence: an unexpected promise error must not leave the screen half-updated without a word.
window.addEventListener('unhandledrejection', e => {
  if (e.reason instanceof AuthError) { e.preventDefault(); return; }
  console.warn('İşlem tamamlanamadı:', e.reason);
});

(async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  try {
    const me = await api('/me', { noAuthRedirect: true, quiet: true });
    if (me.ui) applyUi(me.ui);
    state.me = me.user;
    renderShell();
  } catch {
    renderLogin();
  }
})();

// ---------- users (owner only) ----------
function usersSection(box, s) {
  let users = s.users, open = s.auth.signup_open;
  const draw = () => {
    box.innerHTML = `<h3>${ico('user', 18)} Kullanıcılar</h3>
      <p class="desc">Google veya Microsoft ile ilk kez giren her e-posta kendi boş sayfasıyla başlar. Kimse başkasının görevlerini göremez.</p>
      <label class="switch-row"><input type="checkbox" id="signup-open" ${open ? 'checked' : ''}> Yeni kayıtlar açık</label>
      <div class="ulist">${users.map(u => `<div class="urow${u.disabled ? ' off' : ''}">
        <div class="grow"><b>${esc(u.name || u.email)}</b>${u.is_owner ? ' <span class="chip ok">Sahip</span>' : ''}${u.disabled ? ' <span class="chip">Kapalı</span>' : ''}
          <div class="umeta">${[u.email, u.username && '@' + u.username, u.phone].filter(Boolean).map(esc).join(' · ')} · ${u.tasks} görev${u.last_login ? ' · son giriş ' + esc(u.last_login.slice(0, 16)) : ''}</div></div>
        ${u.is_owner ? '' : `<button class="btn ${u.disabled ? 'ghost' : 'danger'} sm" data-u="${u.id}" data-dis="${u.disabled ? 0 : 1}">${u.disabled ? 'Aç' : 'Kapat'}</button>`}
      </div>`).join('')}</div>`;
    $('#signup-open', box).onchange = async e => {
      try { open = (await api('/settings', { method: 'PATCH', body: { auth: { signup_open: e.target.checked } } })).auth.signup_open; toast(open ? 'Yeni kayıtlar açıldı' : 'Yeni kayıtlar kapandı'); } catch { /* api() toasts */ }
      draw();
    };
    box.querySelectorAll('[data-u]').forEach(b => b.onclick = async () => {
      const dis = b.dataset.dis === '1';
      if (dis && !confirm('Bu hesap kapatılsın mı? Görevleri silinmez, sadece giriş yapamaz.')) return;
      try { users = (await api(`/users/${b.dataset.u}`, { method: 'PATCH', body: { disabled: dis } })).users; } catch { return; }
      toast(dis ? 'Hesap kapatıldı' : 'Hesap açıldı');
      draw();
    });
  };
  draw();
}

function accountInfo(a) {
  const rows = [['Kullanıcı adı', a.username], ['E-posta', a.email], ['Telefon', a.phone]].filter(r => r[1]);
  const how = a.provider === 'google' ? 'Google ile' : a.provider === 'microsoft' ? 'Microsoft ile' : 'kullanıcı adı / e-posta / telefon + şifre ile';
  return `<p class="desc">Bu hesaba ${how} girilir. Hangi cihazdan girersen gir aynı görevleri görürsün.</p>
    ${rows.length ? `<div class="acct">${rows.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}`;
}

const LOGIN_ERRORS = {
  not_ready: 'Bu giriş yöntemi henüz ayarlanmadı', unknown: 'Bilinmeyen giriş yöntemi', cancelled: 'Giriş iptal edildi',
  state: 'Oturum doğrulanamadı, lütfen tekrar dene', provider: 'Giriş sağlayıcısına bağlanılamadı, tekrar dene',
  invalid: 'Giriş bilgisi doğrulanamadı', unverified: 'Bu hesabın e-postası doğrulanmamış', no_email: 'Hesaptan e-posta alınamadı',
  ms_personal: 'Sadece kişisel Microsoft hesapları (Hotmail / Outlook / Live) ile girilebilir',
  closed: 'Yeni kayıtlar şu an kapalı', disabled: 'Bu hesap kapatılmış',
};

async function logout() {
  try { await api('/logout', { method: 'POST', quiet: true }); } catch { /* signed out anyway */ }
  location.replace('/');  // a fresh page: nothing of the account stays in memory
}

// CSP-safe replacements for inline handlers
document.addEventListener('error', e => {
  if (e.target instanceof HTMLImageElement && e.target.hasAttribute('data-img-fallback')) e.target.remove();
}, true);
document.addEventListener('change', e => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || !t.hasAttribute('data-pick')) return;
  const v = t.value;
  t.previousElementSibling.textContent = v ? (t.type === 'date' ? fmtDue(v) : v) : '';
  t.parentElement.classList.toggle('set', !!v);
});
document.addEventListener('toggle', e => {
  if (e.target instanceof HTMLDetailsElement && e.target.classList.contains('done-sec')) store.set('doneOpen_' + state.view, e.target.open);
  if (e.target instanceof HTMLDetailsElement && e.target.classList.contains('open-sec')) store.set('openOpen_' + state.view, e.target.open);
}, true);

// ---------- signed-in devices (Settings → Hesap) ----------
async function sessionsSection(box) {
  if (!box) return;
  let list;
  try { list = (await api('/sessions', { quiet: true })).sessions; } catch { box.innerHTML = ''; return; }
  const others = list.filter(s => !s.current).length;
  box.innerHTML = `<div class="set-h">Açık oturumlar (${list.length})</div>
    <div class="ulist">${list.map(s => `<div class="urow"><div class="grow"><b>${esc(s.device)}</b>${s.current ? ' <span class="chip ok">Bu cihaz</span>' : ''}
      <div class="umeta">${esc(s.how)} · giriş ${esc(s.created_at.slice(0, 16))}${s.last_seen ? ' · son ' + esc(s.last_seen.slice(0, 16)) : ''}</div></div>
      ${s.current ? '' : `<button class="btn danger sm" data-sess="${esc(s.id)}">Çıkar</button>`}</div>`).join('')}</div>
    ${others ? '<div class="row" style="margin-top:8px"><button class="btn ghost sm" id="sess-others">Diğer tüm cihazlardan çıkış yap</button></div>' : ''}`;
  box.querySelectorAll('[data-sess]').forEach(b => b.onclick = async () => {
    try { await api('/sessions/' + b.dataset.sess, { method: 'DELETE' }); } catch { return; }
    toast('Cihazın oturumu kapatıldı');
    sessionsSection(box);
  });
  const all = $('#sess-others', box);
  if (all) all.onclick = async () => {
    if (!confirm('Bu cihaz dışındaki tüm cihazlardan çıkış yapılsın mı?')) return;
    try { await api('/sessions/revoke-others', { method: 'POST' }); } catch { return; }
    toast('Diğer cihazlardan çıkış yapıldı');
    sessionsSection(box);
  };
}


// ---------- phone: the web's left menu as a full-screen drawer ----------
function openDrawer() {
  const side = $('.side');
  if (!side) return;
  side.classList.add('open');
  side.scrollTop = 0;
  document.body.classList.add('drawer-open');
}
function closeDrawer() {
  const side = $('.side');
  if (!side || !side.classList.contains('open')) return;
  side.classList.remove('open');
  document.body.classList.remove('drawer-open');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
window.matchMedia('(min-width: 761px)').addEventListener('change', e => { if (e.matches) closeDrawer(); });

// Phone: two-finger pinch must not zoom the page (it broke the layout); the − / + buttons zoom the app instead.
// iOS Safari ignores user-scalable=no, so its gesture events are stopped here as well.
['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
