"""Kişiler: people a task can be assigned to.

Contacts import / export as vCard (.vcf) or CSV in Google Contacts and Outlook (Hotmail) formats.
The assignment e-mail goes out through the user's own mailbox over SMTP (Gmail / Outlook app password)."""
import csv
import html
import io
import json
import quopri
import re
import os
import secrets
import smtplib
import ssl
from datetime import date, timedelta
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import quote, urlencode

from . import core, db
from .db import ins, q, q1, uget, uid, uset, x

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PRESETS = {"gmail": ("smtp.gmail.com", 587), "outlook": ("smtp-mail.outlook.com", 587)}


class MailError(Exception):
    pass


# ---------- contacts ----------

def _phone(p):
    p = (p or "").strip()
    return (("+" if p.startswith("+") else "") + re.sub(r"\D", "", p))[:20]


def _clean(f):
    return {"first_name": (f.get("first_name") or "").strip()[:80], "last_name": (f.get("last_name") or "").strip()[:80],
            "email": (f.get("email") or "").strip().lower()[:200], "phone": _phone(f.get("phone"))}


def item(c):
    return {"id": c["id"], "first_name": c["first_name"], "last_name": c["last_name"],
            "name": f"{c['first_name']} {c['last_name']}".strip(), "email": c["email"], "phone": c["phone"]}


def contacts():
    return [item(c) for c in q("""SELECT * FROM contacts WHERE user_id=?
                                  ORDER BY lower(first_name), lower(last_name), id""", (uid(),))]


def get(cid):
    return q1("SELECT * FROM contacts WHERE id=? AND user_id=?", (cid, uid()))


def _find(d):
    if d["email"]:
        return q1("SELECT * FROM contacts WHERE user_id=? AND email=?", (uid(), d["email"]))
    return q1("SELECT * FROM contacts WHERE user_id=? AND email='' AND lower(first_name)=? AND lower(last_name)=?",
              (uid(), d["first_name"].lower(), d["last_name"].lower()))


def _check(d):
    if not d["first_name"] and not d["last_name"]:
        raise ValueError("İsim gerekli")
    if d["email"] and not EMAIL_RE.match(d["email"]):
        raise ValueError("E-posta adresi geçersiz")


def save(cid, f):
    """cid None = new (an existing person with the same e-mail is updated instead)."""
    d = _clean(f)
    _check(d)
    old = get(cid) if cid else _find(d)
    if cid and not old:
        return None
    if old:
        x("UPDATE contacts SET first_name=?, last_name=?, email=?, phone=? WHERE id=? AND user_id=?",
          (d["first_name"], d["last_name"], d["email"], d["phone"] or old["phone"], old["id"], uid()))
        return item(get(old["id"]))
    cid = ins("INSERT INTO contacts(user_id,first_name,last_name,email,phone,created_at) VALUES(?,?,?,?,?,?)",
              (uid(), d["first_name"], d["last_name"], d["email"], d["phone"], core.now_s()))
    return item(get(cid))


def delete(cid):
    x("UPDATE tasks SET assignee_id=NULL, assigned_at=NULL WHERE assignee_id=? AND user_id=?", (cid, uid()))
    return x("DELETE FROM contacts WHERE id=? AND user_id=?", (cid, uid()))


# ---------- import: vCard (Google / Outlook / iPhone) or CSV (Google, Outlook) ----------

def _unesc(v):
    return re.sub(r"\\([\\,;nN])", lambda m: " " if m.group(1) in "nN" else m.group(1), v).strip()


