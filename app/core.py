"""Business logic: tasks, routines, daily items, history, Reminders sync.
Multi-user: every query is scoped to the current user (db.uid()); access by id also checks ownership."""
import calendar
import hashlib
import json
import re
import secrets
from datetime import date, datetime, timedelta

from .db import ins, q, q1, uget, uid, uset, x

ALL_DAYS = 127
# "#gr12#" = day item 12, "#gt5#" = task 5. Trailing '#' keeps #gr1# from matching #gr12#.
TAG_RE = re.compile(r"#g([rt])(\d+)#")
ID_RE = re.compile(r"([rt])(\d+)")


def now_s():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def today_s():
    return date.today().isoformat()


def day_bit(d):
    return 1 << date.fromisoformat(d).weekday()  # Monday = bit 0


# ---------- users ----------

def get_user(user_id):
    return q1("SELECT * FROM users WHERE id=?", (user_id,))


def user_by_email(email):
    return q1("SELECT * FROM users WHERE email=?", ((email or "").strip().lower(),))


def owner():
    return q1("SELECT * FROM users WHERE is_owner=1 ORDER BY id LIMIT 1")


def _maybe_owner(user_id, email):
    """Fresh install: the first account with the OWNER_EMAIL address becomes the owner (yönetici)."""
    from .db import OWNER_EMAIL_DEFAULT
    e = (email or "").strip().lower()
    if OWNER_EMAIL_DEFAULT and e == OWNER_EMAIL_DEFAULT and not q1("SELECT 1 FROM users WHERE is_owner=1"):
        x("UPDATE users SET is_owner=1 WHERE id=?", (user_id,))


def create_user(email, name=None, picture=None, provider=None):
    """A brand-new account starts with a clean, empty space (no tasks, lists or routines)."""
    user_id = ins("INSERT INTO users(email,name,picture,provider,created_at,last_login) VALUES(?,?,?,?,?,?)",
                  (email.strip().lower(), name, picture, provider, now_s(), now_s()))
    _maybe_owner(user_id, email)
    ensure_user_defaults(user_id)
    return get_user(user_id)


def touch_user(user_id, name=None, picture=None):
    x("UPDATE users SET last_login=?, name=COALESCE(name, ?), picture=COALESCE(?, picture) WHERE id=?",
      (now_s(), name, picture, user_id))


def list_users():
    return q("""SELECT u.id, u.email, u.name, u.provider, u.username, u.phone, u.is_owner, u.disabled, u.created_at, u.last_login,
                  (SELECT COUNT(*) FROM tasks t WHERE t.user_id=u.id AND t.deleted=0) tasks
                FROM users u ORDER BY u.is_owner DESC, u.id""")


def active_user_ids():
    return [r["id"] for r in q("SELECT id FROM users WHERE disabled=0")]


def user_by_token(tok):
    if not tok:
        return None
    r = q1("SELECT user_id FROM user_settings WHERE key='api_token' AND value=?", (tok,))
    return r["user_id"] if r else None


# ---------- manual accounts (username / e-mail / phone + password) ----------
USERNAME_RE = re.compile(r"(?=.*[a-z])[a-z0-9._]{3,30}")  # needs a letter, so it never looks like a phone number


def norm_phone(s):
    """Any spelling of a Turkish mobile (0532…, +90 532…, 532 123 45 67) → 5321234567; other numbers: digits only."""
    d = re.sub(r"\D", "", s or "")
    if len(d) == 12 and d.startswith("90"):
        d = d[2:]
    elif len(d) == 11 and d.startswith("0"):
        d = d[1:]
    return d


def make_password(pw):
    salt = secrets.token_hex(16)
    return f"{salt}${_hash_pw(pw, salt)}"


def check_user_password(user, pw):
    stored = (user or {}).get("password_hash")
    if not stored or not pw:
        _hash_pw(pw or "x", "00" * 16)  # same work either way, so timing does not tell which accounts exist
        return False
    salt, h = stored.split("$", 1)
    return secrets.compare_digest(_hash_pw(pw, salt), h)


def set_user_password(user_id, pw):
    x("UPDATE users SET password_hash=? WHERE id=?", (make_password(pw), user_id))


def user_by_login(login):
    """The sign-in box takes a username, an e-mail or a phone number."""
    s = (login or "").strip().lower()
    if not s:
        return None
    if "@" in s:
        return user_by_email(s)
    if re.fullmatch(r"[\d\s()+\-.]+", s):
        p = norm_phone(s)
        return q1("SELECT * FROM users WHERE phone=?", (p,)) if p else None
    return q1("SELECT * FROM users WHERE username=?", (s,))


