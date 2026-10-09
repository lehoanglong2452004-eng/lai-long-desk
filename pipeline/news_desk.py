"""Data for the Lai Long Desk news page (site/news): quotes, futures curves, crypto,
international headlines (title + link only) and the economic calendar.

Run:  python -m pipeline.news_desk     -> writes site/news/data.json
"""
import datetime as dt
import email.utils
import html
import json
import os
import re
import time
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

from .sources import ERRORS, _get, _safe

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("LLD_NEWS_OUT") or ROOT / "site" / "news" / "data.json")

INDICES = [("^GSPC", "S&P 500", "US"), ("^NDX", "Nasdaq 100", "US"), ("^DJI", "Dow Jones", "US"),
           ("^RUT", "Russell 2000", "US"), ("^VIX", "VIX", "CBOE"), ("^N225", "Nikkei 225", "JP"),
           ("^STOXX50E", "Euro Stoxx 50", "EU"), ("^FTSE", "FTSE 100", "UK")]
STOCKS = [("NVDA", "Nvidia"), ("AAPL", "Apple"), ("GOOGL", "Alphabet"), ("MSFT", "Microsoft"),
          ("AMZN", "Amazon"), ("META", "Meta Platforms"), ("AVGO", "Broadcom")]
FOREX = [("EUR/USD", "EURUSD=X", 4), ("USD/JPY", "JPY=X", 2), ("GBP/USD", "GBPUSD=X", 4), ("USD/CNY", "CNY=X", 4),
         ("AUD/USD", "AUDUSD=X", 4), ("USD/CAD", "CAD=X", 4), ("USD/CHF", "CHF=X", 4), ("USD/HKD", "HKD=X", 4),
         ("USD/SGD", "SGD=X", 4), ("NZD/USD", "NZDUSD=X", 4)]
