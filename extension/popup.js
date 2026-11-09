const root = document.getElementById('root');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
// sun = the card is in Günüm (My Day): routines of the day and tasks added to My Day (not tasks that are only due)
const SUN = '<svg class="sun" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
// same orders as the app's "Sırala" menu; the choice is shared with Günüm in the app
const SORTS = { manual: 'Elle', created: 'Yeniden eskiye', oldest: 'Eskiden yeniye', important: 'Önem derecesi', alpha: 'Alfabetik', due: 'Son tarih' };

function sortItems(items, mode) {
  const at = x => x.added_at || x.created_at || '';  // when the card came into Günüm
  const by = {
    important: (a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0),
    alpha: (a, b) => a.title.localeCompare(b.title, 'tr', { sensitivity: 'base', numeric: true }),
    due: (a, b) => (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99'),
    created: (a, b) => at(b).localeCompare(at(a)) || (b.task_id || 0) - (a.task_id || 0),  // newest first; same second → higher id
    oldest: (a, b) => (at(a) || '9999').localeCompare(at(b) || '9999') || (a.task_id || 0) - (b.task_id || 0),
  }[mode] || (() => 0);
  return [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || by(a, b));
}

async function setup(msg) {
  const { base, token } = await cfg();
  root.innerHTML = `<div class="setup"><h2>Günlük'e bağlan</h2>
    <p><b>En kolayı:</b> Günlük sitesini aç ve giriş yap; eklenti hesabına kendiliğinden bağlanır, kartların ve rutinlerin gelir.</p>
    <button class="btn" id="site">Siteyi aç ve giriş yap</button>
    <p style="margin-top:12px">Ya da sitedeki <b>Ayarlar → Kur → Chrome eklentisi</b>'nden token'ı buraya yapıştır:</p>
    <label>Sunucu adresi</label><input id="base" value="${esc(base)}">
    <label>Token</label><input id="token" value="${esc(token)}" placeholder="token">
    <button class="btn" id="save">Kaydet</button><div class="err">${esc(msg || '')}</div></div>`;
  document.getElementById('site').onclick = () => chrome.tabs.create({ url: base });
  document.getElementById('save').onclick = async () => {
    await chrome.storage.local.set({
      base: document.getElementById('base').value.trim().replace(/\/+$/, ''),
      token: document.getElementById('token').value.trim(),
    });
    load();
  };
}

// the add box keeps the focus: on open and after each Enter, so tasks can be typed one after another
async function load(focusAdd = true) {
  let data;
  try {
    data = await call('/today');
  } catch (e) {
    if (e.message === 'no-token') return setup();
    if (e.message === 'bad-token') return setup('Token geçersiz.');
    root.innerHTML = `<div class="empty">Sunucuya ulaşılamadı.<br>${esc(e.message)}<br><br><button class="btn" id="retry">Tekrar dene</button></div>`;
    document.getElementById('retry').onclick = load;
    return;
  }
  const { base } = await cfg();
  const mode = SORTS[data.sort] ? data.sort : 'manual';
  const open = sortItems(data.items.filter(i => !i.done), mode);
  const done = data.items.length - open.length;
  const d = new Date();
  root.innerHTML = `
    <div class="hero"><div><h1>Bugün</h1><p>${d.getDate()} ${MONTHS[d.getMonth()]} ${DAYS[d.getDay()]}</p></div><div class="n">${done}/${data.items.length}</div></div>
    <div class="sortbar"><label for="sort">Sırala</label><select id="sort">${Object.entries(SORTS).map(([k, l]) => `<option value="${k}"${k === mode ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="list">${open.map(i => `<div class="item" data-id="${esc(i.id)}"><button class="chk" title="Tamamla">${CHECK}</button>
      <div class="t">${i.kind === 'routine' || i.my_day ? SUN : ''}${esc(i.title)}<div class="meta">${i.kind === 'routine' ? 'Rutin' : 'Görev'}${i.time ? ' · ' + esc(i.time) : ''}${i.overdue ? ' · gecikti' : ''}</div></div></div>`).join('')
      || `<div class="empty">${data.items.length ? '🎉 Bugünlük her şey tamam' : 'Bugün için görev yok'}</div>`}</div>
    <form id="add"><input id="title" placeholder="Bugüne görev ekle" maxlength="300"><button class="btn">Ekle</button></form>
    <div class="foot"><a href="${esc(base)}" target="_blank">Uygulamayı aç ↗</a><button id="cfg">Ayarlar</button></div>`;
  refreshBadge(data.items);
  root.querySelectorAll('.chk').forEach(b => b.onclick = async () => {
    const row = b.closest('.item');
    row.classList.add('gone');
    try {
      await call(`/items/${row.dataset.id}/done`, { method: 'POST', body: { done: true } });
    } catch { row.classList.remove('gone'); return; }
    setTimeout(() => load(false), 350);
  });
  document.getElementById('add').onsubmit = async e => {
    e.preventDefault();
    const v = document.getElementById('title').value.trim();
    if (!v) return;
    const inp = document.getElementById('title');
    inp.value = '';
    try { await call('/tasks', { method: 'POST', body: { title: v, my_day: true } }); }
    catch { inp.value = v; inp.focus(); return; }
    load();
  };
  document.getElementById('sort').onchange = async e => {
    try { await call('/settings', { method: 'PATCH', body: { list_sort: { list: 'today', mode: e.target.value } } }); } catch {}
    load();
  };
  document.getElementById('cfg').onclick = () => setup();
  if (focusAdd) document.getElementById('title').focus();
}

load();

// signed in on the site while this window is open: show the tasks right away
chrome.storage.onChanged.addListener(ch => { if (ch.token) load(); });