def create_local_user(name, username, email, phone, password):
    """Sign-up without Google: a clean, empty space like every new account. The e-mail is unproven (email_verified=0)."""
    user_id = ins("""INSERT INTO users(email,name,provider,username,phone,password_hash,email_verified,created_at,last_login)
                     VALUES(?,?,?,?,?,?,0,?,?)""",
                  (email or None, name, "manuel", username, phone or None, make_password(password), now_s(), now_s()))
    _maybe_owner(user_id, email)
    ensure_user_defaults(user_id)
    return get_user(user_id)


def release_unproven_email(email):
    """Google/Microsoft proved this e-mail belongs to the person signing in: a manual account that only typed it in
    loses it (it keeps its username/phone sign-in), so nobody can claim someone else's e-mail to see their tasks."""
    return x("UPDATE users SET email=NULL WHERE email=? AND email_verified=0", ((email or "").strip().lower(),))


def _hash_pw(pw, salt):
    return hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex()


def ensure_user_defaults(user_id):
    if not uget("api_token", user_id=user_id):
        uset("api_token", secrets.token_urlsafe(24), user_id=user_id)
    if not uget("morning_time", user_id=user_id):
        uset("morning_time", "07:00", user_id=user_id)
    if uget("item_alerts", user_id=user_id) is None:
        uset("item_alerts", "1", user_id=user_id)


def ensure_defaults():
    for user_id in [r["id"] for r in q("SELECT id FROM users")]:
        ensure_user_defaults(user_id)
    # tasks from before manual ordering get a position matching the old automatic order
    rows = q("""SELECT id FROM tasks WHERE position IS NULL
                ORDER BY important DESC, COALESCE(due_date,'9999'), id DESC""")
    if rows:
        top = q1("SELECT COALESCE(MAX(position), -1) m FROM tasks")["m"]
        for i, r in enumerate(rows, 1):
            x("UPDATE tasks SET position=? WHERE id=?", (top + i, r["id"]))


# ---------- day-long reminder schedule ("Gün içi hatırlatmalar") ----------

def nudge_settings():
    return {"mode": uget("nudge_mode", "off"),
            "times": json.loads(uget("nudge_times", '["09:00","13:00","18:00"]')),
            "count": int(uget("nudge_count", "4")),
            "start": uget("nudge_start", "09:00"),
            "end": uget("nudge_end", "21:00")}


def nudge_schedule(ns=None):
    """HH:MM list when the open-task reminder fires today."""
    ns = ns or nudge_settings()
    if ns["mode"] == "times":
        return sorted(set(ns["times"]))
    if ns["mode"] != "count":
        return []
    to_min = lambda s: int(s[:2]) * 60 + int(s[3:])  # noqa: E731
    a, b, n = to_min(ns["start"]), to_min(ns["end"]), ns["count"]
    if n <= 1 or b <= a:
        return [ns["start"]]
    # spread evenly, rounded to 5 minutes so times read naturally (11:25, not 11:24)
    mins = {min(b, round((a + i * (b - a) / (n - 1)) / 5) * 5) for i in range(n)}
    return [f"{m // 60:02d}:{m % 60:02d}" for m in sorted(mins)]


# ---------- daily items ----------

def routine_matches(r, d):
    """Does routine r fall on day d? weekly = weekday bitmask, monthly = day of month (31 → last day), dates = list."""
    kind = r.get("kind") or "weekly"
    if kind == "monthly":
        dt = date.fromisoformat(d)
        last = calendar.monthrange(dt.year, dt.month)[1]
        return dt.day == min(r.get("month_day") or 1, last)
    if kind == "dates":
        return d in json.loads(r.get("dates") or "[]")
    return bool(r["days"] & day_bit(d))


def ensure_day(d=None):
    """Create today's items from the user's active routines (idempotent). Past/future days are never generated."""
    d = d or today_s()
    if d != today_s():
        return
    u = uid()
    for r in q("SELECT * FROM routines WHERE active=1 AND user_id=?", (u,)):
        if routine_matches(r, d):
            x("INSERT OR IGNORE INTO day_items(date,routine_id,title,time,created_at,user_id) VALUES(?,?,?,?,?,?)",
              (d, r["id"], r["title"], r["time"], now_s(), u))


def sync_routine_today(rid):
    """Reflect a routine edit/delete on today's not-yet-done item."""
    d, u = today_s(), uid()
    r = q1("SELECT * FROM routines WHERE id=? AND user_id=?", (rid, u))
    if not r or not r["active"] or not routine_matches(r, d):
        x("DELETE FROM day_items WHERE date=? AND routine_id=? AND done=0 AND user_id=?", (d, rid, u))
    else:
        x("UPDATE day_items SET title=?, time=? WHERE date=? AND routine_id=? AND done=0 AND user_id=?",
          (r["title"], r["time"], d, rid, u))
        ensure_day(d)


def routine_item(r):
    return {"id": f"r{r['id']}", "kind": "routine", "routine_id": r["routine_id"], "title": r["title"],
            "time": r["time"], "done": bool(r["done"]), "done_at": r["done_at"], "source": r["source"],
            "pinned": bool(r.get("pinned")), "important": bool(r.get("important")), "created_at": r.get("r_created")}


