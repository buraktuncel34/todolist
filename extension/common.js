/* Shared by popup and background */
const DEFAULT_BASE = 'http://localhost:8430';
// Filled in by the server when the zip is downloaded from Settings, so the extension works without pasting a token.
const PRESET_TOKEN = '';

async function cfg() {
  const c = await chrome.storage.local.get(['base', 'token']);
  return { base: c.base || DEFAULT_BASE, token: c.token || PRESET_TOKEN };
}

async function call(path, opts = {}) {
  const { base, token } = await cfg();
  if (!token) throw new Error('no-token');
  const r = await fetch(base + '/api' + path, {
    method: opts.method || 'GET',
    headers: { 'X-Token': token, 'X-Source': 'extension', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (r.status === 401) throw new Error('bad-token');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function refreshBadge(items) {
  try {
    if (!items) items = (await call('/today')).items;
    const n = items.filter(i => !i.done).length;
    await chrome.action.setBadgeBackgroundColor({ color: '#3563f0' });
    await chrome.action.setBadgeText({ text: n ? String(n) : '' });
  } catch (e) {
    await chrome.action.setBadgeText({ text: e.message === 'no-token' ? '' : '!' });
  }
}
