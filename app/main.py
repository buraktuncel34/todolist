"""Günlük Organizer — FastAPI app: API + static PWA + minute ticker."""
import asyncio
import base64
import hashlib
import io
import json
import logging
import os
import re
import secrets
import time
import urllib.parse
import urllib.request
import zipfile
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import core, db, people, push, report, undo, weather

log = logging.getLogger("gunluk")
WEB = db.BASE / "web"
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
TIME_RE = re.compile(r"([01]\d|2[0-3]):[0-5]\d")


# ---------- scheduler ----------

def user_tick(now, user_id):
    """One user's minute: today's routine items, morning summary, timed alerts, nudges, task reminders."""
    d, hm = now.strftime("%Y-%m-%d"), now.strftime("%H:%M")
    send = lambda title, body, tag: push.send_all(title, body, "/", tag, user_id=user_id)  # noqa: E731
    core.ensure_day(d)
    if hm == db.uget("morning_time", "07:00") and db.uget("last_morning") != d:
        db.uset("last_morning", d)
        open_items = [i for i in core.today(d)["items"] if not i["done"]]
        if open_items:
            names = ", ".join(i["title"] for i in open_items[:3]) + ("…" if len(open_items) > 3 else "")
            send(f"Günaydın! Bugün {len(open_items)} görevin var", names, "morning")
    if db.uget("item_alerts", "1") == "1":
        for i in core.today(d)["items"]:
            if not i["done"] and i.get("time") == hm:
                send(f"⏰ {i['title']}", "Rutin zamanı geldi", i["id"])
    if hm in core.nudge_schedule() and db.uget("last_nudge") != f"{d} {hm}":
        db.uset("last_nudge", f"{d} {hm}")
        open_items = [i for i in core.today(d)["items"] if not i["done"]]
        if open_items:
            names = ", ".join(i["title"] for i in open_items[:3]) + ("…" if len(open_items) > 3 else "")
            send(f"📋 Bugün {len(open_items)} görevin kaldı", names, "nudge")
    for t in core.due_task_reminders(now):
        send(f"🔔 {t['title']}", "Hatırlatma zamanı", f"t{t['id']}")


def as_user(user_id, fn, *args):
    """Run fn with user_id as the current user (scheduler / startup work outside a request)."""
    token = db.CUR_UID.set(user_id)
    try:
        return fn(*args)
    finally:
        db.CUR_UID.reset(token)


def minute_tick(now):
    for user_id in core.active_user_ids():
        try:
            as_user(user_id, user_tick, now, user_id)
        except Exception:  # noqa: BLE001 - one user's problem must not stop the others
            log.exception("tick failed for user %s", user_id)
    db.backup_if_due(now)


async def ticker():
    last = None
    while True:
        now = datetime.now()
        hm = now.strftime("%Y-%m-%d %H:%M")
        if hm != last:
            last = hm
            try:
                await asyncio.to_thread(minute_tick, now)
            except Exception:  # noqa: BLE001 - keep the ticker alive
                log.exception("tick failed")
        await asyncio.sleep(15)


@asynccontextmanager
async def lifespan(_app):
    db.init()
    core.ensure_defaults()
    push.ensure_keys()
    for user_id in core.active_user_ids():
        as_user(user_id, core.ensure_day)
    t = asyncio.create_task(ticker())
    yield
    t.cancel()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


# Live sync: every successful change bumps the user's revision; open devices poll /api/rev and refresh when it moves.
# BUILD changes with every app release (index.html carries the ?v= numbers), so open pages reload to the new version.
BOOT = str(int(time.time()))
REV = {}
BUILD = hashlib.sha256((WEB / "index.html").read_bytes()).hexdigest()[:12]


def rev_of(user_id):
    return f"{BOOT}-{REV.get(user_id, 0)}"


# Browser-side protection: only our own scripts run (no inline script), the app cannot be framed by another site,
# HTTPS only, no camera/mic/location, no referrer leaks.
SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                               "img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:; "
                               "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; "
                               "worker-src 'self'; manifest-src 'self'",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=31536000",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}


@app.middleware("http")
async def headers(request: Request, call_next):
    r = await call_next(request)
    path = request.url.path
    user = getattr(request.state, "user", None)
    if user and path.startswith("/api/"):
        if request.method != "GET" and r.status_code < 400:
            # X-Rev-Prev lets the device that made the change tell its own change from someone else's
            r.headers["X-Rev-Prev"] = rev_of(user["id"])
            REV[user["id"]] = REV.get(user["id"], 0) + 1
        if request.method != "GET":
            st = undo.state(user["id"])  # keeps the app's undo / redo arrows right after every change
            r.headers["X-Undo-State"] = f"{int(st['can_undo'])}{int(st['can_redo'])}"
        r.headers["X-Rev"] = rev_of(user["id"])
    if path.startswith("/api/"):
        cache = "no-store"
    elif "v" in request.query_params or path.startswith("/icons/"):
        cache = "public, max-age=31536000, immutable"  # versioned assets (?v=N) and icons never change in place
    else:
        cache = "no-cache"                               # index.html, sw.js, manifest: always revalidate
    r.headers["Cache-Control"] = cache
    for k, v in SECURITY_HEADERS.items():
        r.headers[k] = v
    return r


app.add_middleware(GZipMiddleware, minimum_size=800)  # app.js / style.css / JSON lists shrink ~4x


# ---------- auth ----------

def _h(s):
    return hashlib.sha256(s.encode()).hexdigest()


async def auth(request: Request):
    """Find the user (personal API token or session cookie) and make them the current user for this request.
    Async on purpose: the context variable set here is inherited by the endpoint (also when it runs in a thread)."""
    tok = request.headers.get("x-token") or request.query_params.get("token")
    if tok:
        user_id = core.user_by_token(tok)
        if not user_id:
            raise HTTPException(401, "Geçersiz token")
    else:
        same_site_only(request)
        s = request.cookies.get("g_sess")
        h = _h(s) if s else None
        row = db.q1("SELECT user_id FROM sessions WHERE token=?", (h,)) if h else None
        if not row or not row["user_id"]:
            raise HTTPException(401, "Giriş gerekli")
        user_id = row["user_id"]
        seen(h)
    user = core.get_user(user_id)
    if not user or user["disabled"]:
        raise HTTPException(401, "Hesap kapalı")
    user = dict(user)
    user["is_owner"] = bool(user["is_owner"]) and (user["email"] or "").strip().lower() == db.OWNER_EMAIL_DEFAULT
    db.CUR_UID.set(user_id)
    request.state.user = user
    return user


def same_site_only(request: Request):
    """Cookie-based calls must come from this site's own pages (blocks cross-site request forgery).
    Browsers send Sec-Fetch-Site on every request; 'none' = typed in the address bar."""
    if request.headers.get("sec-fetch-site", "same-origin") not in ("same-origin", "none"):
        raise HTTPException(403, "Bu istek başka bir siteden geldiği için reddedildi")