def list_names():
    return {r["id"]: r["name"] for r in q("SELECT id, name FROM lists WHERE user_id=?", (uid(),))}


def _assignee(t):
    cid = t.get("assignee_id")
    c = cid and q1("SELECT first_name, last_name, email FROM contacts WHERE id=? AND user_id=?", (cid, t.get("user_id")))
    return {"id": cid, "name": f"{c['first_name']} {c['last_name']}".strip(), "email": c["email"],
            "link": f"/a/{t['assign_token']}" if t.get("assign_token") else None} if c else None


def task_item(t, d=None, names=None):
    d = d or today_s()
    done = t["completed_at"] is not None
    if names is None:
        names = list_names()
    return {"id": f"t{t['id']}", "kind": "task", "task_id": t["id"], "title": t["title"], "notes": t["notes"],
            "list_id": t.get("list_id"), "list_name": names.get(t.get("list_id")),
            "steps": json.loads(t.get("steps") or "[]"), "remind_at": t.get("remind_at"),
            "pinned": bool(t.get("pinned")),
            "time": None, "done": done, "done_at": t["completed_at"], "source": t["source"],
            "important": bool(t["important"]), "due_date": t["due_date"], "my_day": t["my_day_date"] == d,
            "overdue": bool(t["due_date"] and t["due_date"] < d and not done), "created_at": t["created_at"],
            # "Sadece 1 seferlik": planned to come into Günüm once, on a later day
            "my_day_on": t["my_day_date"] if t["my_day_date"] and t["my_day_date"] > d else None,
            "once": t["my_day_date"] if t.get("my_day_once") and t["my_day_date"] and t["my_day_date"] >= d else None,
            "assignee": _assignee(t),
            "assigned_by": t.get("assigned_by") if t.get("src_token") else None,
            # when it came into Günüm today (for Günüm's date order); otherwise when it was written
            "added_at": max(t["created_at"], t.get("my_day_at") or "") if t["my_day_date"] == d else t["created_at"]}


def today(d=None):
    d = d or today_s()
    u = uid()
    ensure_day(d)
    items = [routine_item(r) for r in
             q("""SELECT d.*, r.pinned, r.important, r.created_at AS r_created FROM day_items d LEFT JOIN routines r ON r.id=d.routine_id
                  WHERE d.date=? AND d.user_id=? ORDER BY COALESCE(d.time,'99:99'), d.id""", (d, u))]
    tasks = q("""SELECT * FROM tasks WHERE user_id=? AND deleted=0 AND (
                   (completed_at IS NULL AND ((due_date IS NOT NULL AND due_date<=?) OR my_day_date=?))
                   OR (substr(completed_at,1,10)=? AND ((due_date IS NOT NULL AND due_date<=?) OR my_day_date=?)))
                 ORDER BY pinned DESC, position, id DESC""", (u, d, d, d, d, d))
    names = list_names()
    items += [task_item(t, d, names) for t in tasks]
    # manual drag & drop order for today (unknown/new items keep their default place after the known ones)
    saved = json.loads(uget("today_order") or "{}")
    if saved.get("date") == d:
        rank = {iid: i for i, iid in enumerate(saved.get("ids", []))}
        items.sort(key=lambda it: rank.get(it["id"], len(rank)))
    return {"date": d, "items": items}


def leftovers():
    """Yesterday's Günüm cards that were left open (tasks + routines), minus the ones hidden today
    and the ones already open in today's Günüm (same title)."""
    d = today_s()
    y = (date.fromisoformat(d) - timedelta(days=1)).isoformat()
    u = uid()
    saved = json.loads(uget("left_hidden") or "{}")
    hidden = set(saved.get("ids", [])) if saved.get("date") == d else set()
    here = {it["title"].strip().lower() for it in today(d)["items"] if not it["done"]}
    names = list_names()
    items = [task_item(t, d, names) for t in q("""SELECT * FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL
                                                  AND my_day_date=? ORDER BY id DESC""", (u, y))]
    items += [routine_item(r) for r in q("""SELECT d.*, r.pinned, r.important, r.created_at AS r_created FROM day_items d
                                            LEFT JOIN routines r ON r.id=d.routine_id
                                            WHERE d.date=? AND d.user_id=? AND d.done=0 ORDER BY d.id""", (y, u))]
    return {"date": y, "items": [it for it in items if it["id"] not in hidden and it["title"].strip().lower() not in here]}


def hide_leftover(item_id):
    d = today_s()
    saved = json.loads(uget("left_hidden") or "{}")
    ids = saved.get("ids", []) if saved.get("date") == d else []
    if item_id not in ids:
        ids.append(item_id)
    uset("left_hidden", json.dumps({"date": d, "ids": ids[-500:]}))


def set_today_order(ids):
    uset("today_order", json.dumps({"date": today_s(), "ids": [str(i) for i in ids][:500]}))


