# © 2026 Lailong Macro. Bảo lưu mọi quyền.
"""Shared fetch helpers for the free, public data sources.

Every function returns plain Python lists/dicts and never raises on network
errors: a failed source is logged and returns an empty result, so one broken
feed never stops the whole scan.

Bars are dicts: {"t": unix_seconds, "o", "h", "l", "c", "v"}.
"""
import csv
import io
import json
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (LaiLongDesk personal research)"
ERRORS = []  # collected and shown on the terminal's status line


def _get(url, data=None, headers=None, retries=3, timeout=25, errors="strict"):
    hdrs = {"User-Agent": UA, "Accept": "*/*"}
    hdrs.update(headers or {})
    body = json.dumps(data).encode() if data is not None else None
    if body is not None:
        hdrs["Content-Type"] = "application/json"
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=body, headers=hdrs)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", errors)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"{url[:90]}: {last}")


CALLS = {}  # per source: {"ok": n, "fail": n, "error": last message}, for the status page


def _count(name, ok, err=None):
    c = CALLS.setdefault(name.split()[0].lower(), {"ok": 0, "fail": 0, "error": None, "what": None})
    if ok:
        c["ok"] += 1
    else:
        c["fail"] += 1
        c["error"], c["what"] = str(err)[:200], name


def _safe(name, fn, default):
    try:
        out = fn()
    except Exception as e:  # noqa: BLE001 - a feed failing must not stop the scan
        ERRORS.append(f"{name}: {e}")
        print("WARN", name, e)
        _count(name, False, e)
        return default
    _count(name, True)
    return out


def health_report(desk, extra=None):
    """What this run fetched, per source. Written by each desk and read by pipeline.health."""
    return {"desk": desk, "t": int(time.time()), "sources": CALLS, "errors": len(ERRORS)} | (extra or {})


def save_health(desk, extra=None):
    import os
    from pathlib import Path
    root = Path(os.environ.get("LLD_DATA_DIR") or Path(__file__).resolve().parent.parent / "site" / "data")
    (root / "health").mkdir(parents=True, exist_ok=True)
    (root / "health" / f"{desk}.json").write_text(json.dumps(health_report(desk, extra), separators=(",", ":")))


# ---------------------------------------------------------------- markets
def yahoo_chart(ticker, interval="1d", rng="5y", keep_closed_today=False):
    def run():
        q = urllib.parse.urlencode({"interval": interval, "range": rng, "includePrePost": "false"})
        t = urllib.parse.quote(ticker)
        try:
            raw = _get(f"https://query1.finance.yahoo.com/v8/finance/chart/{t}?{q}", retries=2)
        except RuntimeError:
            raw = _get(f"https://query2.finance.yahoo.com/v8/finance/chart/{t}?{q}", retries=2)
        res = json.loads(raw)["chart"]["result"][0]
        ts = res.get("timestamp") or []
        qd = res["indicators"]["quote"][0]
        bars = []
        for i, t0 in enumerate(ts):
            o, h, l, c = qd["open"][i], qd["high"][i], qd["low"][i], qd["close"][i]
            if None in (o, h, l, c):
                continue
            bars.append({"t": int(t0), "o": o, "h": h, "l": l, "c": c, "v": float(qd["volume"][i] or 0)})
        if keep_closed_today:
            # daily bars: keep every bar dated before today (UTC); only today's may still be trading
            today = time.strftime("%Y-%m-%d", time.gmtime())
            return [b for b in bars if time.strftime("%Y-%m-%d", time.gmtime(b["t"])) < today]
        # the last bar is the session still trading: drop it, only closed bars are used
        return bars[:-1] if len(bars) > 1 else bars

    return _safe(f"yahoo {ticker} {interval}", run, [])


# ------------------------------------------------------------------ macro
def fred_series(series_id):
    """Official US Federal Reserve data (public domain). Returns [(date, value)]."""
    def run():
        raw = _get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}")
        out = []
        for row in csv.DictReader(io.StringIO(raw)):
            vals = list(row.values())
            try:
                out.append((vals[0], float(vals[1])))
            except (ValueError, IndexError):
                continue  # FRED marks holidays with "."
        return out

    return _safe(f"fred {series_id}", run, [])