_SEEN = {}


def seen(token_hash):
    """Remember when a signed-in device was last used (written at most every 10 minutes per device)."""
    now = time.time()
    if now - _SEEN.get(token_hash, 0) > 600:
        _SEEN[token_hash] = now
        db.x("UPDATE sessions SET last_seen=? WHERE token=?", (core.now_s(), token_hash))


def owner_only(request: Request):
    if not request.state.user["is_owner"]:
        raise HTTPException(403, "Bu ayar sadece hesap sahibine açık")


def source_of(request: Request):
    s = (request.headers.get("x-source") or "app").lower()
    return s if s in ("app", "extension", "reminders") else "app"


UNDO_LOCK = asyncio.Lock()
UNDO_GRP = re.compile(r"[A-Za-z0-9_-]{1,40}")


async def undo_scope(request: Request, user=Depends(auth)):
    """Writes run one at a time; a write from the app (X-Undo: <gesture id>) is recorded as an undo step."""
    if request.method == "GET":
        yield
        return
    grp = request.headers.get("x-undo") or ""
    async with UNDO_LOCK:
        if UNDO_GRP.fullmatch(grp):
            undo.begin(user["id"], grp)
            try:
                yield
            finally:
                undo.end(user["id"], grp)
        else:
            yield


public = APIRouter(prefix="/api", dependencies=[Depends(same_site_only)])
api = APIRouter(prefix="/api", dependencies=[Depends(auth), Depends(undo_scope)])
FAILS: dict = {}    # ip -> recent failed sign-in times
ACCT_FAILS: dict = {}  # account -> recent failed sign-in times (an attacker changing IPs still hits this)
SIGNUPS: dict = {}  # ip -> recent sign-up times


def _rate(store, ip, limit, window, msg):
    now = time.time()
    hits = [t for t in store.get(ip, []) if now - t < window]
    store[ip] = hits
    if len(hits) >= limit:
        raise HTTPException(429, msg)
    return hits


class LoginIn(BaseModel):
    login: str
    password: str


@public.post("/login")
def login(body: LoginIn, request: Request, response: Response):
    """Manual accounts: username, e-mail or phone + the account's own password."""
    ip = request.client.host if request.client else "?"
    fails = _rate(FAILS, ip, 8, 900, "Çok fazla deneme. 15 dakika sonra tekrar dene.")
    user = core.user_by_login(body.login[:120])
    acct = f"u{user['id']}" if user else "?" + body.login.strip().lower()[:120]
    acct_fails = _rate(ACCT_FAILS, acct, 10, 900, "Bu hesap için çok fazla yanlış deneme. 15 dakika sonra tekrar dene.")
    if not core.check_user_password(user, body.password[:200]):
        fails.append(time.time())
        acct_fails.append(time.time())
        raise HTTPException(401, "Kullanıcı adı / e-posta / telefon veya şifre yanlış")
    ACCT_FAILS.pop(acct, None)
    if user["disabled"]:
        raise HTTPException(403, "Bu hesap kapatılmış")
    FAILS.pop(ip, None)
    core.touch_user(user["id"])
    new_session(request, response, "şifre", {"email": user["email"], "name": user["name"]}, user["id"])
    return {"ok": True}


class SignupIn(BaseModel):
    name: str
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str


@public.post("/signup")
def signup(body: SignupIn, request: Request, response: Response):
    """Quick account without Google: starts with a clean, empty space."""
    if not signup_open():
        raise HTTPException(403, "Yeni kayıtlar şu an kapalı")
    ip = request.client.host if request.client else "?"
    hits = _rate(SIGNUPS, ip, 5, 3600, "Çok fazla kayıt denemesi. Biraz sonra tekrar dene.")
    day_hits = _rate(SIGNUPS, "*", 100, 86400, "Bugün çok fazla yeni kayıt oldu. Yarın tekrar dene.")
    name = " ".join(body.name.split())[:60]
    username = body.username.strip().lower()
    email = (body.email or "").strip().lower() or None
    phone = core.norm_phone(body.phone) or None
    if len(name) < 2:
        raise HTTPException(400, "Ad soyad yaz")
    if not core.USERNAME_RE.fullmatch(username):
        raise HTTPException(400, "Kullanıcı adı 3–30 karakter olmalı: harf, rakam, nokta, alt çizgi (en az bir harf)")
    if email and (len(email) > 120 or not EMAIL_RE.fullmatch(email)):
        raise HTTPException(400, "Geçersiz e-posta")
    if phone and not 10 <= len(phone) <= 15:
        raise HTTPException(400, "Geçersiz telefon numarası")
    if not 6 <= len(body.password) <= 200:
        raise HTTPException(400, "Şifre en az 6 karakter olmalı")
    if core.user_by_login(username):
        raise HTTPException(409, "Bu kullanıcı adı alınmış")
    if email and core.user_by_email(email):
        raise HTTPException(409, "Bu e-postayla zaten bir hesap var")
    if phone and db.q1("SELECT 1 FROM users WHERE phone=?", (phone,)):
        raise HTTPException(409, "Bu telefonla zaten bir hesap var")
    hits.append(time.time())
    day_hits.append(time.time())
    user = core.create_local_user(name, username, email, phone, body.password)
    log.info("new manual user %s (%s)", user["id"], username)
    new_session(request, response, "şifre", {"email": email, "name": name}, user["id"])
    return {"ok": True}


def new_session(request: Request, response: Response, how: str, profile: Optional[dict], user_id: int):
    """how: 'şifre' or 'google:<email>' / 'microsoft:<email>'; profile = {email, name, picture} from the id_token."""
    s = secrets.token_urlsafe(32)
    ua = f"[{how}] " + request.headers.get("user-agent", "")
    p = profile or {}
    pic = p.get("picture") if str(p.get("picture") or "").startswith("https://") else None
    db.x("INSERT INTO sessions(token,created_at,ua,email,name,picture,method,user_id) VALUES(?,?,?,?,?,?,?,?)",
         (_h(s), core.now_s(), ua[:250], p.get("email"), (p.get("name") or "")[:80] or None, pic, how.split(":")[0], user_id))
    response.set_cookie("g_sess", s, max_age=400 * 86400, httponly=True, secure=True, samesite="lax")


# ---------- Google / Microsoft sign-in (OpenID Connect, authorization-code flow) ----------
PUBLIC_URL = os.environ.get("PUBLIC_URL", "http://localhost:8430").rstrip("/")
EMAIL_RE = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
OAUTH = {
    "google": {"name": "Google", "auth": "https://accounts.google.com/o/oauth2/v2/auth",
               "token": "https://oauth2.googleapis.com/token", "id": "google_client_id", "secret": "google_client_secret"},
    "microsoft": {"name": "Microsoft", "auth": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                  "token": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                  "id": "ms_client_id", "secret": "ms_client_secret"},
}


