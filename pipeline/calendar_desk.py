"""Official release dates for the terminal's calendar (CAL screen), read from each agency's own schedule page.

    Fed     FOMC meetings, every year the Fed has published (decision on the second day)
    USDA    WASDE release dates
    BEA     GDP (advance / second / third estimate) and Personal Income and Outlays (core PCE)
    Census  retail sales, housing starts

BLS (CPI, jobs report, PPI) blocks automated requests, so those dates stay estimated in the browser from
their usual rule. Any page that fails keeps the dates from the last good run. Schedules change rarely, so
the pages are re-read once a day.

Run:  python -m pipeline.calendar_desk [--force]   -> writes site/data/calendar.json
"""
import datetime as dt
import html
import json
import os
import re
import sys
import time
from pathlib import Path

from .sources import _get, _safe

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("LLD_CAL_OUT") or ROOT / "site" / "data" / "calendar.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      "Accept": "text/html,*/*", "Accept-Language": "en-US,en;q=0.9"}
REFRESH_H = 24
MONTHS = {m: i + 1 for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august",
                                           "september", "october", "november", "december"])}


def _month(name):
    n = name.strip().lower()[:3]
    return next((v for k, v in MONTHS.items() if k.startswith(n)), 0) if len(n) == 3 else 0


def _ev(k, day, hhmm, label=""):
    return {"k": k, "date": day.isoformat(), "time": hhmm, "label": label}


def _text(raw):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " | ", raw)))


# ------------------------------------------------------------------ parsers (pure, tested offline)
def parse_fomc(raw):
    """Fed calendar page -> one event per scheduled meeting, dated on its decision (second) day."""
    out = []
    parts = re.split(r"(\d{4}) FOMC Meetings", raw)
    for i in range(1, len(parts) - 1, 2):
        year = int(parts[i])
        for mon, days in re.findall(r'fomc-meeting__month[^>]*>\s*<strong>([^<]+)</strong>.*?fomc-meeting__date[^>]*>([^<]+)<', parts[i + 1], re.S):
            m = re.match(r"\s*(\d{1,2})\s*-\s*(\d{1,2})", days)
            if not m:
                continue  # notation votes and unscheduled calls have no two-day range
            mons = [x for x in re.split(r"[/-]", mon) if x.strip()]
            first, last = int(m.group(1)), int(m.group(2))
            mo = _month(mons[-1] if last < first else mons[0])
            if mo:
                out.append(_ev("fomc", dt.date(year, mo, last), "14:00", "có dự báo kinh tế (SEP)" if "*" in days else ""))
    return out


def parse_wasde(raw):
    out = []
    for year, lst in re.findall(r"In (\d{4}) the WASDE report will be released on (.*?and [A-Z][a-z]{2}\.? \d{1,2})", _text(raw)):
        for mon, day in re.findall(r"([A-Z][a-z]{2})[a-z]*\.? (\d{1,2})", lst):
            mo = _month(mon)
            if mo:
                out.append(_ev("wasde", dt.date(int(year), mo, int(day)), "12:00"))
    return out


def _hhmm(t):
    m = re.match(r"\s*(\d{1,2}):(\d{2})\s*([AP])M", t, re.I)
    if not m:
        return ""
    h = int(m.group(1)) % 12 + (12 if m.group(3).upper() == "P" else 0)
    return f"{h:02d}:{m.group(2)}"


GDP_KIND = {"advance": "bản sơ bộ", "second": "bản lần 2", "third": "bản lần 3"}


def parse_bea(raw, year):
    out = []
    for date, tm, title in re.findall(r'release-date">([^<]+)</div>\s*<small[^>]*>([^<]+)</small>.*?release-title[^>]*>([^<]+)<', raw, re.S):
        title = html.unescape(title).strip()
        mon, day = date.split()[0], int(date.split()[1])
        d = dt.date(year, _month(mon), day)
        g = re.match(r"GDP \((Advance|Second|Third) Estimate\).*?(\d)(?:st|nd|rd|th) Quarter", title)
        if g:
            out.append(_ev("gdp", d, _hhmm(tm), f"{GDP_KIND[g.group(1).lower()]} Q{g.group(2)}"))
        p = re.match(r"Personal Income and Outlays, (?:\w+ and )?(\w+) (\d{4})", title)
        if p and _month(p.group(1)):
            out.append(_ev("pce", d, _hhmm(tm), f"số T{_month(p.group(1))}"))
    return out


def bea_year(raw, today):
    """The 'full' schedule page is the current year; its tabs link the year before and after."""
    years = sorted({int(y) for y in re.findall(r"/news/schedule/(\d{4})", raw)})
    for a, b in zip(years, years[1:]):
        if b - a == 2:
            return a + 1
    return today.year


CENSUS = {"Advance Monthly Sales for Retail and Food Services": "retail",
          "New Residential Construction (Building Permits, Housing Starts, and Housing Completions)": "housing"}


def parse_census(raw):
    """Census indicator calendar: one table row per release (name, date, time, period, hidden Ayyyymmddhhmm)."""
    out = []
    for row in re.split(r"<tr\b", raw)[1:]:
        cells = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", c))).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        k = CENSUS.get(cells[0]) if cells else None
        code = re.search(r"A(\d{12})", row)
        if not k or not code:
            continue
        code = code.group(1)
        period = next((re.match(r"([A-Z][a-z]+) \d{4}$", x) for x in cells[1:] if re.match(r"[A-Z][a-z]+ \d{4}$", x)), None)
        d = dt.date(int(code[:4]), int(code[4:6]), int(code[6:8]))
        out.append(_ev(k, d, f"{code[8:10]}:{code[10:12]}", f"số T{_month(period.group(1))}" if period else ""))
    return out


# ------------------------------------------------------------------ run
def fetch_all(today=None):
    today = today or dt.date.today()
    got = {}
    got["fed"] = _safe("fed fomc calendar", lambda: parse_fomc(_get("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", headers=UA)), None)
    got["usda"] = _safe("usda wasde dates", lambda: parse_wasde(_get(
        "https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report", headers=UA)), None)

    def bea():
        raw = _get("https://www.bea.gov/news/schedule/full", headers=UA)
        y = bea_year(raw, today)
        ev = parse_bea(raw, y)
        if f"/news/schedule/{y + 1}" in raw:
            try:
                ev += parse_bea(_get(f"https://www.bea.gov/news/schedule/{y + 1}", headers=UA), y + 1)
            except RuntimeError:
                pass  # next year's page is optional
        return ev
    got["bea"] = _safe("bea release schedule", bea, None)
    got["census"] = _safe("census indicator calendar", lambda: parse_census(_get("https://www.census.gov/economic-indicators/calendar-listview.html", headers=UA)), None)
    return got


def merge(old, got, now_ms):
    """Per source: fresh events when the page parsed to something, else the last good ones."""
    srcs = dict(old.get("sources") or {})
    for name, ev in got.items():
        if ev:
            srcs[name] = {"events": ev, "updated": now_ms}
    cut = (dt.datetime.fromtimestamp(now_ms / 1000, dt.timezone.utc).date() - dt.timedelta(days=60)).isoformat()
    for s in srcs.values():
        s["events"] = [e for e in s["events"] if e["date"] >= cut]
    events = sorted((e for s in srcs.values() for e in s["events"]), key=lambda e: (e["date"], e["time"]))
    return {"generated": now_ms, "sources": srcs, "events": events}


def main(force=False):
    try:
        old = json.loads(OUT.read_text())
    except (OSError, ValueError):
        old = {}
    if not force and old.get("generated") and time.time() - old["generated"] / 1000 < REFRESH_H * 3600:
        print("calendar desk: fresh, skipped")
        return
    out = merge(old, fetch_all(), int(time.time() * 1000))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("calendar desk:", {k: len(v["events"]) for k, v in out["sources"].items()})


if __name__ == "__main__":
    from . import sources as _src
    try:
        main("--force" in sys.argv)
    except Exception as e:
        _src.save_health("calendar", {"crashed": f"{type(e).__name__}: {e}"[:300]})
        raise
    _src.save_health("calendar")