# root, exchange suffix, listed months, decimals, unit, names
FUTURES = [
    ("CL", "NYM", "FGHJKMNQUVXZ", 2, "USD/bbl", "Dầu thô WTI", "WTI Crude Oil"),
    ("BZ", "NYM", "FGHJKMNQUVXZ", 2, "USD/bbl", "Dầu Brent", "Brent Crude Oil"),
    ("NG", "NYM", "FGHJKMNQUVXZ", 3, "USD/MMBtu", "Khí tự nhiên", "Natural Gas"),
    ("GC", "CMX", "GJMQVZ", 1, "USD/oz", "Vàng", "Gold"),
    ("SI", "CMX", "FHKNUZ", 3, "USD/oz", "Bạc", "Silver"),
    ("HG", "CMX", "HKNUZ", 4, "USD/lb", "Đồng", "Copper"),
    ("PL", "NYM", "FJNV", 1, "USD/oz", "Bạch kim", "Platinum"),
    ("ZC", "CBT", "HKNUZ", 2, "USc/bu", "Ngô", "Corn"),
    ("ZS", "CBT", "FHKNQUX", 2, "USc/bu", "Đậu tương", "Soybeans"),
]
MONTHS = "FGHJKMNQUVXZ"
MONTH_NAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# Public RSS feeds. Only headline, link, source and time are kept; every item links to the publisher.
FEEDS = [
    ("CNBC", "https://www.cnbc.com/id/100003114/device/rss/rss.html"),
    ("CNBC", "https://www.cnbc.com/id/20910258/device/rss/rss.html"),
    ("Bloomberg", "https://feeds.bloomberg.com/markets/news.rss"),
    ("MarketWatch", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    ("Investing.com", "https://www.investing.com/rss/news.rss"),
    ("Seeking Alpha", "https://seekingalpha.com/market_currents.xml"),
    ("Nasdaq", "https://www.nasdaq.com/feed/rssoutbound?category=Markets"),
    ("ForexLive", "https://www.forexlive.com/feed/news"),
    ("OilPrice", "https://oilprice.com/rss/main"),
    ("Mining.com", "https://www.mining.com/feed/"),
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("Cointelegraph", "https://cointelegraph.com/rss"),
    ("Decrypt", "https://decrypt.co/feed"),
    ("Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml"),
    ("ECB", "https://www.ecb.europa.eu/rss/press.html"),
]
TOPICS = {
    "macro": r"\b(fed|fomc|powell|inflation|cpi|pce|gdp|payroll|jobs|unemployment|rate (cut|hike)s?|interest rates?|central bank|ecb|boj|boe|treasur(y|ies)|yields?|recession|tariffs?)\b",
    "stocks": r"\b(stocks?|shares|equit(y|ies)|s&p|nasdaq|dow|earnings|ipo|wall street)\b",
    "forex": r"\b(dollar|euro|yen|sterling|pound|yuan|forex|fx|currenc(y|ies)|dxy)\b",
    "crypto": r"\b(bitcoin|btc|ether(eum)?|crypto|stablecoin|token|blockchain|solana|xrp|defi)\b",
    "energy": r"\b(oil|crude|brent|wti|opec|natural gas|lng|gasoline|energy)\b",
    "metals": r"\b(gold|silver|copper|platinum|palladium|metals?|mining)\b",
}
CRYPTO_SOURCES = {"CoinDesk", "Cointelegraph", "Decrypt"}
STABLE = {"tether", "usd-coin", "ethena-usde", "dai", "usds", "first-digital-usd", "paypal-usd", "true-usd",
          "usd1-wlfi", "frax", "ripple-usd", "falcon-finance", "global-dollar", "binance-bridged-usdt-bnb-smart-chain"}
RETENTION_MS = 8 * 3600 * 1000
PAUSE = 0.2  # seconds between contract lookups, to stay polite with Yahoo


def yahoo_quote(ticker, probe=False):
    """Latest price, change vs previous close and session volume from Yahoo's chart metadata.

    probe=True: the ticker is a guessed futures expiry; a 404 means "not listed" and is not a source error.
    """
    def run():
        t = urllib.parse.quote(ticker)
        try:
            raw = _get(f"https://query1.finance.yahoo.com/v8/finance/chart/{t}?range=5d&interval=1d", retries=2)
        except Exception as e:  # noqa: BLE001
            if probe and "404" in str(e):
                return None
            raise
        res = json.loads(raw)["chart"]["result"][0]
        m = res["meta"]
        closes = [c for c in res["indicators"]["quote"][0].get("close") or [] if c is not None]
        price = m.get("regularMarketPrice") or (closes[-1] if closes else None)
        prev = closes[-2] if len(closes) >= 2 else m.get("chartPreviousClose")
        if price is None:
            return None
        return {"price": price, "changePct": (price - prev) / prev * 100 if prev else None,
                "volume": m.get("regularMarketVolume")}

    return _safe(f"yahoo quote {ticker}", run, None)


def quotes():
    idx = []
    for tk, label, sub in INDICES:
        q = yahoo_quote(tk)
        if q:
            idx.append({"id": f"idx:{tk}", "label": label, "sub": sub, **{k: q[k] for k in ("price", "changePct")}})
    stk = []
    for tk, name in STOCKS:
        q = yahoo_quote(tk)
        if q:
            stk.append({"id": f"stk:{tk}", "label": tk, "sub": name, "price": q["price"], "changePct": q["changePct"],
                        "volume": q["volume"], "marketCap": None})
    fx = []
    for label, tk, d in FOREX:
        q = yahoo_quote(tk)
        if q:
            fx.append({"id": f"fx:{label}", "label": label, "sub": "", "price": q["price"],
                       "changePct": q["changePct"], "decimals": d})
    q = yahoo_quote("DX-Y.NYB")
    if q:
        fx.append({"id": "fx:DXY", "label": "DXY", "sub": "US Dollar Index", "price": q["price"],
                   "changePct": q["changePct"], "decimals": 2})
    return idx, stk, fx


def futures_curves(now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    out = []
    for root, ex, listed, dec, unit, vi, en in FUTURES:
        cands = []
        # start from next month: energy contracts for the current month expire before it begins (a 404 on every scan)
        y, m = (now.year + 1, 1) if now.month == 12 else (now.year, now.month + 1)
        while len(cands) < 6 and y < now.year + 3:
            code = MONTHS[m - 1]
            if code in listed:
                cands.append((f"{root}{code}{y % 100:02d}.{ex}", f"{MONTH_NAME[m - 1]} {y}"))
            m += 1
            if m > 12:
                m, y = 1, y + 1
        got = []
        for sym, label in cands:
            q = yahoo_quote(sym, probe=True)
            if q and q["price"]:
                got.append({"symbol": sym, "code": label, "price": q["price"], "changePct": q["changePct"],
                            "volume": q["volume"] or 0})
            time.sleep(PAUSE)
        if not got:
            continue
        # the most active contract leads; show it and the two expiries after it
        a = max(range(len(got)), key=lambda i: got[i]["volume"])
        cs = got[a:a + 3]
        structure, spread = None, None
        if len(cs) >= 2:
            diffs = [cs[i + 1]["price"] - cs[i]["price"] for i in range(len(cs) - 1)]
            structure = "contango" if all(d > 0 for d in diffs) else "backwardation" if all(d < 0 for d in diffs) else "mixed"
            spread = (cs[-1]["price"] - cs[0]["price"]) / cs[0]["price"] * 100
        out.append({"root": root, "label": {"vi": vi, "en": en}, "unit": unit, "decimals": dec,
                    "contracts": cs, "structure": structure, "spreadPct": spread})
    return out


def crypto():
    def run():
        rows = json.loads(_get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc"
                               "&per_page=80&page=1&sparkline=false"))
        out = []
        for c in rows:
            if c["id"] in STABLE or (re.search(r"usd|eur", c["symbol"], re.I) and abs((c["current_price"] or 0) - 1) < 0.05):
                continue
            out.append({"id": f"cry:{c['id']}", "label": c["symbol"].upper(), "sub": c["name"],
                        "price": c["current_price"], "changePct": c["price_change_percentage_24h"],
                        "volume": c["total_volume"], "marketCap": c["market_cap"]})
        return out[:50]

    return _safe("coingecko", run, [])


def _text(el, *names):
    for n in names:
        x = el.find(n)
        if x is not None:
            return (x.text or x.get("href") or "").strip()
    return ""


def _when(s):
    if not s:
        return None
    try:
        return int(email.utils.parsedate_to_datetime(s).timestamp() * 1000)
    except (TypeError, ValueError):
        pass
    try:
        return int(dt.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp() * 1000)
    except ValueError:
        return None


def parse_feed(source, xml_text):
    root = ET.fromstring(xml_text)
    atom = "{http://www.w3.org/2005/Atom}"
    items = root.findall(".//item") or root.findall(f".//{atom}entry")
    out = []
    for it in items:
        title = re.sub(r"\s+", " ", _text(it, "title", f"{atom}title"))
        link = _text(it, "link", f"{atom}link")
        when = _when(_text(it, "pubDate", f"{atom}published", f"{atom}updated",
                           "{http://purl.org/dc/elements/1.1/}date"))
        if not title or not link.startswith("http") or not when:
            continue
        low = title.lower()
        topics = [k for k, rx in TOPICS.items() if re.search(rx, low)]
        if source in CRYPTO_SOURCES and "crypto" not in topics:
            topics.insert(0, "crypto")
        out.append({"title": title, "link": link, "source": source, "summary": None, "published": when, "topics": topics})
    return out


def news(now_ms):
    seen, out = set(), []
    for source, url in FEEDS:
        for n in _safe(f"rss {source}", lambda: parse_feed(source, _get(url, retries=2)), []):
            key = re.sub(r"\W+", "", n["title"].lower())[:80]
            if key in seen or now_ms - n["published"] > RETENTION_MS or n["published"] > now_ms + 600000:
                continue
            seen.add(key)
            out.append(n)
    out.sort(key=lambda n: -n["published"])
    return out[:150]


# Nasdaq's public calendar gives actual / consensus / previous; times are New York time.
NASDAQ_CAL = "https://api.nasdaq.com/api/calendar/economicevents?date={d}"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
CURRENCY = {"United States": "USD", "Euro Zone": "EUR", "Germany": "EUR", "France": "EUR", "Italy": "EUR",
            "Spain": "EUR", "United Kingdom": "GBP", "Japan": "JPY", "China": "CNY", "Canada": "CAD",
            "Australia": "AUD", "New Zealand": "NZD", "Switzerland": "CHF"}
HIGH = re.compile(r"non-?farm|\bcpi\b|consumer price index|\bpce\b|\bgdp\b|rate decision|interest rate|fomc|"
                  r"fed chair|powell|unemployment rate|retail sales|ism (manufacturing|non-manufacturing) pmi|"
                  r"employment change(?! weekly)|average hourly earnings|jolts", re.I)
MEDIUM = re.compile(r"\bppi\b|\bpmi\b|jobless claims|\badp\b|trade balance|industrial production|confidence|"
                    r"sentiment|\bzew\b|\bifo\b|durable goods|housing starts|building permits|home sales|"
                    r"crude oil|speaks|factory orders|ivey|tankan|employment|inflation|wage|earnings", re.I)
NY = None


def _et():
    global NY
    if NY is None:
        from zoneinfo import ZoneInfo
        NY = ZoneInfo("America/New_York")
    return NY


def _clean(v):
    v = html.unescape(str(v or "")).replace("\xa0", " ").strip()
    return "" if v in ("", "-", "--") else v


def _words(t):
    return set(re.findall(r"[a-z0-9]+", t.lower().replace("-", ""))) - {"m", "y", "q", "s", "a", "of", "the", "and"}


def nasdaq_day(day):
    """One New York calendar day of events for the major currencies."""
    raw = _get(NASDAQ_CAL.format(d=day.isoformat()), headers={"User-Agent": BROWSER_UA, "Accept": "application/json"},
               retries=2)
    rows = (json.loads(raw).get("data") or {}).get("rows") or []
    out = []
    for r in rows:
        cur = CURRENCY.get(r.get("country", ""))
        m = re.match(r"^(\d{1,2}):(\d{2})$", (r.get("gmt") or "").strip())
        if not cur or not m:
            continue  # minor countries, holidays and "All Day" items
        when = dt.datetime(day.year, day.month, day.day, int(m[1]), int(m[2]), tzinfo=_et())
        title = _clean(r.get("eventName"))
        if not title:
            continue
        impact = 3 if HIGH.search(title) and "speak" not in title.lower() else 2 if MEDIUM.search(title) else 1
        out.append({"date": int(when.timestamp() * 1000), "country": cur, "title": title, "impact": impact,
                    "actual": _clean(r.get("actual")), "forecast": _clean(r.get("consensus")),
                    "previous": _clean(r.get("previous"))})
    return out


def ff_week():
    """Forex Factory's weekly export: used for its impact ratings and as a fallback."""
    rows = json.loads(_get("https://nfs.faireconomy.media/ff_calendar_thisweek.json"))
    imp = {"High": 3, "Medium": 2, "Low": 1}
    out = []
    for r in rows:
        when = _when(r.get("date"))
        if r.get("impact") in imp and when:
            out.append({"date": when, "country": r.get("country", ""), "title": r.get("title", ""),
                        "impact": imp[r["impact"]], "actual": r.get("actual", "") or "",
                        "forecast": r.get("forecast", "") or "", "previous": r.get("previous", "") or ""})
    return out


def merge_calendar(nq, ff):
    """Nasdaq rows (with actuals) take Forex Factory's impact when the same event matches.
    Forex Factory fills the days Nasdaq has not published yet, and adds high-impact items
    Nasdaq does not list (for example FOMC minutes)."""
    used = set()
    for r in nq:
        best, score = None, 0.0
        for i, f in enumerate(ff):
            if f["country"] != r["country"] or abs(f["date"] - r["date"]) > 36 * 3600 * 1000:
                continue
            a, b = _words(r["title"]), _words(f["title"])
            j = len(a & b) / max(1, len(a | b))
            if j > score:
                best, score = i, j
        if best is not None and score >= 0.5:
            used.add(best)
            r["impact"] = max(r["impact"], ff[best]["impact"])
            r["forecast"] = r["forecast"] or ff[best]["forecast"]
    covered = {dt.datetime.fromtimestamp(r["date"] / 1000, _et()).date() for r in nq}
    extra = [f for i, f in enumerate(ff) if i not in used and f["impact"] >= 2
             and (f["impact"] == 3 or dt.datetime.fromtimestamp(f["date"] / 1000, _et()).date() not in covered)
             and not any(r["country"] == f["country"] and abs(r["date"] - f["date"]) < 3600 * 1000
                         and len(_words(r["title"]) & _words(f["title"])) >= 2 for r in nq)]
    return sorted(nq + extra, key=lambda r: (r["date"], -r["impact"]))


def calendar(now=None):
    """This week's events (Monday to Sunday, New York time) with actual figures as they are released."""
    now = (now or dt.datetime.now(dt.timezone.utc)).astimezone(_et())
    monday = now.date() - dt.timedelta(days=now.weekday())
    nq = []
    for k in range(7):
        nq += _safe(f"nasdaq calendar {monday + dt.timedelta(days=k)}", lambda: nasdaq_day(monday + dt.timedelta(days=k)), [])
    ff = _safe("forex factory calendar", ff_week, [])
    return merge_calendar(nq, ff) if nq else sorted(ff, key=lambda r: r["date"])


def main():
    t0 = time.time()
    now_ms = int(time.time() * 1000)
    idx, stk, fx = quotes()
    data = {
        "generatedAt": now_ms, "sample": False,
        "indices": idx, "stocks": stk, "forex": fx, "crypto": crypto(),
        "futures": futures_curves(), "news": news(now_ms), "calendar": calendar(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"news desk: indices={len(idx)} stocks={len(stk)} fx={len(fx)} crypto={len(data['crypto'])} "
          f"futures={len(data['futures'])} news={len(data['news'])} calendar={len(data['calendar'])} "
          f"errors={len(ERRORS)} in {time.time() - t0:.0f}s")
    for e in ERRORS:
        print("  ", e)


if __name__ == "__main__":
    from . import sources as _src
    try:
        main()
    except Exception as e:  # the status page should show a crashed desk, then the step still fails
        _src.save_health("news", {"crashed": f"{type(e).__name__}: {e}"[:300]})
        raise
    _src.save_health("news")
