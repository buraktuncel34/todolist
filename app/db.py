"""SQLite storage. One connection, serialized with a lock. Multi-user: every data row carries user_id;
the current user comes from a context variable set by the auth dependency (or the scheduler, per user)."""
import contextvars
import os
import sqlite3
import threading
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"
DATA.mkdir(exist_ok=True)
DB_PATH = DATA / "gunluk.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, created_at TEXT, ua TEXT);
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    due_date TEXT,
    important INTEGER NOT NULL DEFAULT 0,
    my_day_date TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    source TEXT,
    deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS routines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    days INTEGER NOT NULL DEFAULT 127,
    time TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS day_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    routine_id INTEGER,
    title TEXT NOT NULL,
    time TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    done_at TEXT,
    source TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(date, routine_id)
);
CREATE INDEX IF NOT EXISTS ix_day_items_date ON day_items(date);
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT);
CREATE TABLE IF NOT EXISTS exported (tag TEXT PRIMARY KEY, at TEXT);
CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    picture TEXT,
    provider TEXT,
    is_owner INTEGER NOT NULL DEFAULT 0,
    disabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_login TEXT
);
CREATE TABLE IF NOT EXISTS user_settings (user_id INTEGER NOT NULL, key TEXT NOT NULL, value TEXT, PRIMARY KEY (user_id, key));
"""

# per-user data tables (every row belongs to one user)
USER_TABLES = ("tasks", "routines", "lists", "day_items", "push_subs", "exported", "sessions")
# settings that belong to a user (the rest of `settings` is global: password, OAuth keys, backups…)
USER_KEYS = ("api_token", "morning_time", "item_alerts", "ui_theme", "ui_mode", "ui_bg", "nudge_mode", "nudge_times",
             "nudge_count", "nudge_start", "nudge_end", "profile_name", "weather_city", "today_order", "list_sort", "last_morning", "last_nudge")
# the owner (yönetici): set OWNER_EMAIL in the service; the first account signing up with it becomes the owner
OWNER_EMAIL_DEFAULT = os.environ.get("OWNER_EMAIL", "").strip().lower()

CUR_UID = contextvars.ContextVar("gunluk_uid", default=None)


def uid():
    """The signed-in user's id; every data query is scoped with it."""
    u = CUR_UID.get()
    if u is None:
        raise RuntimeError("no current user")
    return u

# Columns added after first release: (table, column, definition)
MIGRATIONS = [
    ("tasks", "list_id", "INTEGER"),
    ("tasks", "steps", "TEXT NOT NULL DEFAULT '[]'"),
    ("tasks", "remind_at", "TEXT"),
    ("tasks", "reminded", "INTEGER NOT NULL DEFAULT 0"),
    ("tasks", "pinned", "INTEGER NOT NULL DEFAULT 0"),
    ("tasks", "position", "REAL"),
    ("sessions", "email", "TEXT"),
    ("sessions", "name", "TEXT"),
    ("sessions", "picture", "TEXT"),
    ("sessions", "method", "TEXT"),
    ("routines", "kind", "TEXT NOT NULL DEFAULT 'weekly'"),   # weekly | monthly | dates
    ("routines", "month_day", "INTEGER"),                     # monthly: 1..31 (31 = last day of the month)
    ("routines", "dates", "TEXT"),                            # dates: JSON list of YYYY-MM-DD
    ("lists", "kind", "TEXT NOT NULL DEFAULT 'list'"),        # list | group ("ana liste": holds lists, not tasks)
    ("lists", "parent_id", "INTEGER"),                        # the group a list sits in
    ("sessions", "last_seen", "TEXT"),
    ("routines", "pinned", "INTEGER NOT NULL DEFAULT 0"),     # routine card pinned on top of Günüm
    ("routines", "important", "INTEGER NOT NULL DEFAULT 0"),  # routine card starred
    ("users", "username", "TEXT"),                            # manual accounts: sign in with username / e-mail / phone
    ("users", "phone", "TEXT"),                               # normalised: 5321234567
    ("users", "password_hash", "TEXT"),
    ("users", "email_verified", "INTEGER NOT NULL DEFAULT 1"),
    ("tasks", "my_day_once", "INTEGER NOT NULL DEFAULT 0"),    # my_day_date was set by "Sadece 1 seferlik"
    ("tasks", "my_day_at", "TEXT"),
    ("tasks", "assignee_id", "INTEGER"),                       # Kişiler: the person the task is assigned to
    ("tasks", "assigned_at", "TEXT"),
    ("tasks", "assign_token", "TEXT"),
    ("tasks", "src_token", "TEXT"),                            # a copy in the assignee's account: the original's assign_token
    ("tasks", "assigned_by", "TEXT"),                          # … and who assigned it (shown on the card)                         # the key in the assignee's mail links (/a/<token>)                            # when the task was put into Günüm (my_day_date)  # 0 = typed in at sign-up, not proven by Google/Microsoft
] + [(t, "user_id", "INTEGER") for t in USER_TABLES]
BACKUPS = DATA / "backups"
KEEP_BACKUPS = 30


