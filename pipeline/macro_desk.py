"""Macro statistics desk: long history for the MACRO terminal (rates, yield curve, inflation, growth,
liquidity, credit, energy inventories, crop balance sheets, long-term asset charts, business cycle).

Free sources only, no API keys:
  FRED (St. Louis Fed)       rates, inflation, growth, liquidity, credit, valuation
  EIA (dnav history tables)  weekly US crude, gasoline, distillate, SPR, production, refinery use, gas storage
  USDA FAS PSD               the WASDE balance sheets (production, use, ending stocks) per crop and country
  Yahoo Finance              weekly prices for long-term asset charts

Output: one JSON per screen in site/data/macro/<group>.json, each series as
  {"name", "unit", "src", "freq", "d": [[days_since_1970, value], ...], "st": {stats}}
Daily data is stored weekly (last value of each week) to keep the files small; the last point is exact.
Slow-moving groups are only refetched when their file is older than REFRESH_H hours.

Run:  python -m pipeline.macro_desk            (add --force to ignore the refresh timer)
"""
import csv
import datetime as dt
import io
import json
import os
import re
import sys
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import sources as src
from .sources import ERRORS, _get, _safe, yahoo_chart

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("LLD_MACRO_OUT") or ROOT / "site" / "data" / "macro")
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
EPOCH = dt.date(1970, 1, 1)

# group -> hours between refetches (data in these groups changes at most daily or weekly)
REFRESH_H = {"rates": 3, "infl": 6, "grow": 6, "liq": 6, "energy": 6, "agri": 24, "assets": 3, "cycle": 6}

