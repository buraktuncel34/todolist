"""Rapor: how much got done, how much was added, routine follow-through — for any date range, compared with the
range just before it, plus fixed "today vs yesterday / this week vs last week / month / year" comparisons.

"Done" = a task completed (tasks.completed_at, not deleted) + a routine card ticked (day_items.done, by its day).
"Added" = tasks created (deleted ones included: they were added). All dates are the server's local time.
"""
from datetime import date, timedelta

from .core import list_names, today_s
from .db import q, uid

MAX_DAYS = 3700  # ~10 years


def _d(s):
    return date.fromisoformat(s)


def _span(start, end):
    return (end - start).days + 1


def _bucket_key(d, bucket):
    if bucket == "week":
        return (d - timedelta(days=d.weekday())).isoformat()   # Monday of that week
    if bucket == "month":
        return d.isoformat()[:7]
    return d.isoformat()


def _counts(start, end):
    """Per-day counts in [start, end]: tasks done, routine cards done, routine cards due, tasks added."""
    u, a, b = uid(), start.isoformat(), end.isoformat()
    per = {}
    def add(day, k, n):
        per.setdefault(day, {"tasks": 0, "routines": 0, "due": 0, "added": 0})[k] += n
    for r in q("""SELECT substr(completed_at,1,10) d, COUNT(*) n FROM tasks WHERE user_id=? AND deleted=0
                  AND completed_at IS NOT NULL AND substr(completed_at,1,10) BETWEEN ? AND ? GROUP BY d""", (u, a, b)):
        add(r["d"], "tasks", r["n"])
    for r in q("""SELECT date d, SUM(done) n, COUNT(*) t FROM day_items WHERE user_id=? AND date BETWEEN ? AND ?
                  GROUP BY date""", (u, a, b)):
        add(r["d"], "routines", r["n"] or 0)
        add(r["d"], "due", r["t"])
    for r in q("""SELECT substr(created_at,1,10) d, COUNT(*) n FROM tasks WHERE user_id=?
                  AND substr(created_at,1,10) BETWEEN ? AND ? GROUP BY d""", (u, a, b)):
        add(r["d"], "added", r["n"])
    return per


def _totals(per):
    t = {"tasks": 0, "routines": 0, "due": 0, "added": 0}
    for v in per.values():
        for k in t:
            t[k] += v[k]
    t["done"] = t["tasks"] + t["routines"]
    t["routine_rate"] = round(100 * t["routines"] / t["due"]) if t["due"] else None
    return t


def _period(start, end):
    return _totals(_counts(start, end))


def _streaks():
    """Days in a row with at least one thing done: current (ending today, or yesterday if today is still empty) and best."""
    u = uid()
    days = {r["d"] for r in q("""SELECT DISTINCT substr(completed_at,1,10) d FROM tasks WHERE user_id=? AND deleted=0
                                  AND completed_at IS NOT NULL""", (u,))}
    days |= {r["d"] for r in q("SELECT DISTINCT date d FROM day_items WHERE user_id=? AND done=1", (u,))}
    best = run = 0
    prev = None
    for d in sorted(days):
        cur = _d(d)
        run = run + 1 if prev and (cur - prev).days == 1 else 1
        best, prev = max(best, run), cur
    t = _d(today_s())
    day = t if t.isoformat() in days else t - timedelta(days=1)
    current = 0
    while day.isoformat() in days:
        current += 1
        day -= timedelta(days=1)
    return {"current": current, "best": best}


def _quick():
    """Fixed comparisons around today: each pair = (this, previous)."""
    t = _d(today_s())
    wk = t - timedelta(days=t.weekday())
    mo = t.replace(day=1)
    pmo_end = mo - timedelta(days=1)
    yr = t.replace(month=1, day=1)
    pairs = {
        "day": ((t, t), (t - timedelta(days=1), t - timedelta(days=1))),
        "week": ((wk, t), (wk - timedelta(days=7), wk - timedelta(days=1))),
        "month": ((mo, t), (pmo_end.replace(day=1), pmo_end)),
        "year": ((yr, t), (yr.replace(year=yr.year - 1), yr - timedelta(days=1))),
    }
    out = {}
    for k, ((a, b), (pa, pb)) in pairs.items():
        cur, prev = _period(a, b), _period(pa, pb)
        # "so far" comparison as well: last week up to the same weekday, last month up to the same day…
        same = (pa, min(pb, pa + (b - a)))
        out[k] = {"cur": cur, "prev": prev, "prev_same": _period(*same),
                  "range": [a.isoformat(), b.isoformat()], "prev_range": [pa.isoformat(), pb.isoformat()]}
    return out


