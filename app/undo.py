"""Undo / redo for the web app (Ctrl+Z / Ctrl+Y and the arrows in the top bar).

Every change made by the app is written down by SQLite triggers (db._undo_schema): the row before and after,
for tasks, routines, lists, day_items and the order / sort settings. One user gesture = one step ("grp", sent
by the app in the X-Undo header). Undo puts the old rows back, redo the new ones. A new change drops the redo steps.
"""
import json

from . import db

PK = {"tasks": ("id",), "routines": ("id",), "lists": ("id",), "day_items": ("id",), "user_settings": ("user_id", "key")}
KEEP = 5000  # log rows kept per user


def begin(uid, grp):
    db.x("UPDATE undo_ctx SET uid=?, grp=? WHERE k=1", (uid, grp))


def end(uid, grp):
    db.x("UPDATE undo_ctx SET uid=NULL, grp=NULL WHERE k=1")
    if db.q1("SELECT 1 FROM undo_log WHERE user_id=? AND grp=? AND undone=0 LIMIT 1", (uid, grp)):
        db.x("DELETE FROM undo_log WHERE user_id=? AND undone=1", (uid,))  # a new change: the redo steps are gone
        cut = db.q1("SELECT id FROM undo_log WHERE user_id=? ORDER BY id DESC LIMIT 1 OFFSET ?", (uid, KEEP))
        if cut:
            db.x("DELETE FROM undo_log WHERE user_id=? AND id<=?", (uid, cut["id"]))


def state(uid):
    can = lambda undone: bool(db.q1("SELECT 1 FROM undo_log WHERE user_id=? AND undone=? LIMIT 1", (uid, undone)))
    return {"can_undo": can(0), "can_redo": can(1)}


def _cols(c, tbl):
    return [r[1] for r in c.execute(f"PRAGMA table_info({tbl})")]


def _put(c, tbl, row):
    cols = [k for k in _cols(c, tbl) if k in row]
    c.execute(f"INSERT OR REPLACE INTO {tbl} ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", [row[k] for k in cols])


def _drop(c, tbl, row):
    pk = PK[tbl]
    c.execute(f"DELETE FROM {tbl} WHERE " + " AND ".join(f"{k}=?" for k in pk), [row[k] for k in pk])


def _set(c, tbl, row):
    pk = PK[tbl]
    cols = [k for k in _cols(c, tbl) if k in row and k not in pk]
    c.execute(f"UPDATE {tbl} SET {','.join(f'{k}=?' for k in cols)} WHERE " + " AND ".join(f"{k}=?" for k in pk),
              [row[k] for k in cols] + [row[k] for k in pk])


def step(uid, redo=False):
    """Undo the newest step (or redo the last undone one). Returns False when there is nothing to do."""
    with db._lock:
        c = db.conn()
        if redo:
            first = db.q1("SELECT grp FROM undo_log WHERE user_id=? AND undone=1 ORDER BY id LIMIT 1", (uid,))
        else:
            first = db.q1("SELECT grp FROM undo_log WHERE user_id=? AND undone=0 ORDER BY id DESC LIMIT 1", (uid,))
        if not first:
            return False
        rows = db.q(f"SELECT * FROM undo_log WHERE user_id=? AND grp=? AND undone=? ORDER BY id {'ASC' if redo else 'DESC'}",
                    (uid, first["grp"], 1 if redo else 0))
        c.execute("BEGIN")
        try:
            for r in rows:
                old = json.loads(r["old"]) if r["old"] else None
                new = json.loads(r["new"]) if r["new"] else None
                if r["op"] == "I":
                    _put(c, r["tbl"], new) if redo else _drop(c, r["tbl"], new)
                elif r["op"] == "D":
                    _drop(c, r["tbl"], old) if redo else _put(c, r["tbl"], old)
                else:
                    _set(c, r["tbl"], new if redo else old)
            c.execute(f"UPDATE undo_log SET undone=? WHERE id IN ({','.join('?' * len(rows))})",
                      [0 if redo else 1] + [r["id"] for r in rows])
            c.execute("COMMIT")
        except Exception:
            c.execute("ROLLBACK")
            raise
        return True