# key, FRED id, name, unit, transform. Transforms: lvl, yoy (% vs 12 months ago), mom (change vs last
# month), div1000 / div1e6 (unit change), qyoy (quarterly yoy)
FRED = {
    "rates": [
        ("fedfunds", "DFF", "Lãi suất Fed (thực tế qua đêm)", "%", "lvl"),
        ("us3m", "DGS3MO", "Lợi suất Mỹ 3 tháng", "%", "lvl"),
        ("us2y", "DGS2", "Lợi suất Mỹ 2 năm", "%", "lvl"),
        ("us10y", "DGS10", "Lợi suất Mỹ 10 năm", "%", "lvl"),
        ("us30y", "DGS30", "Lợi suất Mỹ 30 năm", "%", "lvl"),
        ("s10y2y", "T10Y2Y", "Chênh lệch 10 năm - 2 năm", "%", "lvl"),
        ("s10y3m", "T10Y3M", "Chênh lệch 10 năm - 3 tháng", "%", "lvl"),
        ("real10y", "DFII10", "Lợi suất thực 10 năm (TIPS)", "%", "lvl"),
        ("termprem", "THREEFYTP10", "Phần bù kỳ hạn 10 năm (ACM)", "%", "lvl"),
        ("mortgage", "MORTGAGE30US", "Lãi vay mua nhà 30 năm", "%", "lvl"),
        ("dollar", "DTWEXBGS", "Chỉ số USD rộng (Fed)", "điểm", "lvl"),
    ],
    "infl": [
        ("cpi", "CPIAUCSL", "CPI (so với cùng kỳ)", "%", "yoy"),
        ("corecpi", "CPILFESL", "CPI lõi (bỏ thực phẩm, năng lượng)", "%", "yoy"),
        ("corepce", "PCEPILFE", "PCE lõi (thước đo Fed nhắm 2%)", "%", "yoy"),
        ("ppi", "PPIFIS", "PPI giá sản xuất (cùng kỳ)", "%", "yoy"),
        ("wages", "AHETPI", "Lương giờ trung bình (cùng kỳ)", "%", "yoy"),
        ("be5y", "T5YIE", "Lạm phát kỳ vọng 5 năm (thị trường)", "%", "lvl"),
        ("fwd5y5y", "T5YIFR", "Lạm phát kỳ vọng 5 năm, bắt đầu sau 5 năm", "%", "lvl"),
        ("mich", "MICH", "Kỳ vọng lạm phát 1 năm (người tiêu dùng)", "%", "lvl"),
    ],
    "grow": [
        ("gdp", "GDPC1", "GDP thực (so với cùng kỳ)", "%", "qyoy"),
        ("gdpq", "A191RL1Q225SBEA", "GDP thực (quý, quy năm)", "%", "lvl"),
        ("unrate", "UNRATE", "Tỷ lệ thất nghiệp", "%", "lvl"),
        ("payrolls", "PAYEMS", "Việc làm phi nông nghiệp (thay đổi tháng)", "nghìn", "mom"),
        ("claims", "ICSA", "Đơn xin trợ cấp thất nghiệp lần đầu", "nghìn", "div1000"),
        ("indpro", "INDPRO", "Sản xuất công nghiệp (cùng kỳ)", "%", "yoy"),
        ("retail", "RSAFS", "Doanh số bán lẻ (cùng kỳ)", "%", "yoy"),
        ("sentiment", "UMCSENT", "Niềm tin người tiêu dùng (UMich)", "điểm", "lvl"),
        ("housing", "HOUST", "Nhà khởi công", "nghìn căn/năm", "lvl"),
        ("cfnai", "CFNAIMA3", "Chỉ số hoạt động quốc gia Chicago (TB 3 tháng)", "điểm", "lvl"),
        ("sahm", "SAHMREALTIME", "Quy tắc Sahm (suy thoái khi ≥ 0,5)", "điểm %", "lvl"),
        ("usrec", "USREC", "Suy thoái Mỹ (NBER)", "", "lvl"),
    ],
    "liq": [
        ("fedbs", "WALCL", "Bảng cân đối Fed", "nghìn tỷ $", "div1e6"),
        ("m2", "M2SL", "Cung tiền M2 (cùng kỳ)", "%", "yoy"),
        ("m2lvl", "M2SL", "Cung tiền M2", "nghìn tỷ $", "div1000"),
        ("rrp", "RRPONTSYD", "Reverse repo qua đêm (RRP)", "tỷ $", "lvl"),
        ("tga", "WTREGEN", "Tài khoản Kho bạc tại Fed (TGA)", "tỷ $", "div1000"),
        ("nfci", "NFCI", "Điều kiện tài chính Chicago (NFCI)", "điểm", "lvl"),
        ("hyoas", "BAMLH0A0HYM2", "Chênh lệch trái phiếu rác (HY OAS)", "%", "lvl"),
        ("igoas", "BAMLC0A0CM", "Chênh lệch trái phiếu doanh nghiệp hạng đầu tư", "%", "lvl"),
        ("lending", "DRTSCILM", "Ngân hàng siết cho vay doanh nghiệp (khảo sát)", "% ròng", "lvl"),
        ("mmf", "MMMFFAQ027S", "Tiền nằm trong quỹ thị trường tiền tệ", "nghìn tỷ $", "div1e6"),
        ("equities", "NCBEILQ027S", "Giá trị cổ phiếu doanh nghiệp Mỹ", "nghìn tỷ $", "div1e6"),
        ("gdpnom", "GDP", "GDP danh nghĩa", "nghìn tỷ $", "div1000"),
    ],
    "energy": [
        ("wti", "DCOILWTICO", "Dầu WTI giao ngay", "$/thùng", "lvl"),
        ("brent", "DCOILBRENTEU", "Dầu Brent giao ngay", "$/thùng", "lvl"),
        ("henryhub", "DHHNGSP", "Khí Henry Hub", "$/MMBtu", "lvl"),
    ],
}

# Weekly EIA petroleum status report and gas storage (history tables on eia.gov, no key needed)
EIA = [
    ("crude", "pet", "WCESTUS1", "Tồn kho dầu thô Mỹ (không gồm SPR)", "triệu thùng", 1000),
    ("spr", "pet", "WCSSTUS1", "Kho dự trữ chiến lược (SPR)", "triệu thùng", 1000),
    ("gasoline", "pet", "WGTSTUS1", "Tồn kho xăng", "triệu thùng", 1000),
    ("distillate", "pet", "WDISTUS1", "Tồn kho dầu cất (diesel, sưởi)", "triệu thùng", 1000),
    ("cushing", "pet", "W_EPC0_SAX_YCUOK_MBBL", "Tồn kho dầu thô Cushing (điểm giao WTI)", "triệu thùng", 1000),
    ("production", "pet", "WCRFPUS2", "Sản lượng dầu thô Mỹ", "triệu thùng/ngày", 1000),
    ("refutil", "pet", "WPULEUS3", "Công suất lọc dầu sử dụng", "%", 1),
    ("natgas", "ng", "NW2_EPG0_SWO_R48_BCF", "Tồn kho khí đốt (48 bang)", "tỷ ft³", 1),
]
SEASONAL = {"crude", "gasoline", "distillate", "cushing", "natgas"}