def _vcards(text):
    text = re.sub(r"=\r?\n", "=", text)            # quoted-printable soft breaks (old Outlook vCard 2.1)
    text = re.sub(r"=(?=\r?\n)", "", text)
    text = re.sub(r"\r?\n[ \t]", "", text)          # folded lines
    out, cur = [], None
    for line in text.splitlines():
        u = line.upper()
        if u.startswith("BEGIN:VCARD"):
            cur = {"emails": [], "tels": []}
            continue
        if u.startswith("END:VCARD"):
            if cur is not None:
                out.append(cur)
            cur = None
            continue
        if cur is None or ":" not in line:
            continue
        key, val = line.split(":", 1)
        parts = key.split(";")
        name, params = parts[0].split(".")[-1].upper(), ";".join(parts[1:]).upper()
        if "QUOTED-PRINTABLE" in params:
            val = quopri.decodestring(val.encode("latin-1", "replace")).decode("utf-8", "replace")
        if name == "N":
            comps = re.split(r"(?<!\\);", val) + ["", ""]
            cur["last_name"], cur["first_name"] = _unesc(comps[0]), _unesc(comps[1])
        elif name == "FN":
            cur["fn"] = _unesc(val)
        elif name == "EMAIL" and _unesc(val):
            cur["emails"].insert(0 if "PREF" in params else len(cur["emails"]), _unesc(val))
        elif name == "TEL" and _unesc(val):
            mobile = "CELL" in params or "MOBILE" in params
            cur["tels"].insert(0 if mobile else len(cur["tels"]), _unesc(val))
    for c in out:
        if not c.get("first_name") and not c.get("last_name") and c.get("fn"):
            first, _, last = c["fn"].rpartition(" ")
            c["first_name"], c["last_name"] = (first, last) if first else (last, "")
        yield {"first_name": c.get("first_name", ""), "last_name": c.get("last_name", ""),
               "email": (c["emails"] or [""])[0], "phone": (c["tels"] or [""])[0]}


_COLS = {
    "first_name": ("first name", "given name", "ad", "adı", "isim"),
    "last_name": ("last name", "family name", "soyad", "soyadı"),
    "name": ("name", "display name", "full name", "ad soyad"),
    "email": ("e-mail 1 - value", "e-mail address", "email address", "email", "e-mail", "e-posta", "mail",
              "e-mail 2 address", "e-mail 2 - value"),
    "phone": ("mobile phone", "phone 1 - value", "primary phone", "cep", "cep telefonu", "telefon", "phone",
              "home phone", "business phone", "phone 2 - value"),
}


def _csv(text):
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    for r in csv.DictReader(io.StringIO(text), dialect=dialect):
        low = {(k or "").strip().lower(): (v or "").strip() for k, v in r.items() if isinstance(v, str)}
        pick = lambda key: next((low[k].split(" ::: ")[0].strip() for k in _COLS[key] if low.get(k)), "")
        d = {k: pick(k) for k in ("first_name", "last_name", "email", "phone")}
        if not d["first_name"] and not d["last_name"] and pick("name"):
            first, _, last = pick("name").rpartition(" ")
            d["first_name"], d["last_name"] = (first, last) if first else (last, "")
        yield d


def import_text(text):
    rows = _vcards(text) if "BEGIN:VCARD" in text.upper() else _csv(text)
    added = updated = skipped = 0
    for f in rows:
        d = _clean(f)
        if d["email"] and not EMAIL_RE.match(d["email"]):
            d["email"] = ""
        if not (d["first_name"] or d["last_name"]):
            if not d["email"]:
                skipped += 1
                continue
            d["first_name"] = d["email"].split("@")[0]
        old = _find(d)
        save(None, d)
        if old:
            updated += 1
        else:
            added += 1
    return {"added": added, "updated": updated, "skipped": skipped}


# ---------- export ----------

def _vesc(v):
    return (v or "").replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;")


def export(fmt):
    """fmt: vcf (Google + Outlook + phones), google (Google Contacts CSV), outlook (Outlook / Hotmail CSV)."""
    people = contacts()
    if fmt == "vcf":
        lines = []
        for p in people:
            lines += ["BEGIN:VCARD", "VERSION:3.0", f"N:{_vesc(p['last_name'])};{_vesc(p['first_name'])};;;",
                      f"FN:{_vesc(p['name'])}"]
            if p["email"]:
                lines.append(f"EMAIL;TYPE=INTERNET:{p['email']}")
            if p["phone"]:
                lines.append(f"TEL;TYPE=CELL:{p['phone']}")
            lines.append("END:VCARD")
        return "\r\n".join(lines) + "\r\n", "text/vcard", "kisiler.vcf"
    buf = io.StringIO()
    w = csv.writer(buf)
    if fmt == "google":
        w.writerow(["First Name", "Middle Name", "Last Name", "E-mail 1 - Label", "E-mail 1 - Value", "Phone 1 - Label", "Phone 1 - Value"])
        for p in people:
            w.writerow([p["first_name"], "", p["last_name"], "* Other" if p["email"] else "", p["email"], "Mobile" if p["phone"] else "", p["phone"]])
        name = "kisiler-google.csv"
    else:
        w.writerow(["First Name", "Last Name", "E-mail Address", "Mobile Phone"])
        for p in people:
            w.writerow([p["first_name"], p["last_name"], p["email"], p["phone"]])
        name = "kisiler-outlook.csv"
    return "﻿" + buf.getvalue(), "text/csv", name