def _migrate(c):
    for table, col, definition in MIGRATIONS:
        cols = {r[1] for r in c.execute(f"PRAGMA table_info({table})")}
        if col not in cols:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
    _adopt_single_user_data(c)
    c.execute("DELETE FROM settings WHERE key='pw'")  # the old shared password opened the owner's account; gone for good


def _adopt_single_user_data(c):
    """Single-user → multi-user, once: create the owner (user 1) and give them every existing row and setting."""
    if c.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        return
    if not any(c.execute(f"SELECT 1 FROM {t} LIMIT 1").fetchone() for t in ("tasks", "routines", "lists")):
        return  # a fresh install: the owner is made when they sign up with OWNER_EMAIL
    import json
    from datetime import datetime
    allowed = c.execute("SELECT value FROM settings WHERE key='allowed_emails'").fetchone()
    emails = json.loads(allowed[0]) if allowed and allowed[0] else []
    owner_email = (emails[0] if emails else OWNER_EMAIL_DEFAULT).lower()
    name = c.execute("SELECT value FROM settings WHERE key='profile_name'").fetchone()
    c.execute("INSERT INTO users(id,email,name,provider,is_owner,created_at) VALUES(1,?,?,?,1,?)",
              (owner_email, name[0] if name else None, "owner", datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    for t in USER_TABLES:
        c.execute(f"UPDATE {t} SET user_id=1 WHERE user_id IS NULL")
    for k in USER_KEYS:
        row = c.execute("SELECT value FROM settings WHERE key=?", (k,)).fetchone()
        if row is not None:
            c.execute("INSERT OR IGNORE INTO user_settings(user_id,key,value) VALUES(1,?,?)", (k, row[0]))

_lock = threading.RLock()
_conn = None


def conn():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA synchronous=NORMAL")  # safe with WAL, much faster writes
        _conn.executescript(SCHEMA)
        _migrate(_conn)
        _conn.executescript("""
            CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
                first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '', created_at TEXT);
            CREATE INDEX IF NOT EXISTS ix_contacts_user ON contacts(user_id, email);
            CREATE INDEX IF NOT EXISTS ix_tasks_open ON tasks(deleted, completed_at);
            CREATE INDEX IF NOT EXISTS ix_tasks_list ON tasks(list_id);
            CREATE INDEX IF NOT EXISTS ix_tasks_myday ON tasks(my_day_date);
            CREATE INDEX IF NOT EXISTS ix_day_items_routine ON day_items(routine_id, date);
            CREATE INDEX IF NOT EXISTS ix_tasks_user ON tasks(user_id, deleted, completed_at);
            CREATE INDEX IF NOT EXISTS ix_routines_user ON routines(user_id);
            CREATE INDEX IF NOT EXISTS ix_lists_user ON lists(user_id);
            CREATE INDEX IF NOT EXISTS ix_day_items_user ON day_items(user_id, date);
            CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users(username) WHERE username IS NOT NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users(phone) WHERE phone IS NOT NULL;
        """)
        _undo_schema(_conn)
    return _conn


# Undo / redo (app/undo.py): triggers write the before/after row of every change made while undo_ctx names a user.
UNDO_TABLES = ("tasks", "routines", "lists", "day_items", "user_settings")
UNDO_KEYS = ("today_order", "list_sort")  # user_settings keys that are data (order / sort), not preferences


def _undo_schema(c):
    c.executescript("""
        CREATE TABLE IF NOT EXISTS undo_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, grp TEXT NOT NULL,
            tbl TEXT NOT NULL, op TEXT NOT NULL, old TEXT, new TEXT, undone INTEGER NOT NULL DEFAULT 0, at TEXT);
        CREATE INDEX IF NOT EXISTS ix_undo_user ON undo_log(user_id, undone, id);
        CREATE TABLE IF NOT EXISTS undo_ctx (k INTEGER PRIMARY KEY CHECK (k = 1), uid INTEGER, grp TEXT);
        INSERT OR IGNORE INTO undo_ctx(k) VALUES (1);
        UPDATE undo_ctx SET uid=NULL, grp=NULL;
    """)
    keys = ",".join(f"'{k}'" for k in UNDO_KEYS)
    for t in UNDO_TABLES:
        cols = [r[1] for r in c.execute(f"PRAGMA table_info({t})")]
        obj = lambda p: "json_object(" + ", ".join(f"'{col}', {p}.{col}" for col in cols) + ")"
        for op, event, p in (("I", "INSERT", "NEW"), ("U", "UPDATE", "NEW"), ("D", "DELETE", "OLD")):
            cond = f"(SELECT uid FROM undo_ctx WHERE k=1) = {p}.user_id"
            if t == "user_settings":
                cond += f" AND {p}.key IN ({keys})"
            if op == "U":
                cond += f" AND {obj('OLD')} IS NOT {obj('NEW')}"  # no-op updates are not a step
            c.execute(f"DROP TRIGGER IF EXISTS undo_{t}_{op}")
            c.execute(f"""CREATE TRIGGER undo_{t}_{op} AFTER {event} ON {t} WHEN {cond}
                BEGIN INSERT INTO undo_log(user_id, grp, tbl, op, old, new, at)
                VALUES ({p}.user_id, (SELECT grp FROM undo_ctx WHERE k=1), '{t}', '{op}',
                        {obj('OLD') if op != 'I' else 'NULL'}, {obj('NEW') if op != 'D' else 'NULL'}, datetime('now', 'localtime'));
                END""")


def init():
    with _lock:
        conn()


def q(sql, args=()):
    with _lock:
        return [dict(r) for r in conn().execute(sql, args).fetchall()]


def q1(sql, args=()):
    rows = q(sql, args)
    return rows[0] if rows else None


def x(sql, args=()):
    """Run a write; returns affected row count."""
    with _lock:
        return conn().execute(sql, args).rowcount


def ins(sql, args=()):
    """Run an INSERT; returns the new row id."""
    with _lock:
        return conn().execute(sql, args).lastrowid


def backup_if_due(now):
    """Nightly copy (first tick after 03:00) into data/backups, keeping the newest KEEP_BACKUPS."""
    d = now.strftime("%Y-%m-%d")
    if now.hour < 3 or get_setting("last_backup") == d:
        return None
    BACKUPS.mkdir(exist_ok=True)
    path = BACKUPS / f"gunluk-{d}.db"
    dst = sqlite3.connect(path)
    try:
        with _lock:
            conn().backup(dst)
    finally:
        dst.close()
    path.chmod(0o600)
    for old in sorted(BACKUPS.glob("gunluk-*.db"))[:-KEEP_BACKUPS]:
        old.unlink()
    set_setting("last_backup", d)
    # sign-ins unused for 180 days end by themselves
    x("DELETE FROM sessions WHERE COALESCE(last_seen, created_at) < datetime('now', '-180 days')")
    return path


def get_setting(key, default=None):
    r = q1("SELECT value FROM settings WHERE key=?", (key,))
    return r["value"] if r else default


def set_setting(key, value):
    x("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))


def uget(key, default=None, user_id=None):
    """A setting of the current user (or user_id)."""
    r = q1("SELECT value FROM user_settings WHERE user_id=? AND key=?", (user_id or uid(), key))
    return r["value"] if r else default


def uset(key, value, user_id=None):
    x("""INSERT INTO user_settings(user_id,key,value) VALUES(?,?,?)
         ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value""", (user_id or uid(), key, value))
