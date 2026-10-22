# © 2026 Lailong Macro. Bảo lưu mọi quyền.
"""Global rates for the MACRO terminal: government bond curves (US, Germany, euro area, UK, Japan) and
policy rates of the 10 most traded currencies. Daily sources, refreshed hourly.

Every block carries `source` and `asOf` (ms) so the page can say how old each number is.

Run:  python -m pipeline.global_desk     -> writes site/data/global.json
"""
import csv
import datetime as dt
import io
import json
import os
import time
from pathlib import Path

from .sources import ERRORS, _get, _safe

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("LLD_GLOBAL_OUT") or ROOT / "site" / "data" / "global.json")
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
TENORS = ["2Y", "5Y", "10Y", "30Y"]


def _ms(day):
    return int(dt.datetime.combine(day, dt.time(), dt.timezone.utc).timestamp() * 1000)


def _series_block(rows):
    """[(date, value)] oldest first -> last value, 1-day and ~1-month changes."""
    rows = [r for r in rows if r[1] is not None]
    if not rows:
        return None
    last_d, last = rows[-1]
    prev = rows[-2][1] if len(rows) > 1 else None
    month = rows[-22][1] if len(rows) > 22 else rows[0][1]
    return {"value": round(last, 4), "prev": prev, "month": month, "asOf": _ms(last_d)}


# ------------------------------------------------------------------ bond curves
def us_curve(today=None):
    """US Treasury daily par yield curve (official, published after the New York close)."""
    today = today or dt.date.today()
    rows = []
    for year in (today.year - 1, today.year) if today.month == 1 else (today.year,):
        raw = _get("https://home.treasury.gov/resource-center/data-chart-center/interest-rates/"
                   f"daily-treasury-rates.csv/{year}/all?type=daily_treasury_yield_curve"
                   f"&field_tdr_date_value={year}&page&_format=csv", headers={"User-Agent": BROWSER_UA})
        rows += list(csv.DictReader(io.StringIO(raw)))
    cols = {"3M": "3 Mo", "2Y": "2 Yr", "5Y": "5 Yr", "10Y": "10 Yr", "30Y": "30 Yr"}
    parsed = sorted(((dt.datetime.strptime(r["Date"], "%m/%d/%Y").date(), r) for r in rows), key=lambda x: x[0])
    out = {}
    for k, c in cols.items():
        out[k] = _series_block([(d, float(r[c])) for d, r in parsed if r.get(c) not in (None, "")])
    return out


def bundesbank(tenor):
    code = {"2Y": "R02XX", "5Y": "R05XX", "10Y": "R10XX", "30Y": "R30XX"}[tenor]
    raw = _get(f"https://api.statistiken.bundesbank.de/rest/data/BBSIS/D.I.ZST.ZI.EUR.S1311.B.A604.{code}.R.A.A._Z._Z.A"
               "?lastNObservations=30&format=csv", headers={"User-Agent": BROWSER_UA})
    rows = []
    for line in raw.splitlines():
        parts = line.split(";")
        if len(parts) >= 2 and len(parts[0]) == 10 and parts[0][4] == "-" and parts[1].strip() not in ("", "."):
            rows.append((dt.date.fromisoformat(parts[0]), float(parts[1].replace(",", "."))))
    return _series_block(rows)


def ecb_curve(tenor):
    """Euro-area AAA government curve (ECB, spot rate)."""
    raw = _get(f"https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_{tenor}"
               "?lastNObservations=30&format=csvdata", headers={"User-Agent": BROWSER_UA})
    rows = [(dt.date.fromisoformat(r["TIME_PERIOD"]), float(r["OBS_VALUE"]))
            for r in csv.DictReader(io.StringIO(raw)) if r.get("OBS_VALUE")]
    return _series_block(sorted(rows))


def boe(code, today=None):
    """Bank of England statistical database (gilt zero-coupon curve and Bank Rate)."""
    today = today or dt.date.today()
    start = (today - dt.timedelta(days=60)).strftime("%d/%b/%Y")
    raw = _get("https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes"
               f"&Datefrom={start}&Dateto=now&SeriesCodes={code}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N",
               headers={"User-Agent": BROWSER_UA})
    rows = []
    for r in csv.DictReader(io.StringIO(raw)):
        try:
            rows.append((dt.datetime.strptime(r["DATE"], "%d %b %Y").date(), float(r[code])))
        except (KeyError, ValueError):
            continue
    return _series_block(rows)


def jgb():
    """Japanese government bond yields, Ministry of Finance (this month + last month for the change)."""
    base = "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate"
    rows = []
    for url in (f"{base}/historical/jgbcme_all.csv", f"{base}/jgbcme.csv"):
        raw = _safe(f"mof {url.rsplit('/', 1)[1]}", lambda u=url: _get(u, headers={"User-Agent": BROWSER_UA}, errors="replace"), "")
        lines = raw.splitlines()
        head = next((i for i, l in enumerate(lines) if l.startswith("Date")), None)
        if head is None:
            continue
        cols = lines[head].split(",")
        for l in lines[head + 1:][-60:]:
            p = l.split(",")
            try:
                d = dt.datetime.strptime(p[0], "%Y/%m/%d").date()
            except ValueError:
                continue
            rows.append((d, dict(zip(cols, p))))
    rows = sorted(dict(rows).items())
    out = {}
    for k in ("2Y", "5Y", "10Y", "30Y"):
        vals = []
        for d, r in rows:
            try:
                vals.append((d, float(r[k])))
            except (KeyError, ValueError):
                continue
        out[k] = _series_block(vals)
    return out