# USDA Foreign Agricultural Service PSD = the WASDE numbers, as bulk CSV
PSD_FILES = ["psd_grains_pulses_csv.zip", "psd_oilseeds_csv.zip", "psd_coffee_csv.zip", "psd_sugar_csv.zip", "psd_cotton_csv.zip"]
CROPS = [("corn", "Corn", "Ngô", "ZC=F"), ("wheat", "Wheat", "Lúa mì", "ZW=F"), ("soybean", "Oilseed, Soybean", "Đậu tương", "ZS=F"),
         ("rice", "Rice, Milled", "Gạo", "ZR=F"), ("coffee", "Coffee, Green", "Cà phê", "KC=F"),
         ("sugar", "Sugar, Centrifugal", "Đường", "SB=F"), ("cotton", "Cotton", "Bông", "CT=F")]

# world coffee consumption is incomplete before 2002 in PSD (stocks-to-use reads 100-200%)
PSD_START = {"coffee": 2002}
# consumption is named differently per crop (sugar, cotton); the first one present is used
USE_ATTRS = ("Domestic Consumption", "Domestic Use", "Total Dom. Cons.", "Human Dom. Consumption", "Dom. Consumption", "Total Use")
PSD_ATTRS = {"Production", "Exports", "Ending Stocks"} | set(USE_ATTRS)

ASSETS = [("spx", "^GSPC", "S&P 500"), ("ndx", "^IXIC", "Nasdaq Composite"), ("gold", "GC=F", "Vàng"),
          ("silver", "SI=F", "Bạc"), ("copper", "HG=F", "Đồng"), ("oil", "CL=F", "Dầu WTI (tương lai)"),
          ("dxy", "DX-Y.NYB", "Chỉ số USD (DXY)"), ("btc", "BTC-USD", "Bitcoin"), ("em", "EEM", "Cổ phiếu mới nổi (EEM)"),
          ("nikkei", "^N225", "Nikkei 225"), ("tlt", "TLT", "Trái phiếu Mỹ 20+ năm (TLT)")]

CURVE = [("1M", "DGS1MO"), ("3M", "DGS3MO"), ("6M", "DGS6MO"), ("1Y", "DGS1"), ("2Y", "DGS2"), ("3Y", "DGS3"),
         ("5Y", "DGS5"), ("7Y", "DGS7"), ("10Y", "DGS10"), ("20Y", "DGS20"), ("30Y", "DGS30")]


# ------------------------------------------------------------------ helpers
def days(d):
    return (d - EPOCH).days


def fred_raw(sid):
    """[(date, value)] oldest first, full history."""
    def run():
        raw = _get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}", timeout=40)
        out = []
        for row in csv.reader(io.StringIO(raw)):
            try:
                out.append((dt.date.fromisoformat(row[0]), float(row[1])))
            except (ValueError, IndexError):
                continue  # header, or "." for a holiday
        if not out:
            raise RuntimeError("empty series")
        return out
    return _safe(f"fred {sid}", run, [])


def transform(rows, how):
    if how == "lvl" or not rows:
        return rows
    if how == "div1000":
        return [(d, v / 1000) for d, v in rows]
    if how == "div1e6":
        return [(d, v / 1e6) for d, v in rows]
    if how == "mom":
        return [(rows[i][0], rows[i][1] - rows[i - 1][1]) for i in range(1, len(rows))]
    if how in ("yoy", "qyoy"):
        lag = 4 if how == "qyoy" else 12
        return [(rows[i][0], (rows[i][1] / rows[i - lag][1] - 1) * 100) for i in range(lag, len(rows)) if rows[i - lag][1]]
    raise ValueError(how)