MS_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad"  # personal Microsoft accounts (Hotmail/Outlook/Live)


def redirect_uri(p):
    return f"{PUBLIC_URL}/auth/{p}/callback"


def oauth_ready(p):
    return bool(db.get_setting(OAUTH[p]["id"]) and db.get_setting(OAUTH[p]["secret"]))


def allowed_emails():
    return json.loads(db.get_setting("allowed_emails") or "[]")


def signup_open():
    """New Google/Microsoft accounts may sign up (default yes). When closed, only allow-listed e-mails can."""
    return db.get_setting("signup_open", "1") == "1"


def _claims(id_token):
    """Payload of an id_token received straight from the provider's token endpoint over TLS
    (OIDC Core 3.1.3.7 lets the client skip the signature check in that case); aud/iss/exp are checked by the caller."""
    try:
        payload = id_token.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    except (IndexError, ValueError):
        return {}


def _login_fail(code):
    """code: a key of LOGIN_ERRORS in app.js; the page shows its own text for it, never text from the URL."""
    r = RedirectResponse("/?login_error=" + urllib.parse.quote(code), status_code=303)
    r.delete_cookie("g_oauth")
    return r


@public.get("/auth/providers")
def auth_providers():
    return {p: oauth_ready(p) for p in OAUTH}


@app.get("/auth/{p}/start")
def oauth_start(p: str):
    if p not in OAUTH or not oauth_ready(p):
        return _login_fail("not_ready")
    state = secrets.token_urlsafe(24)
    params = {"client_id": db.get_setting(OAUTH[p]["id"]), "redirect_uri": redirect_uri(p), "response_type": "code",
              "scope": "openid email profile", "state": state, "prompt": "select_account"}
    r = RedirectResponse(OAUTH[p]["auth"] + "?" + urllib.parse.urlencode(params), status_code=303)
    r.set_cookie("g_oauth", f"{p}:{state}", max_age=600, httponly=True, secure=True, samesite="lax")
    return r


@app.get("/auth/{p}/callback")
def oauth_callback(p: str, request: Request, code: str = "", state: str = "", error: str = ""):
    if p not in OAUTH:
        return _login_fail("unknown")
    if error:
        return _login_fail("cancelled")
    if not code or not state or not secrets.compare_digest(request.cookies.get("g_oauth", ""), f"{p}:{state}"):
        return _login_fail("state")
    cid, secret = db.get_setting(OAUTH[p]["id"]), db.get_setting(OAUTH[p]["secret"])
    body = urllib.parse.urlencode({"code": code, "client_id": cid, "client_secret": secret,
                                   "redirect_uri": redirect_uri(p), "grant_type": "authorization_code"}).encode()
    try:
        req = urllib.request.Request(OAUTH[p]["token"], data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=15) as r:
            tok = json.loads(r.read())
    except Exception as e:  # noqa: BLE001
        log.warning("oauth token exchange failed (%s): %s", p, e)
        return _login_fail("provider")
    c = _claims(tok.get("id_token", ""))
    iss = c.get("iss", "")
    iss_ok = iss in ("https://accounts.google.com", "accounts.google.com") if p == "google" else \
        (iss.startswith("https://login.microsoftonline.com/") and iss.endswith("/v2.0"))
    if c.get("aud") != cid or not iss_ok or c.get("exp", 0) < time.time():
        return _login_fail("invalid")
    if p == "microsoft" and c.get("tid") != MS_CONSUMER_TENANT:
        return _login_fail("ms_personal")
    email = (c.get("email") or (c.get("preferred_username") if p == "microsoft" else "") or "").strip().lower()
    if p == "google" and not c.get("email_verified"):
        return _login_fail("unverified")
    if not email or not EMAIL_RE.fullmatch(email):
        return _login_fail("no_email")
    if core.release_unproven_email(email):
        log.warning("e-mail %s taken back from an unverified manual account", email)
    user = core.user_by_email(email)
    if not user:
        # a new e-mail gets its own clean, empty space
        if not signup_open() and email not in allowed_emails():
            log.warning("sign-up refused for %s via %s (signups closed)", email, p)
            return _login_fail("closed")
        user = core.create_user(email, c.get("name"), c.get("picture"), p)
        log.info("new user %s (%s) via %s", user["id"], email, p)
    elif user["disabled"]:
        return _login_fail("disabled")
    core.touch_user(user["id"], c.get("name"), c.get("picture"))
    resp = RedirectResponse("/", status_code=303)
    new_session(request, resp, f"{p}:{email}", {"email": email, "name": c.get("name"), "picture": c.get("picture")}, user["id"])
    resp.delete_cookie("g_oauth")
    return resp


@public.post("/logout")
def logout(request: Request, response: Response):
    s = request.cookies.get("g_sess")
    if s:
        db.x("DELETE FROM sessions WHERE token=?", (_h(s),))
    response.delete_cookie("g_sess")
    return {"ok": True}


# ---------- validation helpers ----------

def _title(t):
    t = (t or "").strip()
    if not t:
        raise HTTPException(400, "Başlık boş olamaz")
    return t[:300]


def _date(d):
    if d in (None, ""):
        return None
    if not DATE_RE.fullmatch(d):
        raise HTTPException(400, "Tarih YYYY-AA-GG olmalı")
    return d


def _time(t):
    if t in (None, ""):
        return None
    if not TIME_RE.fullmatch(t):
        raise HTTPException(400, "Saat SS:DD olmalı")
    return t


DT_RE = re.compile(r"(\d{4}-\d{2}-\d{2})[ T](([01]\d|2[0-3]):[0-5]\d)(:\d{2})?")


def _datetime(v):
    """'YYYY-MM-DD HH:MM' (also accepts the 'T' form from <input type=datetime-local>)."""
    if v in (None, ""):
        return None
    m = DT_RE.fullmatch(v)
    if not m:
        raise HTTPException(400, "Hatırlatma zamanı geçersiz")
    return f"{m.group(1)} {m.group(2)}"


def _steps(v):
    if not isinstance(v, list) or len(v) > 50:
        raise HTTPException(400, "Adımlar geçersiz (en fazla 50)")
    out = []
    for s in v:
        t = (s.get("t") if isinstance(s, dict) else "") or ""
        if t.strip():
            out.append({"t": t.strip()[:200], "d": bool(s.get("d"))})
    return out


def _days(n):
    if not isinstance(n, int) or not 1 <= n <= 127:
        raise HTTPException(400, "En az bir gün seçilmeli")
    return n


# ---------- today / items ----------