def curve_state(c):
    """The four classic moves of a yield curve over ~1 month, from the 2Y (else 5Y) and the 10Y."""
    a, b = c.get("2Y") or c.get("5Y"), c.get("10Y")
    if not a or not b:
        return None
    d2, d10 = (a["value"] - a["month"]) * 100, (b["value"] - b["month"]) * 100
    slope_chg = d10 - d2
    if abs(slope_chg) < 5:
        kind = "parallel_up" if d10 > 5 else "parallel_down" if d10 < -5 else "stable"
    elif slope_chg > 0:
        kind = "bear_steepener" if d10 > 0 and abs(d10) >= abs(d2) else "bull_steepener"
    else:
        kind = "bear_flattener" if d2 > 0 and abs(d2) >= abs(d10) else "bull_flattener"
    return {"kind": kind, "d2_bp": round(d2, 1), "d10_bp": round(d10, 1),
            "slope_bp": round((b["value"] - a["value"]) * 100, 1)}


def bond_curves():
    us = _safe("treasury curve", us_curve, {})
    de = {t: _safe(f"bundesbank {t}", lambda t=t: bundesbank(t), None) for t in TENORS}
    ea = {t: _safe(f"ecb curve {t}", lambda t=t: ecb_curve(t), None) for t in TENORS}
    uk = {"5Y": _safe("boe 5Y", lambda: boe("IUDSNZC"), None), "10Y": _safe("boe 10Y", lambda: boe("IUDMNZC"), None),
          "20Y": _safe("boe 20Y", lambda: boe("IUDLNZC"), None)}
    jp = _safe("mof jgb", jgb, {})
    out = {
        "US": {"name": "Mỹ", "source": "US Treasury", "curve": us},
        "DE": {"name": "Đức", "source": "Deutsche Bundesbank", "curve": de},
        "EA": {"name": "Khu vực euro (AAA)", "source": "ECB", "curve": ea},
        "UK": {"name": "Anh", "source": "Bank of England", "curve": uk},
        "JP": {"name": "Nhật", "source": "Japan MOF", "curve": jp},
    }
    for v in out.values():
        v["state"] = curve_state(v["curve"])
    spreads = {}
    for a, b in (("US", "DE"), ("US", "JP"), ("US", "UK")):
        x, y = out[a]["curve"].get("10Y"), out[b]["curve"].get("10Y")
        if x and y:
            spreads[f"{a}-{b}"] = {"value_bp": round((x["value"] - y["value"]) * 100, 1),
                                   "month_bp": round(((x["value"] - y["value"]) - (x["month"] - y["month"])) * 100, 1)}
    return {"curves": out, "spreads10y": spreads}


# ------------------------------------------------------------------ central banks
# The 10 most traded currencies (BIS Triennial Survey 2022) and their central banks.
CB = [("US", "USD", "Fed"), ("XM", "EUR", "ECB"), ("JP", "JPY", "BoJ"), ("GB", "GBP", "BoE"), ("CN", "CNY", "PBoC"),
      ("AU", "AUD", "RBA"), ("CA", "CAD", "BoC"), ("CH", "CHF", "SNB"), ("HK", "HKD", "HKMA"), ("SG", "SGD", "MAS")]


def policy_rates(today=None):
    """BIS central bank policy rates (daily), with the date and size of the last change."""
    today = today or dt.date.today()
    start = (today - dt.timedelta(days=3 * 365)).isoformat()
    raw = _get(f"https://stats.bis.org/api/v1/data/WS_CBPOL/D.{'+'.join(c for c, _, _ in CB)}/all"
               f"?startPeriod={start}&format=csv", headers={"User-Agent": BROWSER_UA})
    series = {}
    for r in csv.DictReader(io.StringIO(raw)):
        try:
            v = float(r["OBS_VALUE"])
            if v == v:  # BIS marks missing days as NaN
                series.setdefault(r["REF_AREA"], []).append((dt.date.fromisoformat(r["TIME_PERIOD"]), v))
        except (KeyError, ValueError):
            continue
    out = []
    for area, cur, bank in CB:
        rows = sorted(series.get(area, []))
        if not rows:
            out.append({"area": area, "currency": cur, "bank": bank, "rate": None})
            continue
        last_d, last = rows[-1]
        change = None
        for d, v in reversed(rows):
            if abs(v - last) > 1e-9:
                change = {"date": rows[rows.index((d, v)) + 1][0].isoformat(), "from": v, "bp": round((last - v) * 100)}
                break
        year_ago = next((v for d, v in rows if d >= today - dt.timedelta(days=365)), rows[0][1])
        out.append({"area": area, "currency": cur, "bank": bank, "rate": last, "asOf": _ms(last_d),
                    "lastChange": change, "change12m_bp": round((last - year_ago) * 100)})
    return out


def main():
    t0 = time.time()
    data = {"generated": int(time.time() * 1000), "bonds": bond_curves(), "policy_rates": _safe("bis policy rates", policy_rates, [])}
    data["errors"] = ERRORS[:30]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"global desk: curves={sum(1 for c in data['bonds']['curves'].values() for v in c['curve'].values() if v)} "
          f"rates={sum(1 for r in data['policy_rates'] if r.get('rate') is not None)} errors={len(ERRORS)} in {time.time() - t0:.0f}s")
    for e in ERRORS:
        print("  ", e)


if __name__ == "__main__":
    from . import sources as _src
    try:
        main()
    except Exception as e:  # the status page should show a crashed desk, then the step still fails
        _src.save_health("global", {"crashed": f"{type(e).__name__}: {e}"[:300]})
        raise
    _src.save_health("global")