def freq_of(rows):
    if len(rows) < 3:
        return "?"
    gap = (rows[-1][0] - rows[-3][0]).days / 2
    return "d" if gap < 4 else "w" if gap < 10 else "m" if gap < 45 else "q"


def weekly(rows):
    """Daily -> last value of each ISO week; the very last observation is kept as is."""
    out = {}
    for d, v in rows:
        out[d.isocalendar()[:2]] = (d, v)
    return list(out.values())


def stats(rows, freq):
    """Last value, changes, where it sits in its own history (full and last 10 years)."""
    if not rows:
        return None
    d, v = rows[-1]
    vals = [x for _, x in rows]
    look = {"d": (5, 21, 252), "w": (1, 4, 52), "m": (1, 1, 12), "q": (1, 1, 4)}.get(freq, (1, 1, 12))

    def back(n):
        return rows[-1 - n][1] if len(rows) > n else None

    def pct(xs):
        return round(sum(1 for x in xs if x <= v) / len(xs) * 100) if xs else None

    cut = d - dt.timedelta(days=3653)
    ten = [x for dd, x in rows if dd >= cut]
    return {"v": round(v, 4), "t": days(d), "prev": back(1), "w": back(look[0]), "m": back(look[1]), "y": back(look[2]),
            "pct": pct(vals), "pct10": pct(ten), "min": round(min(vals), 4), "max": round(max(vals), 4),
            "avg": round(sum(vals) / len(vals), 4), "avg10": round(sum(ten) / len(ten), 4) if ten else None,
            "since": days(rows[0][0])}


def pack(name, unit, src_name, rows, freq=None):
    if not rows:
        return None
    freq = freq or freq_of(rows)
    st = stats(rows, freq)
    keep = weekly(rows) if freq == "d" else rows
    return {"name": name, "unit": unit, "src": src_name, "freq": freq, "st": st,
            "d": [[days(d), round(v, 4)] for d, v in keep]}


def fred_group(group, cache):
    out = {}
    for key, sid, name, unit, how in FRED[group]:
        rows = cache.get(sid) or []
        out[key] = pack(name, unit, f"FRED {sid}", transform(rows, how))
    return out


# ------------------------------------------------------------------ yield curve snapshots
def curve_snapshots(cache):
    """US Treasury curve today vs 1 week, 1 month, 6 months, 1 and 2 years ago (nearest earlier day)."""
    series = {t: dict(cache[sid]) for t, sid in CURVE if cache.get(sid)}
    if "10Y" not in series:
        return None
    dates = sorted(series["10Y"])
    last = dates[-1]
    snaps = []
    for label, delta in (("Hiện tại", 0), ("1 tuần trước", 7), ("1 tháng trước", 30), ("6 tháng trước", 182),
                         ("1 năm trước", 365), ("2 năm trước", 730)):
        target = last - dt.timedelta(days=delta)
        day = max((d for d in dates if d <= target), default=None)
        if day is None:
            continue
        snaps.append({"label": label, "date": day.isoformat(),
                      "y": [series[t].get(day) if t in series else None for t, _ in CURVE]})
    return {"tenors": [t for t, _ in CURVE], "snaps": snaps}


# ------------------------------------------------------------------ EIA
MONTHS = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def parse_eia_weekly(html):
    """EIA dnav weekly history table: rows 'YYYY-Mon' then up to 5 pairs of (MM/DD, value)."""
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        m = re.search(r"(\d{4})-(\w{3})", re.sub(r"<[^>]+>|&nbsp;", " ", row))
        if not m or m.group(2) not in MONTHS:
            continue
        year, mon = int(m.group(1)), MONTHS[m.group(2)]
        cells = [re.sub(r"<[^>]+>|&nbsp;|\s", "", c) for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S | re.I)]
        pairs = [c for c in cells if c and not re.match(r"\d{4}-\w{3}", c)]
        for i in range(0, len(pairs) - 1, 2):
            md, val = pairs[i], pairs[i + 1].replace(",", "")
            dm = re.match(r"(\d{2})/(\d{2})$", md)
            if not dm:
                continue
            try:
                v = float(val)
            except ValueError:
                continue
            mm, dd = int(dm.group(1)), int(dm.group(2))
            y = year + 1 if mm < mon else year  # a December row can hold the first week of January
            try:
                out.append((dt.date(y, mm, dd), v))
            except ValueError:
                continue
    return sorted(dict(out).items())