UI_KEYS = {"theme": "ui_theme", "mode": "ui_mode", "bg": "ui_bg"}
UI_RE = re.compile(r"[a-z0-9-]{1,30}")


def ui_prefs():
    return {k: db.uget(v) for k, v in UI_KEYS.items()}


@api.get("/rev")
async def rev():
    return {"rev": rev_of(db.uid()), "build": BUILD}


@api.get("/me")
def me(request: Request):
    u = request.state.user
    user = {"id": u["id"], "email": u["email"], "name": db.uget("profile_name") or u["name"], "picture": u["picture"],
            "is_owner": bool(u["is_owner"]), "method": "token", "created_at": u["created_at"]}
    s = request.cookies.get("g_sess")
    row = db.q1("SELECT picture, method, created_at FROM sessions WHERE token=?", (_h(s),)) if s else None
    if row:
        user.update(method=row["method"] or "şifre", created_at=row["created_at"], picture=row["picture"] or u["picture"])
    return {"ok": True, "today": core.today_s(), "ui": ui_prefs(), "user": user}


@api.get("/today")
def get_today():
    # "sort" = the order chosen for Günüm, so the extension shows the same order as the app
    return {**core.today(), "sort": json.loads(db.uget("list_sort") or "{}").get("today", "manual")}


class OrderIn(BaseModel):
    ids: list


class ContactIn(BaseModel):
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: str = ""


class ImportIn(BaseModel):
    text: str


class AssignIn(BaseModel):
    contact_id: Optional[int] = None
    mail: bool = True


class MailIn(BaseModel):
    provider: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None
    from_name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None


@api.get("/contacts")
def contacts():
    return {"items": people.contacts()}


@api.post("/contacts")
def add_contact(body: ContactIn):
    try:
        return people.save(None, body.model_dump())
    except ValueError as e:
        raise HTTPException(400, str(e))


@api.patch("/contacts/{cid}")
def edit_contact(cid: int, body: ContactIn):
    try:
        r = people.save(cid, body.model_dump())
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not r:
        raise HTTPException(404, "Kişi bulunamadı")
    return r


@api.delete("/contacts/{cid}")
def del_contact(cid: int):
    if not people.delete(cid):
        raise HTTPException(404, "Kişi bulunamadı")
    return {"ok": True}


@api.post("/contacts/import")
def import_contacts(body: ImportIn):
    if len(body.text) > 3_200_000:
        raise HTTPException(413, "Dosya çok büyük (en fazla 3 MB)")
    r = people.import_text(body.text)
    if not (r["added"] or r["updated"]):
        raise HTTPException(400, "Dosyada kişi bulunamadı — Google / Outlook kişiler .csv ya da .vcf dosyası seç")
    return r


