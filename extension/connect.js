// Runs on the Günlük site: when you are signed in there, the extension connects to your account by itself
// (no token to paste) — your cards and routines show up in the extension.
(async () => {
  try {
    const r = await fetch('/api/extension/token', { credentials: 'same-origin' });
    if (!r.ok) return;  // not signed in
    const { token } = await r.json();
    if (!token) return;
    const c = await chrome.storage.local.get(['token', 'base']);
    if (c.token === token && c.base === location.origin) return;
    await chrome.storage.local.set({ token, base: location.origin });
    chrome.runtime.sendMessage({ type: 'connected' }).catch(() => {});
  } catch { /* the site or the extension is reloading */ }
})();