def eia_series(area, code):
    def run():
        urls = [f"https://www.eia.gov/dnav/{area}/hist/LeafHandler.ashx?n={area.upper()}&s={code}&f=W",
                f"https://www.eia.gov/dnav/{area}/hist/{code.lower()}w.htm"]
        last = None
        for url in urls:
            try:
                rows = parse_eia_weekly(_get(url, headers={"User-Agent": BROWSER_UA}, timeout=40, retries=2))
            except RuntimeError as e:
                last = e
                continue
            if len(rows) >= 50:
                return rows
            last = RuntimeError(f"only {len(rows)} rows parsed from {url}")
        raise last
    rows = _safe(f"eia {code}", run, [])
    if not rows and area == "pet":  # FRED mirrors part of the EIA weekly data
        rows = fred_raw(code)
    return rows


def seasonal(rows):
    """This year and last year by week of year, vs the min / average / max of the 5 years before."""
    if not rows:
        return None
    last_year = rows[-1][0].year
    by = {}
    for d, v in rows:
        wk = min(52, d.isocalendar()[1])
        by.setdefault(d.year, {})[wk] = v
    band = []
    for wk in range(1, 53):
        xs = [by[y][wk] for y in range(last_year - 5, last_year) if wk in by.get(y, {})]
        band.append([wk, round(min(xs), 2), round(sum(xs) / len(xs), 2), round(max(xs), 2)] if xs else [wk, None, None, None])
    cur_wk = min(52, rows[-1][0].isocalendar()[1])
    b = band[cur_wk - 1]
    vs = round((rows[-1][1] / b[2] - 1) * 100, 1) if b[2] else None
    return {"band": band, "years": {str(y): [[w, round(x, 2)] for w, x in sorted(by.get(y, {}).items())] for y in (last_year, last_year - 1)},
            "vs5y_pct": vs, "week": cur_wk, "range": f"{last_year - 5}-{last_year - 1}"}


def energy(cache):
    out = fred_group("energy", cache)
    with ThreadPoolExecutor(4) as ex:
        got = dict(zip([e[0] for e in EIA], ex.map(lambda e: eia_series(e[1], e[2]), EIA)))
    for key, area, code, name, unit, div in EIA:
        rows = [(d, v / div) for d, v in got[key]]
        p = pack(name, unit, f"EIA {code}", rows, "w")
        if p and key in SEASONAL:
            p["season"] = seasonal(rows)
        if p and len(rows) > 1:
            p["st"]["chg_w"] = round(rows[-1][1] - rows[-2][1], 3)
        out[key] = p
    return out