# ---------- mail settings + sending ----------

def mail_cfg():
    return json.loads(uget("mail_cfg") or "{}")


def mail_public():
    c = mail_cfg()
    return {"provider": c.get("provider") or "gmail", "host": c.get("host") or "", "port": c.get("port") or 587,
            "user": c.get("user") or "", "from_name": c.get("from_name") or "", "has_pass": bool(c.get("pass")),
            "configured": bool(c.get("host") and c.get("user") and c.get("pass"))}


def set_mail(f):
    c = mail_cfg()
    prov = f.get("provider") or c.get("provider") or "gmail"
    c["provider"] = prov
    if f.get("user") is not None:
        c["user"] = f["user"].strip()[:200]
    if f.get("from_name") is not None:
        c["from_name"] = f["from_name"].strip()[:100]
    if f.get("password"):
        c["pass"] = re.sub(r"\s", "", f["password"]) if prov == "gmail" else f["password"]  # Gmail shows it in 4-letter groups
    if prov in PRESETS:
        c["host"], c["port"] = PRESETS[prov]
    else:
        if f.get("host") is not None:
            c["host"] = f["host"].strip()[:200]
        if f.get("port"):
            c["port"] = int(f["port"])
    uset("mail_cfg", json.dumps(c))
    return mail_public()


def send_mail(to, subject, text, html_body=None):
    c = mail_cfg()
    if not (c.get("host") and c.get("user") and c.get("pass")):
        raise MailError("Mail ayarı yapılmadı")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((c.get("from_name") or c["user"], c["user"]))
    msg["To"] = to
    msg.set_content(text)
    if html_body:
        msg.add_alternative(html_body, subtype="html")
    port = int(c.get("port") or 587)
    ctx = ssl.create_default_context()
    try:
        s = smtplib.SMTP_SSL(c["host"], port, timeout=20, context=ctx) if port == 465 else smtplib.SMTP(c["host"], port, timeout=20)
        with s:
            if port != 465:
                s.starttls(context=ctx)
            # PLAIN only: after a refused PLAIN, smtplib tries LOGIN and Gmail hangs up, hiding the real "wrong password"
            s.ehlo()
            s.user, s.password = c["user"], c["pass"]
            s.auth("PLAIN", s.auth_plain)
            s.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise MailError("Mail şifresi kabul edilmedi — normal şifre değil, 'Uygulama şifresi' gerekir")
    except (smtplib.SMTPException, OSError) as e:
        raise MailError(f"Mail gönderilemedi ({e.__class__.__name__}: {str(e)[:120]})")


def _me():
    u = q1("SELECT name, email FROM users WHERE id=?", (uid(),))
    return uget("profile_name") or (u and u["name"]) or (u and u["email"]) or "Günlük"


PUBLIC_URL = os.environ.get("PUBLIC_URL", "http://localhost:8430").rstrip("/")
ACCENT = "#2563eb"


def _sender_email():
    return mail_cfg().get("user") or (q1("SELECT email FROM users WHERE id=?", (uid(),)) or {"email": ""})["email"]


def _fmt_day(d):
    months = "Ocak Şubat Mart Nisan Mayıs Haziran Temmuz Ağustos Eylül Ekim Kasım Aralık".split()
    days = "Pazartesi Salı Çarşamba Perşembe Cuma Cumartesi Pazar".split()
    dd = date.fromisoformat(d)
    return f"{dd.day} {months[dd.month - 1]} {dd.year}, {days[dd.weekday()]}"