def set_task_order(task_ids):
    """Drag & drop inside a list: the given tasks take positions 0..n in that order."""
    u = uid()
    for i, tid in enumerate(task_ids[:1000]):
        x("UPDATE tasks SET position=? WHERE id=? AND user_id=?", (i, int(tid), u))


def set_done(item_id, done, source="app", only_if_open=False):
    m = ID_RE.fullmatch(item_id or "")
    if not m:
        return 0
    kind, i = m.group(1), int(m.group(2))
    src = source if done else None
    u = uid()
    if kind == "r":
        extra = " AND done=0" if only_if_open else ""
        return x(f"UPDATE day_items SET done=?, done_at=?, source=? WHERE id=? AND user_id=?{extra}",
                 (1 if done else 0, now_s() if done else None, src, i, u))
    extra = " AND completed_at IS NULL" if only_if_open else ""
    return x(f"UPDATE tasks SET completed_at=?, source=? WHERE id=? AND user_id=? AND deleted=0{extra}",
             (now_s() if done else None, src, i, u))


# ---------- tasks ----------

def _task(tid):
    return q1("SELECT * FROM tasks WHERE id=? AND user_id=? AND deleted=0", (tid, uid()))


def list_tasks(done=False, list_id=None):
    """list_id: None = every task, 0 = Genel (no folder), N = folder N."""
    d = today_s()
    where, args = "", (uid(),)
    if list_id == 0:
        where = " AND list_id IS NULL"
    elif list_id:
        where, args = " AND list_id=?", (uid(), list_id)
    if done:
        rows = q(f"""SELECT * FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NOT NULL{where}
                     ORDER BY completed_at DESC LIMIT 100""", args)
    else:
        rows = q(f"""SELECT * FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL{where}
                     ORDER BY pinned DESC, position, id DESC""", args)
    names = list_names()
    return [task_item(t, d, names) for t in rows]


def _list_or_none(list_id):
    """Only the user's real lists hold tasks (an 'ana liste' group does not)."""
    return list_id if list_id and q1("SELECT 1 FROM lists WHERE id=? AND kind='list' AND user_id=?",
                                     (list_id, uid())) else None


def create_task(title, notes="", due_date=None, important=False, my_day=False, list_id=None, remind_at=None):
    # new tasks go to the top; the position is computed inside the INSERT so parallel adds never share one
    u = uid()
    now = now_s()
    tid = ins("""INSERT INTO tasks(title,notes,due_date,important,my_day_date,my_day_at,created_at,list_id,remind_at,user_id,position)
                 VALUES(?,?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MIN(position), 0) - 1 FROM tasks WHERE user_id=?))""",
              (title, notes or "", due_date or None, 1 if important else 0, today_s() if my_day else None,
               now if my_day else None, now, _list_or_none(list_id), remind_at or None, u, u))
    return task_item(_task(tid))


def update_task(tid, f):
    if not _task(tid):
        return None
    sets, args = [], []
    for k in ("title", "notes"):
        if k in f:
            sets.append(f"{k}=?"); args.append(f[k] or "")
    if "due_date" in f:
        sets.append("due_date=?"); args.append(f["due_date"] or None)
    if "important" in f:
        sets.append("important=?"); args.append(1 if f["important"] else 0)
    if "pinned" in f:
        sets.append("pinned=?"); args.append(1 if f["pinned"] else 0)
    if "my_day" in f:
        if f["my_day"]:  # coming into Günüm now (already there today → keep its time)
            sets.append("my_day_at=CASE WHEN COALESCE(my_day_date,'')!=? THEN ? ELSE my_day_at END"); args += [today_s(), now_s()]
        sets.append("my_day_date=?"); args.append(today_s() if f["my_day"] else None)
        sets.append("my_day_once=0")
    if "list_id" in f:
        sets.append("list_id=?"); args.append(_list_or_none(f["list_id"]))
    if "steps" in f:
        sets.append("steps=?"); args.append(json.dumps(f["steps"], ensure_ascii=False))
    if "remind_at" in f:
        sets.append("remind_at=?"); args.append(f["remind_at"] or None)
        sets.append("reminded=0")
    if sets:
        x(f"UPDATE tasks SET {', '.join(sets)} WHERE id=? AND user_id=? AND deleted=0", (*args, tid, uid()))
    if "done" in f:
        set_done(f"t{tid}", f["done"], f.get("source", "app"))
    t = _task(tid)
    return task_item(t) if t else None


def delete_task(tid):
    return x("UPDATE tasks SET deleted=1 WHERE id=? AND user_id=?", (tid, uid()))


def restore_task(tid):
    """Undo a delete (deletes are soft)."""
    return x("UPDATE tasks SET deleted=0 WHERE id=? AND user_id=?", (tid, uid()))