# ------------------------------------------------------------------ USDA PSD (WASDE)
def psd():
    """Production, consumption, ending stocks and stocks-to-use by market year, US and world."""
    want = {c[1]: c for c in CROPS}
    acc = {}  # (crop, scope, year) -> attr -> value
    month, seen = {}, {}
    for f in PSD_FILES:
        def run(f=f):
            req = src.urllib.request.Request(f"https://apps.fas.usda.gov/psdonline/downloads/{f}", headers={"User-Agent": BROWSER_UA})
            with src.urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        blob = _safe(f"usda psd {f}", run, None)
        if not blob:
            continue
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            for name in z.namelist():
                with z.open(name) as fh:
                    for r in csv.DictReader(io.TextIOWrapper(fh, "utf-8", errors="replace")):
                        crop = want.get(r.get("Commodity_Description", "").strip())
                        attr = r.get("Attribute_Description", "").strip()
                        if crop:
                            seen.setdefault(crop[0], set()).add(attr)
                        if not crop or attr not in PSD_ATTRS:
                            continue
                        try:
                            y, v = int(r["Market_Year"]), float(r["Value"])
                        except (KeyError, ValueError):
                            continue
                        country = r.get("Country_Name", "").strip()
                        if country.startswith("World"):
                            continue  # world = sum of countries (EU is one entry, so no double count)
                        scopes = ["world"] + (["us"] if country == "United States" else [])
                        for s in scopes:
                            a = acc.setdefault((crop[0], s, y), {})
                            a[attr] = a.get(attr, 0) + v
                        month[crop[0]] = max(month.get(crop[0], ""), f"{r.get('Calendar_Year', '')}-{str(r.get('Month', '')).zfill(2)}")
                        unit = r.get("Unit_Description", "").strip()
                        acc.setdefault(("unit", crop[0], 0), {})["u"] = unit
    out = {}
    this_year = dt.date.today().year
    for key, desc, name, fut in CROPS:
        crop = {"name": name, "unit": (acc.get(("unit", key, 0)) or {}).get("u", ""), "updated": month.get(key),
                "use_attr": next((k for k in USE_ATTRS if k in seen.get(key, ())), None)}
        if key in ("sugar", "cotton"):
            print("psd attributes", key, sorted(seen.get(key, ())))
        for scope in ("us", "world"):
            rows = []
            for y in range(PSD_START.get(key, 1960), this_year + 2):
                a = acc.get((key, scope, y))
                if not a or not a.get("Ending Stocks"):
                    continue
                cons = next((a[k] for k in USE_ATTRS if a.get(k)), 0)
                use = cons + (a.get("Exports", 0) if scope == "us" else 0)
                rows.append({"y": y, "prod": a.get("Production"), "use": use, "end": a["Ending Stocks"],
                             "stu": round(a["Ending Stocks"] / use * 100, 1) if use else None})
            rows = rows[-35:]
            if rows:
                stus = [r["stu"] for r in rows if r["stu"] is not None]
                last = rows[-1]["stu"]
                crop[scope] = {"rows": rows, "stu_pct": round(sum(1 for x in stus if x <= last) / len(stus) * 100) if last is not None else None}
        if crop.get("world") or crop.get("us"):
            out[key] = crop
    return out


def agri():
    out = {"crops": psd(), "prices": {}}
    for key, _, name, fut in CROPS:
        rows = yahoo_long(fut)
        if rows:
            out["prices"][key] = pack(f"Giá {name} (tương lai)", "", f"Yahoo {fut}", rows, "w")
    return out


# ------------------------------------------------------------------ assets
def yahoo_long(tk):
    """Monthly closes for the full history + weekly closes for the last 10 years (Yahoo thins
    'range=max' weekly requests to quarterly bars, so the two are stitched)."""
    to_rows = lambda bars: [(dt.datetime.fromtimestamp(b["t"], dt.timezone.utc).date(), b["c"]) for b in bars]  # noqa: E731
    wk = to_rows(yahoo_chart(tk, "1wk", "10y"))
    mo = to_rows(yahoo_chart(tk, "1mo", "max"))
    if not wk:
        return mo
    return [r for r in mo if r[0] < wk[0][0]] + wk


def assets(cache):
    out, closes = {}, {}
    for key, tk, name in ASSETS:
        rows = yahoo_long(tk)
        if rows:
            closes[key] = {d.isocalendar()[:2]: (d, v) for d, v in rows}
            out[key] = pack(name, "", f"Yahoo {tk}", rows, "w")

    def ratio(a, b, k=1.0):
        if a not in closes or b not in closes:
            return []
        return [(closes[a][w][0], closes[a][w][1] / closes[b][w][1] * k) for w in sorted(closes[a]) if w in closes[b] and closes[b][w][1]]

    out["gold_spx"] = pack("Vàng / S&P 500", "lần", "Yahoo", ratio("gold", "spx"), "w")
    out["copper_gold"] = pack("Đồng / Vàng (×1000)", "", "Yahoo", ratio("copper", "gold", 1000), "w")
    # S&P 500 in today's dollars (deflated by CPI): how much the market really grew
    cpi = cache.get("CPIAUCSL") or []
    if cpi and "spx" in closes:
        cm = {(d.year, d.month): v for d, v in cpi}
        last_cpi = cpi[-1][1]
        rows = []
        for w in sorted(closes["spx"]):
            d, v = closes["spx"][w]
            c = cm.get((d.year, d.month)) or cm.get(((d - dt.timedelta(days=31)).year, (d - dt.timedelta(days=31)).month))
            if c:
                rows.append((d, v * last_cpi / c))
        out["spx_real"] = pack("S&P 500 sau lạm phát (giá hôm nay)", "", "Yahoo + FRED CPI", rows, "w")
    return out