def _links(t, me_mail):
    """What the mail and the task page link to: the task page, 'done', calendar (with a due date), reply."""
    tok = t["assign_token"]
    out = {"open": f"{PUBLIC_URL}/a/{tok}", "done": f"{PUBLIC_URL}/a/{tok}?bitti=1", "app": f"{PUBLIC_URL}/a/{tok}/giris"}
    if t["due_date"]:
        d = date.fromisoformat(t["due_date"])
        nxt = d + timedelta(days=1)
        details = (t["notes"] or "") + f"\n\nGörev: {out['open']}"
        out["gcal"] = "https://calendar.google.com/calendar/render?" + urlencode(
            {"action": "TEMPLATE", "text": t["title"], "dates": f"{d:%Y%m%d}/{nxt:%Y%m%d}", "details": details})
        out["ocal"] = "https://outlook.live.com/calendar/0/deeplink/compose?" + urlencode(
            {"path": "/calendar/action/compose", "rru": "addevent", "subject": t["title"], "body": details,
             "startdt": d.isoformat(), "enddt": nxt.isoformat(), "allday": "true"})
    if me_mail:
        out["reply"] = f"mailto:{me_mail}?" + urlencode({"subject": f"Re: {t['title']}"}, quote_via=quote)
    return out


def _btn(url, label, primary=False):
    style = (f"background:{ACCENT};color:#ffffff;border:1px solid {ACCENT}" if primary
             else f"background:#ffffff;color:{ACCENT};border:1px solid #c7d2fe")
    return (f'<a href="{html.escape(url)}" style="display:inline-block;{style};text-decoration:none;font-weight:700;'
            f'font-size:15px;padding:12px 20px;border-radius:10px;margin:0 8px 8px 0">{label}</a>')


def _assign_mail(t, c):
    who, me, me_mail = (c["first_name"] or c["last_name"]), _me(), _sender_email()
    L = _links(t, me_mail)
    steps = [s.get("t") or "" for s in json.loads(t.get("steps") or "[]") if s.get("t")]
    due = _fmt_day(t["due_date"]) if t["due_date"] else ""
    e = html.escape
    # plain text (mail apps that do not show html)
    text = [f"Merhaba {who},", "", f"{me} sana bir görev atadı:", "", f"  {t['title']}"]
    if due:
        text.append(f"  Son tarih: {due}")
    if t["notes"]:
        text += ["", "Not:", t["notes"]]
    if steps:
        text += ["", "Adımlar:"] + [f"  [ ] {s}" for s in steps]
    text += ["", f"Görevi listede aç (Günlük'e giriş yap, Günüm'e gelsin): {L['app']}",
             f"Giriş yapmadan görüntüle: {L['open']}", f"Bitirince işaretle: {L['done']}"]
    if due:
        text += [f"Google Takvim'e ekle: {L['gcal']}", f"Outlook takvimine ekle: {L['ocal']}"]
    if me_mail:
        text.append(f"Soru sor / yanıtla: {me_mail}")
    text += ["", f"— {me}"]
    # html
    chip = (f'<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:13px;font-weight:700;'
            f'padding:4px 10px;border-radius:20px">📅 Son tarih: {e(due)}</span>') if due else ""
    notes = (f'<div style="margin-top:14px;padding:12px 14px;background:#f9fafb;border-radius:10px;color:#374151;'
             f'white-space:pre-wrap;font-size:14px">{e(t["notes"])}</div>') if t["notes"] else ""
    step_html = ('<div style="margin-top:14px"><div style="font-size:12px;font-weight:700;color:#6b7280;'
                 'text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Adımlar</div>'
                 + "".join(f'<div style="padding:4px 0;font-size:14px">☐ {e(s)}</div>' for s in steps) + "</div>") if steps else ""
    cal = ""
    if due:
        cal = (f'<div style="margin-top:6px;font-size:13px;color:#6b7280">Takvimine ekle: '
               f'<a href="{e(L["gcal"])}" style="color:{ACCENT};font-weight:700;text-decoration:none">Google Takvim</a> · '
               f'<a href="{e(L["ocal"])}" style="color:{ACCENT};font-weight:700;text-decoration:none">Outlook / Hotmail</a></div>')
    reply = (f'<a href="{e(L["reply"])}" style="color:{ACCENT};font-weight:700;text-decoration:none">✉️ Soru sor / yanıtla</a>'
             if me_mail else "")
    body = f"""<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6">
<div style="background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
  <div style="background:{ACCENT};background-image:linear-gradient(135deg,{ACCENT},#7c3aed);padding:18px 24px;color:#ffffff">
    <div style="font-size:12px;opacity:.85;font-weight:700;letter-spacing:.06em">GÜNLÜK · GÖREV ATAMASI</div>
    <div style="font-size:20px;font-weight:800;margin-top:4px">{e(me)} sana bir görev atadı</div></div>
  <div style="padding:22px 24px">
    <p style="margin:0 0 14px;font-size:15px">Merhaba {e(who)},</p>
    <div style="border:1px solid #e5e7eb;border-left:5px solid {ACCENT};border-radius:12px;padding:16px 18px">
      <a href="{e(L['open'])}" style="font-size:20px;font-weight:800;color:#111827;text-decoration:none">{e(t['title'])}</a>
      <div style="margin-top:10px">{chip}</div>{notes}{step_html}</div>
    <div style="margin-top:20px">{_btn(L['app'], 'Görevi listede aç', True)}{_btn(L['done'], '✅ Tamamladım')}</div>
    <div style="font-size:12.5px;color:#6b7280;margin-top:2px">"Görevi listede aç": Günlük'e giriş yaparsın, görev <b>Günüm</b> listene gelir.
      Hesabın yoksa Google ile girebilir ya da hızlıca kayıt olabilirsin. · <a href="{e(L['open'])}" style="color:{ACCENT};text-decoration:none;font-weight:700">Giriş yapmadan görüntüle</a></div>
    {cal}
    <div style="margin-top:14px;font-size:13px">{reply}</div>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">
    Bu mail {e(me)} tarafından Günlük uygulamasından gönderildi. Yanıtlarsan doğrudan {e(me)} kişisine gider.</div>
</div></div></body></html>"""
    return f"📌 Yeni görev: {t['title']}", "\n".join(text), body