def report(start_s, end_s, bucket=None):
    start, end = _d(start_s), _d(end_s)
    if end < start:
        start, end = end, start
    if _span(start, end) > MAX_DAYS:
        start = end - timedelta(days=MAX_DAYS - 1)
    n = _span(start, end)
    if bucket not in ("hour", "day", "week", "month"):
        bucket = "hour" if n == 1 else "day" if n <= 62 else "week" if n <= 190 else "month"
    pstart, pend = start - timedelta(days=n), start - timedelta(days=1)
    per = _counts(start, end)
    cur, prev = _totals(per), _period(pstart, pend)
    u, a, b = uid(), start.isoformat(), end.isoformat()

    # time series
    hours = [0] * 24
    for r in q("""SELECT substr(completed_at,12,2) h, COUNT(*) n FROM tasks WHERE user_id=? AND deleted=0
                  AND completed_at IS NOT NULL AND substr(completed_at,1,10) BETWEEN ? AND ? GROUP BY h""", (u, a, b)):
        if r["h"] and r["h"].isdigit():
            hours[int(r["h"])] += r["n"]
    for r in q("""SELECT substr(done_at,12,2) h, COUNT(*) n FROM day_items WHERE user_id=? AND done=1 AND done_at IS NOT NULL
                  AND date BETWEEN ? AND ? GROUP BY h""", (u, a, b)):
        if r["h"] and r["h"].isdigit():
            hours[int(r["h"])] += r["n"]
    series = []
    if bucket == "hour":
        added_h = [0] * 24
        for r in q("""SELECT substr(created_at,12,2) h, COUNT(*) n FROM tasks WHERE user_id=?
                      AND substr(created_at,1,10)=? GROUP BY h""", (u, a)):
            if r["h"] and r["h"].isdigit():
                added_h[int(r["h"])] += r["n"]
        series = [{"key": f"{h:02d}", "done": hours[h], "added": added_h[h]} for h in range(24)]
    else:
        keys, d = [], start
        while d <= end:
            k = _bucket_key(d, bucket)
            if not keys or keys[-1] != k:
                keys.append(k)
            d += timedelta(days=1)
        acc = {k: {"key": k, "done": 0, "added": 0, "tasks": 0, "routines": 0} for k in keys}
        for day, v in per.items():
            e = acc[_bucket_key(_d(day), bucket)]
            e["done"] += v["tasks"] + v["routines"]
            e["tasks"] += v["tasks"]
            e["routines"] += v["routines"]
            e["added"] += v["added"]
        series = [acc[k] for k in keys]

    weekday = [0] * 7
    for day, v in per.items():
        weekday[_d(day).weekday()] += v["tasks"] + v["routines"]

    names = list_names()
    by_list = [{"name": names.get(r["list_id"], "Genel") if r["list_id"] else "Genel", "done": r["n"]}
               for r in q("""SELECT list_id, COUNT(*) n FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NOT NULL
                             AND substr(completed_at,1,10) BETWEEN ? AND ? GROUP BY list_id ORDER BY n DESC""", (u, a, b))]
    if cur["routines"]:
        by_list.append({"name": "Rutinler", "done": cur["routines"]})
    by_list.sort(key=lambda x: -x["done"])

    routines = [{"title": r["title"], "done": r["d"] or 0, "total": r["t"], "rate": round(100 * (r["d"] or 0) / r["t"])}
                for r in q("""SELECT title, SUM(done) d, COUNT(*) t FROM day_items WHERE user_id=? AND date BETWEEN ? AND ?
                              GROUP BY COALESCE(routine_id, title) ORDER BY t DESC, d DESC LIMIT 12""", (u, a, b))]

    best_day = max(((day, v["tasks"] + v["routines"]) for day, v in per.items()), key=lambda x: x[1], default=None)
    t0 = today_s()
    now = {
        "open": q("SELECT COUNT(*) n FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL", (u,))[0]["n"],
        "overdue": q("""SELECT COUNT(*) n FROM tasks WHERE user_id=? AND deleted=0 AND completed_at IS NULL
                        AND due_date IS NOT NULL AND due_date < ?""", (u, t0))[0]["n"],
    }
    elapsed = _span(start, min(end, _d(t0))) if start <= _d(t0) else 0
    return {
        "start": a, "end": b, "days": n, "bucket": bucket, "prev_range": [pstart.isoformat(), pend.isoformat()],
        "cur": cur, "prev": prev, "avg_per_day": round(cur["done"] / elapsed, 1) if elapsed else None,
        "active_days": sum(1 for v in per.values() if v["tasks"] + v["routines"]),
        "best_day": {"date": best_day[0], "done": best_day[1]} if best_day and best_day[1] else None,
        "series": series, "weekday": weekday, "hours": hours, "by_list": by_list[:10], "routines": routines,
        "streak": _streaks(), "now": now, "quick": _quick(),
    }