# ------------------------------------------------------------------ valuation and cash on the sidelines
def valuation(cache):
    out = {}
    eq, gdp = cache.get("NCBEILQ027S") or [], dict(cache.get("GDP") or [])
    rows = [(d, v / 1000 / gdp[d] * 100) for d, v in eq if gdp.get(d)]
    out["buffett"] = pack("Chỉ báo Buffett (vốn hóa / GDP)", "%", "FRED NCBEILQ027S / GDP", rows, "q")
    mmf = dict(cache.get("MMMFFAQ027S") or [])
    rows = [(d, mmf[d] / 1000 / v * 100) for d, v in eq if mmf.get(d) and v]
    out["cash_ratio"] = pack("Tiền quỹ tiền tệ / vốn hóa cổ phiếu", "%", "FRED MMMFFAQ027S / NCBEILQ027S", rows, "q")
    return out


def net_liquidity(cache):
    """Fed balance sheet - Treasury account - reverse repo, in $ billions (weekly, Wednesday)."""
    fa, tga, rrp = dict(cache.get("WALCL") or []), dict(cache.get("WTREGEN") or []), cache.get("RRPONTSYD") or []
    rr = dict(rrp)
    rows = []
    for d in sorted(fa):
        if d not in tga:
            continue
        r = rr.get(d)
        if r is None:  # RRP data starts in 2013 and has holiday gaps: take the last day before
            prior = [x for x in rrp if x[0] <= d][-1:] if rrp and rrp[0][0] <= d else []
            r = prior[0][1] if prior else 0
        rows.append((d, fa[d] / 1000 - tga[d] / 1000 - r))
    return pack("Thanh khoản ròng (Fed - TGA - RRP)", "tỷ $", "FRED WALCL, WTREGEN, RRPONTSYD", rows, "w")


# ------------------------------------------------------------------ business cycle
def cycle(cache, groups):
    """Investment-clock style regime from growth momentum (CFNAI 3m) and inflation momentum (CPI yoy
    vs 6 months earlier), plus a recession checklist. Monthly trail of the last 36 months."""
    cf = transform(cache.get("CFNAIMA3") or [], "lvl")
    cpi = transform(cache.get("CPIAUCSL") or [], "yoy")
    cpi_m = {(d.year, d.month): v for d, v in cpi}
    trail = []
    for d, g in cf[-36:]:
        a = cpi_m.get((d.year, d.month))
        back = d.replace(day=1) - dt.timedelta(days=170)
        b = cpi_m.get((back.year, back.month))
        if a is None or b is None:
            continue
        trail.append({"t": days(d), "g": round(g, 2), "i": round(a - b, 2), "cpi": round(a, 2)})

    def phase(p):
        up_g, up_i = p["g"] > 0 if abs(p["g"]) > 0.05 else None, p["i"] > 0
        if up_g is None:
            up_g = False
        return ("overheat" if up_i else "recovery") if up_g else ("stagflation" if up_i else "reflation")

    for p in trail:
        p["ph"] = phase(p)

    def last(group, key):
        s = (groups.get(group) or {}).get(key)
        return s["st"] if s else None

    checks = []
    s = last("rates", "s10y3m")
    if s:
        mins = min(v for t, v in groups["rates"]["s10y3m"]["d"][-104:])
        checks.append({"k": "curve", "on": s["v"] < 0 or (mins < 0 and s["v"] > 0), "v": s["v"],
                       "txt": "Đường cong 10Y-3M đảo ngược hoặc vừa thoát đảo ngược (thường đi trước suy thoái 6-18 tháng)"})
    s = last("grow", "sahm")
    if s:
        checks.append({"k": "sahm", "on": s["v"] >= 0.5, "v": s["v"], "txt": "Quy tắc Sahm ≥ 0,5: thất nghiệp tăng nhanh"})
    s = last("grow", "claims")
    if s and s.get("y"):
        checks.append({"k": "claims", "on": s["v"] > s["y"] * 1.2, "v": s["v"], "txt": "Đơn trợ cấp thất nghiệp cao hơn 20% so với 1 năm trước"})
    s = last("liq", "hyoas")
    if s:
        checks.append({"k": "hy", "on": s["v"] > 5, "v": s["v"], "txt": "Chênh lệch trái phiếu rác trên 5%: tín dụng căng"})
    s = last("grow", "cfnai")
    if s:
        checks.append({"k": "cfnai", "on": s["v"] < -0.7, "v": s["v"], "txt": "CFNAI 3 tháng dưới -0,7: nền kinh tế đã vào suy thoái theo lịch sử"})
    s = last("liq", "lending")
    if s:
        checks.append({"k": "lending", "on": s["v"] > 20, "v": s["v"], "txt": "Hơn 20% ngân hàng siết cho vay doanh nghiệp"})
    return {"trail": trail, "phase": trail[-1]["ph"] if trail else None, "checks": checks}