def assign(tid, cid, mail=True):
    t = core._task(tid)
    if not t:
        return None
    c = get(cid) if cid else None
    if cid and not c:
        raise LookupError("Kişi bulunamadı")
    # a new link for every assignment (the previous person's link stops working)
    x("UPDATE tasks SET assignee_id=?, assigned_at=?, assign_token=? WHERE id=? AND user_id=?",
      (cid, core.now_s() if cid else None, secrets.token_urlsafe(18) if cid else None, tid, uid()))
    t = core._task(tid)
    res = {"item": core.task_item(t), "mailed": False, "mail_error": None}
    if c and mail:
        if not c["email"]:
            res["mail_error"] = "Kişinin e-posta adresi yok"
        else:
            try:
                send_mail(c["email"], *_assign_mail(t, c))
                res["mailed"] = True
            except MailError as e:
                res["mail_error"] = str(e)
    return res


# ---------- the task page behind the mail's links (no sign-in: the link itself is the key) ----------

def by_token(tok):
    """(task, person) for a link; the caller makes the task's owner the current user (mail settings, name)."""
    t = q1("SELECT * FROM tasks WHERE assign_token=? AND deleted=0", (tok,)) if tok and len(tok) >= 16 else None
    if not t:
        return None
    c = q1("SELECT * FROM contacts WHERE id=? AND user_id=?", (t["assignee_id"], t["user_id"]))
    return (dict(t), c) if c else None


def public_done(t, c):
    """The assignee says it is done: the task is closed and the assigner hears about it (push + mail)."""
    if t["completed_at"]:
        return
    x("UPDATE tasks SET completed_at=?, source='atanan' WHERE id=?", (core.now_s(), t["id"]))
    name = f"{c['first_name']} {c['last_name']}".strip()
    try:
        from . import push
        push.send_all(f"✅ {name} görevi tamamladı", t["title"], url="/", tag=f"done{t['id']}", user_id=t["user_id"])
    except Exception:
        pass
    me_mail = _sender_email()
    if me_mail:
        try:
            send_mail(me_mail, f"✅ {name} tamamladı: {t['title']}",
                      f"{name}, sana atanan \"{t['title']}\" görevini tamamladı olarak işaretledi.\n\n{PUBLIC_URL}",
                      f'<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px"><p><b>{html.escape(name)}</b>, '
                      f'"<b>{html.escape(t["title"])}</b>" görevini tamamladı olarak işaretledi. ✅</p>'
                      f'<p><a href="{PUBLIC_URL}" style="color:{ACCENT};font-weight:700">Günlük\'ü aç</a></p></div>')
        except MailError:
            pass