@api.get("/contacts/export")
def export_contacts(fmt: str = "vcf"):
    content, mt, name = people.export(fmt if fmt in ("vcf", "google", "outlook") else "vcf")
    return Response(content.encode("utf-8"), media_type=mt + "; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@api.post("/tasks/{tid}/assign")
def assign_task(tid: int, body: AssignIn):
    try:
        r = people.assign(tid, body.contact_id, body.mail)
    except LookupError as e:
        raise HTTPException(404, str(e))
    if not r:
        raise HTTPException(404, "Görev bulunamadı")
    return r


@api.get("/mail/settings")
def mail_settings():
    return people.mail_public()


@api.patch("/mail/settings")
def set_mail_settings(body: MailIn):
    if body.port is not None and not 1 <= body.port <= 65535:
        raise HTTPException(400, "Port geçersiz")
    if body.user and not people.EMAIL_RE.match(body.user.strip()):
        raise HTTPException(400, "Mail adresi geçersiz")
    return people.set_mail(body.model_dump())


@api.post("/mail/test")
def mail_test():
    try:
        people.test_mail()
    except people.MailError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@api.post("/assigned/claim")
def claim_assigned(request: Request, response: Response):
    tok = request.cookies.get("g_claim")
    response.delete_cookie("g_claim", path="/")
    if not tok:
        return {"ok": False}
    tid, how = people.claim(tok, db.uid())
    if how == "gone":
        return {"ok": False, "gone": True}
    return {"ok": True, "how": how, "item": core.task_item(core._task(tid))}


def _copy_done(tid):
    """A task assigned to this user was closed: the assigner's original closes too (they get a push + mail)."""
    owner = people.copy_done(tid)
    if owner:
        REV[owner] = REV.get(owner, 0) + 1


@api.get("/leftovers")
def leftovers():
    return core.leftovers()


@api.post("/leftovers/{item_id}/hide")
def hide_leftover(item_id: str):
    core.hide_leftover(item_id[:20])
    return {"ok": True}


@api.post("/today/order")
def today_order(body: OrderIn):
    core.set_today_order([i for i in body.ids if isinstance(i, str) and core.ID_RE.fullmatch(i)])
    return {"ok": True}


@api.post("/tasks/order")
def tasks_order(body: OrderIn):
    core.set_task_order([i for i in body.ids if isinstance(i, int)])
    return {"ok": True}


@api.get("/weather")
def get_weather():
    return {"weather": weather.current()}


class CityIn(BaseModel):
    name: str


@api.post("/weather/city")
def set_weather_city(body: CityIn):
    name = " ".join(body.name.split())[:60]
    if not name:
        raise HTTPException(400, "Şehir adı yaz")
    try:
        c = weather.set_city(name)
    except Exception:  # noqa: BLE001
        raise HTTPException(502, "Hava durumu servisine ulaşılamadı") from None
    if not c:
        raise HTTPException(404, f'"{name}" bulunamadı')
    return {"city": c, "weather": weather.current()}


class ToggleIn(BaseModel):
    done: bool


@api.post("/items/{item_id}/done")
def toggle(item_id: str, body: ToggleIn, request: Request):
    if not core.set_done(item_id, body.done, source_of(request)):
        raise HTTPException(404, "Bulunamadı")
    if body.done and item_id.startswith("t") and item_id[1:].isdigit():
        _copy_done(int(item_id[1:]))
    return {"ok": True}


# ---------- tasks ----------

class TaskIn(BaseModel):
    title: str
    notes: str = ""
    due_date: Optional[str] = None
    important: bool = False
    my_day: bool = False
    list_id: Optional[int] = None
    remind_at: Optional[str] = None


class TaskPatch(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None
    important: Optional[bool] = None
    my_day: Optional[bool] = None
    done: Optional[bool] = None
    list_id: Optional[int] = None
    steps: Optional[list] = None
    remind_at: Optional[str] = None
    pinned: Optional[bool] = None


@api.get("/tasks")
def tasks(done: bool = False, list: Optional[int] = None):  # noqa: A002 - query name
    return {"items": core.list_tasks(done, list)}


@api.post("/tasks")
def add_task(body: TaskIn):
    return core.create_task(_title(body.title), body.notes[:5000], _date(body.due_date), body.important, body.my_day,
                            body.list_id, _datetime(body.remind_at))


class RecurIn(BaseModel):
    kind: str                       # weekly | monthly | dates
    days: Optional[int] = None      # weekly: Mon = bit 0
    month_day: Optional[int] = None  # monthly: 1..31 (31 = last day)
    dates: Optional[list] = None    # dates: ["YYYY-MM-DD", ...]
    time: Optional[str] = None


@api.post("/tasks/{tid}/recur")
def task_recur(tid: int, body: RecurIn):
    rule = {"kind": body.kind, "time": _time(body.time)}
    if body.kind == "weekly":
        rule["days"] = _days(body.days)
    elif body.kind == "monthly":
        if not isinstance(body.month_day, int) or not 1 <= body.month_day <= 31:
            raise HTTPException(400, "Ayın günü 1–31 olmalı")
        rule["month_day"] = body.month_day
    elif body.kind == "dates":
        dates = sorted({_date(str(d)) for d in (body.dates or []) if d})
        if not dates or len(dates) > 100:
            raise HTTPException(400, "1–100 tarih seç")
        rule["dates"] = dates
    else:
        raise HTTPException(400, "Geçersiz tekrar türü")
    r = core.task_recur(tid, rule)
    if not r:
        raise HTTPException(404, "Görev bulunamadı")
    return r


class OnceIn(BaseModel):
    date: str  # the one day the task comes into Günüm (today or later)


@api.post("/routines/{rid}/once")
def routine_once(rid: int, body: OnceIn):
    d = _date(body.date)
    if d < core.today_s():
        raise HTTPException(400, "Geçmiş bir gün seçilemez")
    r = core.routine_once(rid, d)
    if not r:
        raise HTTPException(404, "Rutin bulunamadı")
    return r


@api.get("/once")
def once_tasks():
    return {"items": core.once_tasks()}


@api.post("/tasks/{tid}/once")
def task_once(tid: int, body: OnceIn):
    d = _date(body.date)
    if d < core.today_s():
        raise HTTPException(400, "Geçmiş bir gün seçilemez")
    r = core.task_once(tid, d)
    if not r:
        raise HTTPException(404, "Görev bulunamadı")
    return r


class WeeklyIn(BaseModel):
    day: int  # 0 = Monday … 6 = Sunday


@api.post("/tasks/{tid}/weekly")
def task_weekly(tid: int, body: WeeklyIn):
    if not 0 <= body.day <= 6:
        raise HTTPException(400, "Gün 0–6 olmalı")
    r = core.task_to_weekly(tid, body.day)
    if not r:
        raise HTTPException(404, "Görev bulunamadı")
    return r


@api.post("/tasks/{tid}/restore")
def restore_task(tid: int):
    core.restore_task(tid)
    return {"ok": True}


@api.get("/undo/state")
def undo_state(request: Request):
    return undo.state(request.state.user["id"])


@api.post("/undo")
def undo_step(request: Request):
    return {"ok": undo.step(request.state.user["id"]), **undo.state(request.state.user["id"])}


@api.post("/redo")
def redo_step(request: Request):
    return {"ok": undo.step(request.state.user["id"], redo=True), **undo.state(request.state.user["id"])}


@api.get("/report")
def get_report(start: str, end: str, bucket: Optional[str] = None):
    try:
        datetime.strptime(start, "%Y-%m-%d"); datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Geçersiz tarih")
    return report.report(start, end, bucket)


@api.get("/upcoming")
def upcoming(range: str = "w1"):
    if range not in core.UPCOMING_DAYS:
        raise HTTPException(400, "Geçersiz aralık")
    return core.upcoming(range)


@api.get("/search")
def search(q: str = ""):
    return core.search(q[:100])


@api.get("/export")
def export():
    name = f"gunluk-verilerim-{core.today_s()}.json"
    return JSONResponse(core.export_all(), headers={"Content-Disposition": f'attachment; filename="{name}"'})


@api.get("/extension.zip")
def extension_zip():
    """The Chrome/Edge extension, ready for this user: server address and personal token are written into it,
    so any PC only has to unzip it and 'Load unpacked' (no folder to copy around, no token to paste)."""
    return _extension_zip(db.uget("api_token"))


@api.get("/extension/token")
def extension_token():
    """For the extension's script on this site: a signed-in visitor's extension connects to their account by itself."""
    return {"token": db.uget("api_token")}


@app.get("/kur/gunluk-eklenti.zip")
def extension_zip_default():
    """The extension for anyone (install page before sign-in): it connects itself once you sign in on the site."""
    return _extension_zip("")


def _extension_zip(token):
    src = db.BASE / "extension"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(src.iterdir()):
            if not f.is_file():
                continue
            data = f.read_bytes()
            if f.name == "common.js":
                js = data.decode("utf-8")
                js = js.replace("const DEFAULT_BASE = 'http://localhost:8430';", f"const DEFAULT_BASE = {json.dumps(PUBLIC_URL)};")
                js = js.replace("const PRESET_TOKEN = '';", f"const PRESET_TOKEN = {json.dumps(token or '')};")
                data = js.encode("utf-8")
            elif f.name == "manifest.json":
                m = json.loads(data)
                hosts = sorted(set(m["host_permissions"]) | {PUBLIC_URL.split("://")[0] + "://" + PUBLIC_URL.split("://")[1].split("/")[0].split(":")[0] + "/*"})
                m["host_permissions"] = m["content_scripts"][0]["matches"] = hosts
                data = json.dumps(m, indent=2, ensure_ascii=False).encode("utf-8")
            z.writestr(f"gunluk-eklenti/{f.name}", data)
    return Response(buf.getvalue(), media_type="application/zip",
                       headers={"Content-Disposition": 'attachment; filename="gunluk-eklenti.zip"'})


class RepeatIn(BaseModel):
    days: int
    time: Optional[str] = None


@api.post("/tasks/{tid}/repeat")
def repeat_task(tid: int, body: RepeatIn):
    r = core.task_to_routine(tid, _days(body.days), _time(body.time))
    if not r:
        raise HTTPException(404, "Görev bulunamadı")
    return r


# ---------- folders ----------

class ListIn(BaseModel):
    name: str
    kind: str = "list"                # list | group (ana liste)
    parent_id: Optional[int] = None   # group to put a new list in


class ParentIn(BaseModel):
    parent_id: Optional[int] = None


@api.get("/lists")
def lists():
    return {"items": core.get_lists()}


@api.get("/sidebar")
def sidebar():
    """Everything the sidebar needs in one request: lists, weekly-routine count per weekday, open items today."""
    counts = [0] * 7
    monthly = []  # "ayda bir" routines: their list cards and Günüm cards get the yellow frame + "!" (client side, by title)
    recurring = []  # every active routine: the card's "Tekrarla" button stays green
    for r in core.list_routines():
        if r["active"]:
            recurring.append(r["title"])
        if r["kind"] == "weekly" and r["active"]:
            for i in range(7):
                counts[i] += bool(r["days"] & (1 << i))
        elif r["kind"] == "monthly" and r["active"] and r["month_day"]:
            monthly.append({"title": r["title"], "month_day": r["month_day"]})
    week_end = (date.fromisoformat(core.today_s()) + timedelta(days=6)).isoformat()
    for t in core.once_tasks():
        if t["once"] <= week_end:
            counts[date.fromisoformat(t["once"]).weekday()] += 1
    return {"lists": core.get_lists(), "day_counts": counts, "list_sort": json.loads(db.uget("list_sort") or "{}"),
            "monthly": monthly, "recurring": recurring,
            "today_open": sum(1 for i in core.today()["items"] if not i["done"])}


@api.post("/lists")
def add_list(body: ListIn):
    if body.kind not in ("list", "group"):
        raise HTTPException(400, "Geçersiz liste türü")
    return core.create_list(_title(body.name)[:60], body.kind, body.parent_id)


class ListOrderIn(BaseModel):
    ids: list
    parent_id: Optional[int] = None


@api.post("/lists/order")
def lists_order(body: ListOrderIn):
    core.order_lists([i for i in body.ids if isinstance(i, int)], body.parent_id)
    return {"items": core.get_lists()}


@api.post("/lists/{lid}/parent")
def move_list(lid: int, body: ParentIn):
    r = core.move_list(lid, body.parent_id)
    if not r:
        raise HTTPException(404, "Liste bulunamadı")
    return r


@api.patch("/lists/{lid}")
def patch_list(lid: int, body: ListIn):
    r = core.rename_list(lid, _title(body.name)[:60])
    if not r:
        raise HTTPException(404, "Liste bulunamadı")
    return r


@api.post("/lists/{lid}/duplicate")
def dup_list(lid: int):
    r = core.duplicate_list(lid)
    if not r:
        raise HTTPException(404, "Liste bulunamadı")
    return r


@api.post("/lists/{lid}/myday")
def list_my_day(lid: int):
    """lid 0 = Genel."""
    if lid and not db.q1("SELECT 1 FROM lists WHERE id=? AND user_id=?", (lid, db.uid())):
        raise HTTPException(404, "Liste bulunamadı")
    return {"updated": core.list_to_my_day(lid)}


class ScheduleIn(BaseModel):
    due_date: str
    my_day: bool = False


@api.post("/lists/{lid}/schedule")
def schedule_list(lid: int, body: ScheduleIn):
    """lid 0 = Genel."""
    d = _date(body.due_date)
    if not d:
        raise HTTPException(400, "Tarih gerekli")
    if lid and not db.q1("SELECT 1 FROM lists WHERE id=? AND user_id=?", (lid, db.uid())):
        raise HTTPException(404, "Liste bulunamadı")
    return {"updated": core.schedule_list(lid, d, body.my_day)}


@api.delete("/lists/{lid}")
def del_list(lid: int):
    core.delete_list(lid)
    return {"ok": True}


@api.patch("/tasks/{tid}")
def patch_task(tid: int, body: TaskPatch, request: Request):
    f = body.model_dump(exclude_unset=True)
    if "title" in f:
        f["title"] = _title(f["title"])
    if "due_date" in f:
        f["due_date"] = _date(f["due_date"])
    if "notes" in f:
        f["notes"] = (f["notes"] or "")[:5000]
    if "steps" in f:
        f["steps"] = _steps(f["steps"] or [])
    if "remind_at" in f:
        f["remind_at"] = _datetime(f["remind_at"])
    f["source"] = source_of(request)
    t = core.update_task(tid, f)
    if not t:
        raise HTTPException(404, "Görev bulunamadı")
    if f.get("done"):
        _copy_done(tid)
    return t


@api.delete("/tasks/{tid}")
def del_task(tid: int):
    core.delete_task(tid)
    return {"ok": True}


# ---------- routines ----------

class RoutineIn(BaseModel):
    title: str
    days: int = core.ALL_DAYS
    time: Optional[str] = None


class RoutinePatch(BaseModel):
    title: Optional[str] = None
    days: Optional[int] = None
    time: Optional[str] = None
    active: Optional[bool] = None
    pinned: Optional[bool] = None
    important: Optional[bool] = None


@api.get("/routines")
def routines():
    return {"items": core.list_routines()}


@api.post("/routines")
def add_routine(body: RoutineIn):
    return core.create_routine(_title(body.title), _days(body.days), _time(body.time))


@api.patch("/routines/{rid}")
def patch_routine(rid: int, body: RoutinePatch):
    f = body.model_dump(exclude_unset=True)
    if "title" in f:
        f["title"] = _title(f["title"])
    if "days" in f:
        f["days"] = _days(f["days"])
    if "time" in f:
        f["time"] = _time(f["time"])
    r = core.update_routine(rid, f)
    if not r:
        raise HTTPException(404, "Rutin bulunamadı")
    return r


@api.delete("/routines/{rid}")
def del_routine(rid: int):
    core.delete_routine(rid)
    return {"ok": True}


# ---------- history ----------

@api.get("/history")
def history(month: str):
    if not re.fullmatch(r"\d{4}-\d{2}", month):
        raise HTTPException(400, "Ay YYYY-AA olmalı")
    return {"month": month, "days": core.history_month(month)}


@api.get("/history/day")
def history_day(date: str):
    return core.history_day(_date(date) or core.today_s())


@api.get("/stats")
def stats():
    return core.stats()


# ---------- settings / push ----------

@api.get("/settings")
def get_settings(request: Request):
    out = {"morning_time": db.uget("morning_time"), "item_alerts": db.uget("item_alerts") == "1",
           "api_token": db.uget("api_token"), "vapid_public": push.public_key(),
           "push_count": db.q1("SELECT COUNT(*) n FROM push_subs WHERE user_id=?", (db.uid(),))["n"],
           "ui": ui_prefs(),
           "profile_name": db.uget("profile_name") or "",
           "weather_city": weather.city(),
           "nudge": {**core.nudge_settings(), "schedule": core.nudge_schedule()},
           "is_owner": bool(request.state.user["is_owner"])}
    u = core.get_user(db.uid())
    out["account"] = {"username": u["username"], "email": u["email"], "phone": u["phone"],
                      "has_password": bool(u["password_hash"]), "provider": u["provider"]}
    if out["is_owner"]:  # sign-in keys, password, backups and users are the owner's business only
        out.update({
            "auth": {"allowed": allowed_emails(), "signup_open": signup_open(),
                     **{p: {"client_id": db.get_setting(c["id"]) or "", "secret_set": bool(db.get_setting(c["secret"])),
                            "ready": oauth_ready(p), "redirect_uri": redirect_uri(p)} for p, c in OAUTH.items()}},
            "users": core.list_users(),
            "last_backup": db.get_setting("last_backup"),
            "backup_count": len(list(db.BACKUPS.glob("gunluk-*.db"))) if db.BACKUPS.exists() else 0})
    return out


SORT_MODES = ("manual", "important", "alpha", "due", "created", "oldest")


class SettingsPatch(BaseModel):
    morning_time: Optional[str] = None
    item_alerts: Optional[bool] = None
    ui: Optional[dict] = None
    nudge: Optional[dict] = None
    auth: Optional[dict] = None
    profile_name: Optional[str] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None
    list_sort: Optional[dict] = None  # {"list": <id, 0 = Genel, "today" = Günüm>, "mode": manual|important|alpha|due|created|oldest}


def _save_auth(a):
    """auth = {allowed: [emails], google: {client_id, client_secret}, microsoft: {...}}; an empty secret keeps the old one."""
    if "allowed" in a:
        if not isinstance(a["allowed"], list) or len(a["allowed"]) > 20:
            raise HTTPException(400, "En fazla 20 e-posta")
        emails = sorted({str(e).strip().lower() for e in a["allowed"] if str(e).strip()})
        bad = [e for e in emails if not EMAIL_RE.fullmatch(e)]
        if bad:
            raise HTTPException(400, f"Geçersiz e-posta: {bad[0]}")
        db.set_setting("allowed_emails", json.dumps(emails))
    if "signup_open" in a:
        db.set_setting("signup_open", "1" if a["signup_open"] else "0")
    for p, c in OAUTH.items():
        v = a.get(p)
        if not isinstance(v, dict):
            continue
        if "client_id" in v:
            db.set_setting(c["id"], str(v["client_id"] or "").strip()[:300])
        if v.get("client_secret"):
            db.set_setting(c["secret"], str(v["client_secret"]).strip()[:300])
        if v.get("clear"):
            db.set_setting(c["id"], "")
            db.set_setting(c["secret"], "")


def _save_nudge(n):
    start = _time(n["start"]) if "start" in n else db.uget("nudge_start", "09:00")
    end = _time(n["end"]) if "end" in n else db.uget("nudge_end", "21:00")
    if not start or not end or end <= start:
        raise HTTPException(400, "Bitiş saati başlangıçtan sonra olmalı")
    # validate everything first, then write, so a bad field never leaves a half-saved setting
    if "mode" in n and n["mode"] not in ("off", "times", "count"):
        raise HTTPException(400, "Geçersiz hatırlatma türü")
    times = None
    if "times" in n:
        if not isinstance(n["times"], list) or len(n["times"]) > 24:
            raise HTTPException(400, "En fazla 24 saat seçilebilir")
        times = sorted({_time(t) for t in n["times"] if t})
    if "count" in n and (not isinstance(n["count"], int) or not 1 <= n["count"] <= 24):
        raise HTTPException(400, "Günde 1–24 kez seçilebilir")
    if "mode" in n:
        db.uset("nudge_mode", n["mode"])
    if times is not None:
        db.uset("nudge_times", json.dumps(times))
    if "count" in n:
        db.uset("nudge_count", str(n["count"]))
    db.uset("nudge_start", start)
    db.uset("nudge_end", end)


@api.patch("/settings")
def patch_settings(body: SettingsPatch, request: Request):
    if body.auth is not None and not request.state.user["is_owner"]:
        raise HTTPException(403, "Bu ayar sadece hesap sahibine açık")
    if body.profile_name is not None:
        db.uset("profile_name", " ".join(body.profile_name.split())[:60])
    if body.auth is not None:
        _save_auth(body.auth)
    if body.nudge is not None:
        _save_nudge(body.nudge)
    for k, v in (body.ui or {}).items():
        if k in UI_KEYS:
            if not isinstance(v, str) or not UI_RE.fullmatch(v):
                raise HTTPException(400, "Geçersiz tema seçimi")
            db.uset(UI_KEYS[k], v)
    if body.morning_time is not None:
        db.uset("morning_time", _time(body.morning_time) or "07:00")
    if body.item_alerts is not None:
        db.uset("item_alerts", "1" if body.item_alerts else "0")
    if body.list_sort is not None:
        lid, mode = body.list_sort.get("list"), body.list_sort.get("mode")  # list: id, 0 = Genel, "today" = Günüm
        if not (lid == "today" or (isinstance(lid, int) and not isinstance(lid, bool) and lid >= 0)) or mode not in SORT_MODES:
            raise HTTPException(400, "Geçersiz sıralama")
        if lid and lid != "today" and not db.q1("SELECT 1 FROM lists WHERE id=? AND user_id=?", (lid, db.uid())):
            raise HTTPException(404, "Liste bulunamadı")
        sorts = json.loads(db.uget("list_sort") or "{}")
        if mode == "manual":
            sorts.pop(str(lid), None)
        else:
            sorts[str(lid)] = mode
        db.uset("list_sort", json.dumps(sorts))
    if body.new_password is not None:
        # an account that already has a password must prove it; a Google account may add one (then e-mail + password works too)
        u = core.get_user(db.uid())
        if u["password_hash"] and not core.check_user_password(u, body.old_password or ""):
            raise HTTPException(400, "Mevcut şifre yanlış")
        if not 6 <= len(body.new_password) <= 200:
            raise HTTPException(400, "Yeni şifre en az 6 karakter olmalı")
        core.set_user_password(u["id"], body.new_password)
        _revoke_others(request)
    return get_settings(request)


def _device(ua):
    """'[google:x@y] Mozilla/5.0 (iPhone; …) … Safari/…' → ('iPhone · Safari', 'Google')."""
    how = {"google": "Google", "microsoft": "Microsoft", "şifre": "Şifre"}.get(ua[1:ua.find("]")].split(":")[0], "Şifre") \
        if ua.startswith("[") else "Şifre"
    os_ = next((n for k, n in (("iPhone", "iPhone"), ("iPad", "iPad"), ("Android", "Android"), ("Windows", "Windows"),
                                ("Mac OS", "Mac"), ("Linux", "Linux")) if k in ua), "Bilinmeyen cihaz")
    br = next((n for k, n in (("Edg/", "Edge"), ("OPR/", "Opera"), ("Firefox/", "Firefox"), ("CriOS", "Chrome"),
                               ("Chrome/", "Chrome"), ("Safari/", "Safari"), ("curl", "curl")) if k in ua), "")
    return f"{os_} · {br}" if br else os_, how


@api.get("/sessions")
def sessions(request: Request):
    """The devices signed in to this account (cookie sessions; the API token is separate)."""
    cur = _h(request.cookies.get("g_sess") or "-")
    out = []
    for r in db.q("SELECT token, created_at, last_seen, ua FROM sessions WHERE user_id=? ORDER BY COALESCE(last_seen, created_at) DESC",
                  (db.uid(),)):
        device, how = _device(r["ua"] or "")
        out.append({"id": r["token"][:16], "device": device, "how": how, "created_at": r["created_at"] or "",
                    "last_seen": r["last_seen"], "current": r["token"] == cur})
    return {"sessions": out}


@api.delete("/sessions/{sid}")
def end_session(sid: str):
    if not re.fullmatch(r"[0-9a-f]{16}", sid):
        raise HTTPException(404, "Oturum bulunamadı")
    if not db.x("DELETE FROM sessions WHERE user_id=? AND substr(token,1,16)=?", (db.uid(), sid)):
        raise HTTPException(404, "Oturum bulunamadı")
    return {"ok": True}


def _revoke_others(request: Request):
    return db.x("DELETE FROM sessions WHERE user_id=? AND token<>?", (db.uid(), _h(request.cookies.get("g_sess") or "-")))


@api.post("/sessions/revoke-others")
def revoke_others(request: Request):
    return {"ended": _revoke_others(request)}


@api.post("/settings/token")
def rotate_token(request: Request):
    db.uset("api_token", secrets.token_urlsafe(24))
    return get_settings(request)


# Web Push services of Chrome/Edge/Android (FCM), Firefox, Windows (WNS) and Safari/iOS
PUSH_HOSTS = ("fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com", "push.apple.com")


@api.post("/push/subscribe")
async def push_subscribe(request: Request):
    sub = await request.json()
    if not isinstance(sub, dict) or not sub.get("endpoint") or not isinstance(sub.get("keys"), dict):
        raise HTTPException(400, "Geçersiz abonelik")
    u = urllib.parse.urlparse(str(sub["endpoint"]))
    host = (u.hostname or "").lower()
    if u.scheme != "https" or len(sub["endpoint"]) > 1000 or not any(host == d or host.endswith("." + d) for d in PUSH_HOSTS):
        raise HTTPException(400, "Geçersiz bildirim adresi")
    if not all(isinstance(sub["keys"].get(k), str) and 0 < len(sub["keys"][k]) < 200 for k in ("p256dh", "auth")):
        raise HTTPException(400, "Geçersiz abonelik")
    sub = {"endpoint": sub["endpoint"], "expirationTime": sub.get("expirationTime") if isinstance(sub.get("expirationTime"), int) else None,
           "keys": {"p256dh": sub["keys"]["p256dh"], "auth": sub["keys"]["auth"]}}
    if db.q1("SELECT COUNT(*) n FROM push_subs WHERE user_id=?", (db.uid(),))["n"] >= 20:
        db.x("""DELETE FROM push_subs WHERE endpoint IN (SELECT endpoint FROM push_subs WHERE user_id=?
                ORDER BY created_at LIMIT 1)""", (db.uid(),))
    db.x("INSERT OR REPLACE INTO push_subs(endpoint,data,created_at,user_id) VALUES(?,?,?,?)",
         (sub["endpoint"], json.dumps(sub), core.now_s(), db.uid()))
    return {"ok": True}


@api.post("/push/test")
def push_test():
    n = push.send_all("Günlük", "Bildirimler çalışıyor ✅", "/", "test", user_id=db.uid())
    return {"sent": n}


class UserPatch(BaseModel):
    disabled: bool


@api.patch("/users/{user_id}", dependencies=[Depends(owner_only)])
def patch_user(user_id: int, body: UserPatch):
    """Owner: close or reopen someone's account (their data stays)."""
    u = core.get_user(user_id)
    if not u:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if u["is_owner"]:
        raise HTTPException(400, "Hesap sahibi kapatılamaz")
    db.x("UPDATE users SET disabled=? WHERE id=?", (1 if body.disabled else 0, user_id))
    if body.disabled:
        db.x("DELETE FROM sessions WHERE user_id=?", (user_id,))
    return {"users": core.list_users()}


# ---------- iPhone Shortcuts sync ----------

@api.get("/sync/today")
def sync_today(peek: bool = False, resend: bool = False):
    return core.sync_export(peek, resend)


@api.post("/sync/done")
async def sync_done(request: Request):
    raw = (await request.body()).decode("utf-8", "replace")
    try:
        body = json.loads(raw)
        if isinstance(body, dict):
            raw = " ".join(str(v) for v in body.values())
        elif isinstance(body, list):
            raw = " ".join(str(v) for v in body)
    except ValueError:
        pass  # plain text body is fine too
    return core.sync_done(raw)


@api.get("/sync/state")
def sync_state():
    return core.sync_state()


# ---------- the assignee's task page (links in the assignment mail; no sign-in, the link is the key) ----------
def _assigned(token):
    found = people.by_token(token)
    if found:
        db.CUR_UID.set(found[0]["user_id"])  # the owner's name and mail settings
    return found


@app.get("/a/{token}")
def assigned_page(token: str, bitti: int = 0, ok: int = 0):
    found = _assigned(token)
    if not found:
        return HTMLResponse(people.page("Görev bulunamadı", '<div class="card"><h1>Bu bağlantı artık geçerli değil</h1>'
                            '<p class="muted">Görev silinmiş ya da başka birine atanmış olabilir.</p></div>'), 404)
    return HTMLResponse(people.public_page(*found, ask_done=bool(bitti), just_done=bool(ok)),
                        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


@app.get("/a/{token}/giris")
def assigned_to_app(token: str, request: Request):
    if not people.by_token(token):
        return HTMLResponse(people.page("Görev bulunamadı", '<div class="card"><h1>Bu bağlantı artık geçerli değil</h1>'
                            '<p class="muted">Görev silinmiş ya da başka birine atanmış olabilir.</p></div>'), 404)
    r = RedirectResponse("/", status_code=303)
    r.set_cookie("g_claim", token, max_age=7 * 86400, samesite="lax", path="/",
                 secure=request.headers.get("x-forwarded-proto", request.url.scheme) == "https")
    return r


@app.post("/a/{token}/bitti")
def assigned_done(token: str, request: Request):
    same_site_only(request)
    found = _assigned(token)
    if not found:
        raise HTTPException(404, "Görev bulunamadı")
    people.public_done(*found)
    uid = found[0]["user_id"]
    REV[uid] = REV.get(uid, 0) + 1  # the owner's open app refreshes
    return RedirectResponse(f"/a/{token}?ok=1", status_code=303)


app.include_router(public)
app.include_router(api)
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")