# ------------------------------------------------------------------ main
def fresh(group, force):
    f = OUT / f"{group}.json"
    if force or not f.exists():
        return None
    try:
        old = json.loads(f.read_text())
    except ValueError:
        return None
    age_h = (time.time() * 1000 - old.get("generated", 0)) / 3.6e6
    return old if age_h < REFRESH_H[group] else None


def write(group, payload):
    payload = {"generated": int(time.time() * 1000)} | payload
    (OUT / f"{group}.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


def main(force=False):
    t0 = time.time()
    OUT.mkdir(parents=True, exist_ok=True)
    todo = [g for g in REFRESH_H if not fresh(g, force)]
    print("macro desk: refreshing", todo or "nothing (all fresh)")
    if not todo:
        return
    need = set()
    fred_groups = {"rates", "infl", "grow", "liq", "energy"}
    for g in todo:
        if g in fred_groups:
            need |= {s[1] for s in FRED[g]}
    if "rates" in todo or "cycle" in todo:
        need |= {sid for _, sid in CURVE} | {s[1] for g in ("rates", "grow", "liq") for s in FRED[g]}
    if "cycle" in todo or "assets" in todo:
        need |= {"CFNAIMA3", "CPIAUCSL"} | {s[1] for g in ("infl",) for s in FRED[g]}
    if "liq" in todo:
        need |= {"WALCL", "WTREGEN", "RRPONTSYD", "NCBEILQ027S", "GDP", "MMMFFAQ027S"}
    with ThreadPoolExecutor(6) as ex:
        cache = dict(zip(sorted(need), ex.map(fred_raw, sorted(need))))

    groups = {}
    for g in ("rates", "infl", "grow", "liq"):
        if g in todo or "cycle" in todo:
            groups[g] = fred_group(g, cache)
    if "rates" in todo:
        write("rates", {"series": groups["rates"], "curve": curve_snapshots(cache)})
    for g in ("infl", "grow"):
        if g in todo:
            write(g, {"series": groups[g]})
    if "liq" in todo:
        s = groups["liq"]
        s["netliq"] = net_liquidity(cache)
        s.update(valuation(cache))
        write("liq", {"series": s})
    if "energy" in todo:
        write("energy", {"series": energy(cache)})
    if "agri" in todo:
        write("agri", agri())
    if "assets" in todo:
        write("assets", {"series": assets(cache)})
    if "cycle" in todo:
        write("cycle", cycle(cache, groups))

    # small index: what each screen has and when it was built (for the ticker and the status line)
    idx = {"generated": int(time.time() * 1000), "groups": {}}
    for g in REFRESH_H:
        f = OUT / f"{g}.json"
        if f.exists():
            d = json.loads(f.read_text())
            idx["groups"][g] = {"generated": d.get("generated"), "bytes": f.stat().st_size,
                                "series": sum(1 for v in (d.get("series") or {}).values() if v)}
    (OUT / "index.json").write_text(json.dumps(idx, separators=(",", ":")))
    print(f"macro desk: {json.dumps(idx['groups'])} errors={len(ERRORS)} in {time.time() - t0:.0f}s")
    for e in ERRORS[:40]:
        print("  ", e)


if __name__ == "__main__":
    try:
        main(force="--force" in sys.argv)
    except Exception as e:  # the status page should show a crashed desk, then the step still fails
        src.save_health("macro", {"crashed": f"{type(e).__name__}: {e}"[:300]})
        raise
    src.save_health("macro")