def public_page(t, c, ask_done=False, just_done=False):
    """Server-rendered page for the person the task was assigned to."""
    e = html.escape
    me, me_mail = _me(), _sender_email()
    L = _links(t, me_mail)
    tok = t["assign_token"]
    steps = [s for s in json.loads(t.get("steps") or "[]") if s.get("t")]
    done = bool(t["completed_at"])
    parts = ['<div class="top">GÜNLÜK · GÖREV ATAMASI</div><div class="card">',
             f'<div class="who">{e(me)} → {e((c["first_name"] + " " + c["last_name"]).strip())}</div>',
             f'<h1 class="{"done" if done else ""}">{e(t["title"])}</h1>']
    if t["due_date"]:
        late = not done and t["due_date"] < core.today_s()
        parts.append(f'<span class="chip {"late" if late else ""}">📅 Son tarih: {e(_fmt_day(t["due_date"]))}{" — gecikti" if late else ""}</span>')
    if t["notes"]:
        parts.append(f'<div class="notes">{e(t["notes"])}</div>')
    if steps:
        parts.append('<div class="lbl">Adımlar</div>' + "".join(
            f'<div class="step">{"☑" if s.get("d") else "☐"} {e(s["t"])}</div>' for s in steps))
    if done:
        w = t["completed_at"]
        parts.append(f'<div class="ok">✅ Tamamlandı · {e(w[8:10] + "." + w[5:7] + "." + w[:4] + " " + w[11:16])}'
                     + (f"<br><small>{e(me)} haberdar edildi.</small>" if just_done else "") + "</div>")
    else:
        if ask_done:
            parts.append(f'<p class="ask">Bitirdiysen aşağıdaki düğmeye bas, {e(me)} haberdar olsun.</p>')
        parts.append(f'<form method="post" action="/a/{e(tok)}/bitti"><button class="btn primary">✅ Tamamladım</button></form>')
        parts.append(f'<div class="login"><b>Görevi listende takip et</b><span>Günlük\'e giriş yaparsan bu görev <b>Günüm</b> listene gelir; '
                     f'orada tamamlayınca {e(me)} haberdar olur.</span><a class="btn app" href="{e(L["app"])}">📋 Görevi listede aç</a></div>')
    links = []
    if t["due_date"] and not done:
        links += [f'<a class="btn" href="{e(L["gcal"])}" target="_blank" rel="noopener">📅 Google Takvim\'e ekle</a>',
                  f'<a class="btn" href="{e(L["ocal"])}" target="_blank" rel="noopener">📅 Outlook takvimine ekle</a>']
    if me_mail:
        links.append(f'<a class="btn" href="{e(L["reply"])}">✉️ {e(me)} kişisine yaz</a>')
    if links:
        parts.append('<div class="links">' + "".join(links) + "</div>")
    parts.append("</div>")
    return page(t["title"], "".join(parts))