def due_task_reminders(now):
    """The user's open tasks whose reminder time has come (within the last 15 min); marks them reminded."""
    hi = now.strftime("%Y-%m-%d %H:%M")
    lo = (now - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M")
    rows = q("""SELECT id, title FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL AND reminded=0
                AND remind_at IS NOT NULL AND remind_at<=? AND remind_at>=?""", (uid(), hi, lo))
    for r in rows:
        x("UPDATE tasks SET reminded=1 WHERE id=?", (r["id"],))
    return rows


def _norm(s):
    """Turkish-aware lowercase for search (İ→i, I→ı)."""
    return (s or "").replace("İ", "i").replace("I", "ı").lower()


def search(text):
    n = _norm(text.strip())
    if not n:
        return {"tasks": [], "routines": []}
    names = list_names()
    tasks = []
    for t in q("SELECT * FROM tasks WHERE user_id=? AND deleted=0 ORDER BY completed_at IS NOT NULL, id DESC", (uid(),)):
        steps = " ".join(s.get("t", "") for s in json.loads(t["steps"] or "[]"))
        if n in _norm(f"{t['title']} {t['notes']} {steps}"):
            tasks.append(task_item(t, None, names))
            if len(tasks) >= 60:
                break
    return {"tasks": tasks, "routines": [r for r in list_routines() if n in _norm(r["title"])]}


def export_all():
    u = uid()
    return {"exported_at": now_s(),
            "lists": q("SELECT * FROM lists WHERE user_id=? ORDER BY id", (u,)),
            "tasks": [dict(t, steps=json.loads(t["steps"] or "[]"))
                      for t in q("SELECT * FROM tasks WHERE user_id=? AND deleted=0 ORDER BY id", (u,))],
            "routines": q("SELECT * FROM routines WHERE user_id=? ORDER BY id", (u,)),
            "history": q("""SELECT date, routine_id, title, time, done, done_at, source FROM day_items
                            WHERE user_id=? ORDER BY date, id""", (u,))}


def task_to_routine(tid, days, time=None):
    """'Görevi tekrarla' (old): the task becomes a routine and leaves the task list."""
    t = _task(tid)
    if not t:
        return None
    r = create_routine(t["title"], days, time)
    delete_task(tid)
    return r


def task_once(tid, d):
    """'Sadece 1 seferlik': the task comes into Günüm on day d only (it stays in its list); a repeat it had is removed."""
    t = _task(tid)
    if not t:
        return None
    u = uid()
    x("UPDATE tasks SET my_day_date=?, my_day_at=?, my_day_once=1 WHERE id=? AND user_id=?",
      (d, now_s() if d == today_s() else f"{d} 00:00:00", tid, u))
    removed = 0
    for r in q("SELECT id FROM routines WHERE title=? AND user_id=?", (t["title"], u)):
        delete_routine(r["id"])
        removed += 1
    return {**task_item(_task(tid)), "repeat_removed": removed > 0}


def routine_once(rid, d):
    r = get_routine(rid)
    if not r:
        return None
    t = q1("""SELECT id FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL AND title=? ORDER BY id DESC LIMIT 1""",
           (uid(), r["title"]))
    tid = t["id"] if t else create_task(r["title"], important=bool(r.get("important")))["task_id"]
    return task_once(tid, d)


def once_tasks():
    """Open 'Sadece 1 seferlik' tasks from today on (shown under Günler on their weekday), soonest first."""
    names = list_names()
    return [task_item(t, None, names) for t in q("""SELECT * FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL
        AND my_day_once=1 AND my_day_date >= ? ORDER BY my_day_date, id""", (uid(), today_s()))]


def _routine_by_title(title):
    return q1("SELECT * FROM routines WHERE title=? AND user_id=? ORDER BY id LIMIT 1", (title, uid()))


def task_to_weekly(tid, day):
    """'Haftanın gününe gönder': the task (which stays in its list) also becomes a routine on that weekday.
    A routine with the same title gets the extra day instead of a duplicate routine."""
    t = _task(tid)
    if not t:
        return None
    bit = 1 << day
    r = _routine_by_title(t["title"])
    if r:
        days = r["days"] | bit if (r.get("kind") or "weekly") == "weekly" else bit  # a monthly/dated routine becomes weekly
        return update_routine(r["id"], {"days": days, "kind": "weekly", "active": True})
    return create_routine(t["title"], bit)


# ---------- folders (lists) ----------

def get_lists():
    return q("""SELECT l.id, l.name, l.sort, l.kind, l.parent_id,
                  (SELECT COUNT(*) FROM tasks t WHERE t.list_id=l.id AND t.deleted=0 AND t.completed_at IS NULL) open
                FROM lists l WHERE l.user_id=? ORDER BY l.sort, l.id""", (uid(),))


def _list(lid):
    return q1("SELECT * FROM lists WHERE id=? AND user_id=?", (lid, uid()))


def _group_or_none(gid):
    return gid if gid and q1("SELECT 1 FROM lists WHERE id=? AND kind='group' AND user_id=?", (gid, uid())) else None


def create_list(name, kind="list", parent_id=None):
    """kind 'group' = ana liste (a container for lists); a list may sit inside a group."""
    u = uid()
    lid = ins("INSERT INTO lists(name,sort,created_at,kind,parent_id,user_id) VALUES(?,?,?,?,?,?)",
              (name, (q1("SELECT COALESCE(MAX(sort),0)+1 s FROM lists WHERE user_id=?", (u,))["s"]), now_s(), kind,
               _group_or_none(parent_id) if kind == "list" else None, u))
    return _list(lid)


def order_lists(ids, parent_id=None):
    """Sidebar drag & drop: the given lists/groups take sort 0..n inside one container (a group or the top level).
    Lists dropped into a group join it; groups always stay at the top level."""
    gid = _group_or_none(parent_id)
    u = uid()
    for i, lid in enumerate(ids[:500]):
        row = _list(lid)
        if not row:
            continue
        if row["kind"] == "group":
            x("UPDATE lists SET sort=? WHERE id=? AND user_id=?", (i, lid, u))
        else:
            x("UPDATE lists SET sort=?, parent_id=? WHERE id=? AND user_id=?", (i, gid, lid, u))


def move_list(lid, parent_id):
    """Put a list into a group (parent_id) or back to the top level (None)."""
    if not q1("SELECT 1 FROM lists WHERE id=? AND kind='list' AND user_id=?", (lid, uid())):
        return None
    x("UPDATE lists SET parent_id=? WHERE id=? AND user_id=?", (_group_or_none(parent_id), lid, uid()))
    return _list(lid)


def rename_list(lid, name):
    x("UPDATE lists SET name=? WHERE id=? AND user_id=?", (name, lid, uid()))
    return _list(lid)


def duplicate_list(lid):
    """Copy a list with its open tasks (title, notes, date, star)."""
    src = _list(lid)
    if not src:
        return None
    u = uid()
    new = create_list(f"{src['name']} (kopya)"[:60], "list", src.get("parent_id"))
    for t in q("""SELECT * FROM tasks WHERE list_id=? AND user_id=? AND deleted=0 AND completed_at IS NULL
                  ORDER BY pinned DESC, position, id DESC""", (lid, u)):
        ins("""INSERT INTO tasks(title,notes,due_date,important,created_at,list_id,steps,position,user_id)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (t["title"], t["notes"], t["due_date"], t["important"], now_s(), new["id"], t["steps"], t["position"], u))
    return new


def _list_where(lid):
    return ("list_id IS NULL", ()) if not lid else ("list_id=?", (lid,))


def schedule_list(lid, due_date, my_day=False):
    """'Şu tarihe veya güne gönder': give every open task of the list (0 = Genel) this date."""
    where, args = _list_where(lid)
    t, now = today_s(), now_s()
    return x(f"""UPDATE tasks SET due_date=?,
                   my_day_at=CASE WHEN ? IS NOT NULL AND COALESCE(my_day_date,'')!=? THEN ? ELSE my_day_at END,
                   my_day_date=COALESCE(?, my_day_date)
                 WHERE user_id=? AND {where} AND deleted=0 AND completed_at IS NULL""",
             (due_date, t if my_day else None, t, now, t if my_day else None, uid(), *args))


def list_to_my_day(lid):
    """'Tüm listeyi günüme ekle': every open task of the list (0 = Genel) goes to Today; dates stay as they are."""
    where, args = _list_where(lid)
    return x(f"""UPDATE tasks SET my_day_date=?, my_day_at=? WHERE user_id=? AND {where} AND deleted=0 AND completed_at IS NULL
                 AND COALESCE(my_day_date,'')!=?""", (today_s(), now_s(), uid(), *args, today_s()))


def delete_list(lid):
    """List goes away (its tasks move back to Genel); a deleted group releases its lists to the top level."""
    u = uid()
    if not _list(lid):
        return 0
    x("UPDATE tasks SET list_id=NULL WHERE list_id=? AND user_id=?", (lid, u))
    x("UPDATE lists SET parent_id=NULL WHERE parent_id=? AND user_id=?", (lid, u))
    return x("DELETE FROM lists WHERE id=? AND user_id=?", (lid, u))


# ---------- routines ----------

def _routine(r):
    """Routine row for the API (dates as a list)."""
    if r is not None:
        r = dict(r, dates=json.loads(r.get("dates") or "[]"), kind=r.get("kind") or "weekly")
    return r


def get_routine(rid):
    return _routine(q1("SELECT * FROM routines WHERE id=? AND user_id=?", (rid, uid())))


def list_routines():
    return [_routine(r) for r in q("SELECT * FROM routines WHERE user_id=? ORDER BY COALESCE(time,'99:99'), sort, id",
                                   (uid(),))]


def create_routine(title, days=ALL_DAYS, time=None, kind="weekly", month_day=None, dates=None):
    rid = ins("INSERT INTO routines(title,days,time,created_at,kind,month_day,dates,user_id) VALUES(?,?,?,?,?,?,?,?)",
              (title, days, time or None, now_s(), kind, month_day, json.dumps(dates) if dates is not None else None, uid()))
    sync_routine_today(rid)
    return get_routine(rid)


def task_recur(tid, rule):
    """Card 'Tekrarla' button: the task (which stays in its list) gets a routine with this rule.
    rule = {kind: weekly|monthly|dates, days, month_day, dates, time}; a same-title routine is updated instead of duplicated."""
    t = _task(tid)
    if not t:
        return None
    f = {"kind": rule["kind"], "days": rule.get("days") or 0, "month_day": rule.get("month_day"),
         "dates": rule.get("dates"), "active": True}
    if rule.get("time"):
        f["time"] = rule["time"]
    r = _routine_by_title(t["title"])
    if r:
        return update_routine(r["id"], f)
    return create_routine(t["title"], f["days"], rule.get("time"), f["kind"], f["month_day"], f["dates"])


def update_routine(rid, f):
    if not get_routine(rid):
        return None
    sets, args = [], []
    if "dates" in f:
        f = {**f, "dates": json.dumps(f["dates"]) if f["dates"] is not None else None}
    for k in ("title", "days", "time", "active", "kind", "month_day", "dates", "pinned", "important"):
        if k in f:
            v = f[k]
            if k == "time":
                v = v or None
            if k in ("active", "pinned", "important"):
                v = 1 if v else 0
            sets.append(f"{k}=?"); args.append(v)
    if sets:
        x(f"UPDATE routines SET {', '.join(sets)} WHERE id=? AND user_id=?", (*args, rid, uid()))
    sync_routine_today(rid)
    return get_routine(rid)


def delete_routine(rid):
    x("DELETE FROM routines WHERE id=? AND user_id=?", (rid, uid()))
    sync_routine_today(rid)  # removes today's open item; past history keeps its title snapshot


# ---------- history ----------

def history_month(ym):
    u = uid()
    days = {}
    for r in q("""SELECT date, COUNT(*) total, SUM(done) done FROM day_items
                  WHERE user_id=? AND date LIKE ? GROUP BY date""", (u, ym + "%")):
        days[r["date"]] = {"total": r["total"], "done": r["done"] or 0, "tasks": 0}
    for r in q("""SELECT substr(completed_at,1,10) d, COUNT(*) n FROM tasks
                  WHERE user_id=? AND deleted=0 AND completed_at LIKE ? GROUP BY d""", (u, ym + "%")):
        e = days.setdefault(r["d"], {"total": 0, "done": 0, "tasks": 0})
        e["tasks"] = r["n"]
    return days


def history_day(d):
    u = uid()
    if d == today_s():
        ensure_day(d)
    items = [routine_item(r) for r in q("""SELECT * FROM day_items WHERE user_id=? AND date=?
                                           ORDER BY COALESCE(time,'99:99'), id""", (u, d))]
    names = list_names()
    items += [task_item(t, d, names) for t in q("""SELECT * FROM tasks WHERE user_id=? AND deleted=0 AND
                 (substr(completed_at,1,10)=? OR (completed_at IS NULL AND due_date=?)) ORDER BY completed_at""", (u, d, d))]
    return {"date": d, "items": items}


def stats():
    u = uid()
    d0 = date.today()
    rows = q("SELECT date, COUNT(*) total, SUM(done) done FROM day_items WHERE user_id=? AND date>=? GROUP BY date",
             (u, (d0 - timedelta(days=400)).isoformat()))
    m = {r["date"]: r for r in rows}
    streak = 0
    if m:
        earliest = date.fromisoformat(min(m))
        day = d0
        t = m.get(d0.isoformat())
        if t and (t["done"] or 0) < t["total"]:
            day = d0 - timedelta(days=1)  # today still in progress: doesn't break the streak
        while day >= earliest:
            r = m.get(day.isoformat())
            if r:  # days without routines are neutral
                if (r["done"] or 0) >= r["total"]:
                    streak += 1
                else:
                    break
            day -= timedelta(days=1)
    since = (d0 - timedelta(days=29)).isoformat()
    tot = q1("SELECT COUNT(*) total, SUM(done) done FROM day_items WHERE user_id=? AND date>=?", (u, since))
    per = q("""SELECT d.routine_id, COALESCE(r.title, MAX(d.title)) title, COUNT(*) total, SUM(d.done) done
               FROM day_items d LEFT JOIN routines r ON r.id=d.routine_id
               WHERE d.user_id=? AND d.date>=? GROUP BY d.routine_id ORDER BY (SUM(d.done)*1.0/COUNT(*)) DESC, title""",
            (u, since))
    tasks30 = q1("SELECT COUNT(*) n FROM tasks WHERE user_id=? AND deleted=0 AND completed_at>=?", (u, since))["n"]
    return {"streak": streak, "last30": {"total": tot["total"], "done": tot["done"] or 0},
            "per_routine": per, "tasks_done_30": tasks30}


# ---------- iPhone Reminders sync (Shortcuts) ----------

def sync_export(peek=False, resend=False):
    d, u = today_s(), uid()
    out = []
    for it in today(d)["items"]:
        if it["done"]:
            continue
        tag = f"#g{it['id']}#"
        if not resend and q1("SELECT 1 FROM exported WHERE tag=?", (tag,)):
            continue
        out.append({"tag": tag, "title": it["title"], "notes": tag,
                    "alert": f"{d} {it['time']}" if it.get("time") else (it.get("remind_at") or "")})
        if not peek:
            x("INSERT OR REPLACE INTO exported(tag,at,user_id) VALUES(?,?,?)", (tag, now_s(), u))
    return {"date": d, "count": len(out), "items": out}


def sync_done(text):
    n = 0
    for kind, i in TAG_RE.findall(text or ""):
        n += set_done(f"{kind}{i}", True, "reminders", only_if_open=True)  # set_done only touches this user's rows
    return {"updated": n}


def sync_state():
    """The user's exported items finished in the app/extension in the last 3 days → to be ticked in Reminders."""
    u = uid()
    since = (date.today() - timedelta(days=2)).isoformat()
    tags = [r["t"] for r in q("""SELECT '#gr'||id||'#' t FROM day_items WHERE user_id=? AND date>=? AND done=1
                                  AND COALESCE(source,'')!='reminders'""", (u, since))]
    tags += [r["t"] for r in q("""SELECT '#gt'||id||'#' t FROM tasks WHERE user_id=? AND completed_at>=?
                                   AND COALESCE(source,'')!='reminders'""", (u, since))]
    exported = {r["tag"] for r in q("SELECT tag FROM exported WHERE user_id=?", (u,))}
    tags = [t for t in tags if t in exported]
    return {"count": len(tags), "tags": tags}


# ---------- "Gelecek": what is coming after today ----------
UPCOMING_DAYS = {"tomorrow": 1, "w1": 7, "w2": 14, "w3": 21, "w4": 28, "month": 92, "all": 365}


def upcoming(rng):
    """Everything planned after today, within the chosen range (tomorrow, 1–4 weeks, 3 months, all).
    Every card appears ONCE (matched by name): its first date in the range, how many times it comes in the range
    (routines) and its due date / reminder (tasks). A task with the same name as a routine is one entry.
    Today is not included (that is Günüm). Routines are looked at up to a year ahead; tasks without limit for "all"."""
    days = UPCOMING_DAYS[rng]
    t0 = date.fromisoformat(today_s())
    start, end = t0 + timedelta(days=1), t0 + timedelta(days=days)
    span = [(start + timedelta(days=i)).isoformat() for i in range(days)]
    t0s, end_s = t0.isoformat(), (None if rng == "all" else end.isoformat())
    out = {}
    for r in list_routines():
        if not r["active"]:
            continue
        if rng == "month" and r["kind"] == "weekly":
            continue  # "Aylık" is the big picture: weekly / daily routines would only crowd it (user request)
        hits = [d for d in span if routine_matches(r, d)]
        if hits:
            out[_norm(r["title"].strip())] = {"title": r["title"], "kind": "routine", "routine": r, "task": None,
                                              "dates": hits, "time": r["time"], "important": bool(r.get("important"))}
    names = list_names()
    for t in q("""SELECT * FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL
                  AND (due_date > ? OR substr(remind_at,1,10) > ? OR my_day_date > ?) ORDER BY id""", (uid(), t0s, t0s, t0s)):
        when = sorted({x for x in (t["due_date"], (t["remind_at"] or "")[:10] or None, t["my_day_date"])
                       if x and x > t0s and (end_s is None or x <= end_s)})
        if not when:
            continue
        item = task_item(t, None, names)
        k = _norm(t["title"].strip())
        if k in out:  # same name already listed (a routine or another task): one entry, dates merged
            e = out[k]
            e["task"] = e["task"] or item
            e["dates"] = sorted(set(e["dates"]) | set(when))
            e["important"] = e["important"] or item["important"]
        else:
            out[k] = {"title": t["title"], "kind": "task", "routine": None, "task": item, "dates": when,
                      "time": (t["remind_at"] or "")[11:16] or None, "important": item["important"]}
    items = []
    for e in out.values():
        e["first"], e["count"], e["dates"] = e["dates"][0], len(e["dates"]), e["dates"][:60]
        items.append(e)
    items.sort(key=lambda e: (e["first"], e["time"] or "99:99", _norm(e["title"])))
    return {"range": rng, "start": start.isoformat(), "end": end_s, "items": items}
