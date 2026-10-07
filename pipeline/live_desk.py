"""Fast refresh for the news page: quotes, headlines and the economic calendar (with actual figures).

Runs every few minutes on GitHub Actions and is published to the `live-data` branch, which the
page reads from raw.githubusercontent.com. Live ticks between refreshes come from the browser.

Run:  python -m pipeline.live_desk     -> writes live/live.json
"""
import datetime as dt
import json
import os
import time
import urllib.parse
from pathlib import Path

from . import news_desk as nd
from .sources import ERRORS, _get, _safe, fred_series

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("LLD_LIVE_OUT") or ROOT / "live" / "live.json")


# Rates and USD for the quant terminal's macro dashboard: (key, Yahoo ticker)
YAHOO_MACRO = [("us3m", "^IRX"), ("us5y", "^FVX"), ("us10y", "^TNX"), ("us30y", "^TYX"), ("dxy", "DX-Y.NYB"),
               ("vix", "^VIX")]
FRED_MACRO = [("fed_funds", "DFF"), ("us2y", "DGS2")]


def yahoo_last(ticker):
    """Last price, previous daily close and the time of the last trade (ms)."""
    def run():
        raw = _get(f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}?range=5d&interval=1d",
                   retries=2)
        res = json.loads(raw)["chart"]["result"][0]
        m = res["meta"]
        closes = [c for c in res["indicators"]["quote"][0].get("close") or [] if c is not None]
        price = m.get("regularMarketPrice")
        prev = closes[-2] if len(closes) >= 2 else m.get("chartPreviousClose")
        return {"value": price, "prev": prev, "asOf": (m.get("regularMarketTime") or 0) * 1000}

    return _safe(f"yahoo {ticker}", run, None)


def fred_last(series):
    rows = fred_series(series)
    if len(rows) < 2:
        return None
    day = dt.datetime.strptime(rows[-1][0], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
    return {"value": rows[-1][1], "prev": rows[-2][1], "asOf": int(day.timestamp() * 1000)}


def macro_board():
    """One row per rate / USD gauge, with when it was last updated so the page can show the delay."""
    out = {}
    for key, tk in YAHOO_MACRO:
        q = yahoo_last(tk)
        if q and q["value"] is not None:
            out[key] = q | {"source": "Yahoo Finance"}
    for key, sid in FRED_MACRO:
        q = fred_last(sid)
        if q:
            out[key] = q | {"source": "FRED"}
    return out


def main():
    t0 = time.time()
    now_ms = int(time.time() * 1000)
    idx, stk, fx = nd.quotes()
    data = {"generatedAt": now_ms, "indices": idx, "stocks": stk, "forex": fx,
            "news": nd.news(now_ms), "calendar": nd.calendar(), "macro": macro_board()}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"live desk: indices={len(idx)} stocks={len(stk)} fx={len(fx)} news={len(data['news'])} "
          f"calendar={len(data['calendar'])} macro={len(data['macro'])} actuals={sum(1 for r in data['calendar'] if r['actual'])} "
          f"errors={len(ERRORS)} in {time.time() - t0:.0f}s")
    for e in ERRORS:
        print("  ", e)


if __name__ == "__main__":
    main()