def page(title, inner):
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>{html.escape(title)} · Günlük</title><style>
body{{margin:0;background:linear-gradient(160deg,#eef2ff,#f5f3ff);font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111827;min-height:100vh}}
.wrap{{max-width:560px;margin:0 auto;padding:28px 16px}}
.top{{font-size:12px;font-weight:800;letter-spacing:.06em;color:{ACCENT};margin:0 4px 10px}}
.card{{background:#fff;border-radius:18px;padding:24px;box-shadow:0 8px 30px rgba(37,99,235,.10);border-top:5px solid {ACCENT}}}
.who{{color:#6b7280;font-size:14px;font-weight:600}}
h1{{font-size:24px;margin:6px 0 12px;line-height:1.25}} h1.done{{text-decoration:line-through;color:#6b7280}}
.chip{{display:inline-block;background:#fef3c7;color:#92400e;font-size:13px;font-weight:700;padding:5px 11px;border-radius:20px}}
.chip.late{{background:#fee2e2;color:#991b1b}}
.notes{{margin-top:14px;padding:12px 14px;background:#f9fafb;border-radius:10px;white-space:pre-wrap;font-size:15px;color:#374151}}
.lbl{{margin:16px 0 6px;font-size:12px;font-weight:800;color:#6b7280;letter-spacing:.05em;text-transform:uppercase}}
.step{{padding:5px 0;font-size:15px}}
.ask{{margin:18px 0 0;font-weight:600;color:#92400e}}
form{{margin:18px 0 0}}
.btn{{display:inline-block;padding:12px 18px;border-radius:12px;border:1px solid #c7d2fe;background:#fff;color:{ACCENT};font-weight:700;
  font-size:15px;text-decoration:none;cursor:pointer;margin:0 8px 8px 0;font-family:inherit}}
.btn.primary{{background:#16a34a;border-color:#16a34a;color:#fff;font-size:17px;padding:14px 22px;width:100%;margin:0}}
.ok{{margin-top:18px;padding:14px;border-radius:12px;background:#dcfce7;color:#166534;font-weight:700}}
.ok small{{font-weight:500}}
.links{{margin-top:18px;padding-top:16px;border-top:1px solid #f3f4f6}}
.muted{{color:#6b7280}}
.login{{margin-top:16px;padding:14px;border-radius:12px;background:#eef2ff;display:flex;flex-direction:column;gap:8px}}
.login span{{font-size:14px;color:#374151}}
.btn.app{{background:{ACCENT};border-color:{ACCENT};color:#fff;text-align:center;margin:4px 0 0}}
</style></head><body><div class="wrap">{inner}</div></body></html>"""


# ---------- "Görevi listede aç": the assignee signs in, a copy of the task comes into their Günüm ----------

def _owner_name(user_id):
    u = q1("SELECT name, email FROM users WHERE id=?", (user_id,))
    return uget("profile_name", user_id=user_id) or (u and u["name"]) or (u and u["email"]) or ""


def claim(tok, me):
    """(task id, how): how = new | again | own (the assigner's own link) | gone."""
    found = by_token(tok)
    if not found:
        return None, "gone"
    t, c = found
    if t["user_id"] == me:
        return t["id"], "own"
    now, d = core.now_s(), core.today_s()
    old = q1("SELECT id FROM tasks WHERE user_id=? AND src_token=? AND deleted=0", (me, tok))
    if old:
        x("UPDATE tasks SET my_day_date=?, my_day_at=? WHERE id=? AND user_id=?", (d, now, old["id"], me))
        return old["id"], "again"
    tid = ins("""INSERT INTO tasks(title,notes,due_date,important,my_day_date,my_day_at,created_at,user_id,steps,src_token,assigned_by,position)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MIN(position), 0) - 1 FROM tasks WHERE user_id=?))""",
              (t["title"], t["notes"] or "", t["due_date"], t["important"], d, now, now, me, t.get("steps") or "[]",
               tok, _owner_name(t["user_id"]), me))
    return tid, "new"


def copy_done(tid):
    """The assignee closed their copy in the app: close the original and tell the assigner. Returns the assigner's id."""
    t = q1("SELECT src_token, completed_at FROM tasks WHERE id=? AND user_id=?", (tid, uid()))
    if not t or not t["src_token"] or not t["completed_at"]:
        return None
    found = by_token(t["src_token"])
    if not found:
        return None
    ctx = db.CUR_UID.set(found[0]["user_id"])   # the assigner's mail settings / name
    try:
        public_done(*found)
    finally:
        db.CUR_UID.reset(ctx)
    return found[0]["user_id"]


def test_mail():
    c = mail_cfg()
    send_mail(c.get("user") or "", "Günlük — deneme maili",
              "Bu bir deneme mailidir. Görev atadığın kişilere mailler bu adresten gidecek.",
              "<p>Bu bir deneme mailidir. Görev atadığın kişilere mailler bu adresten gidecek.</p>")
