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


# US index futures, Treasury futures and bond volatility (Yahoo; CME quotes are delayed ~10 minutes)
YAHOO_FUT = [("ES", "ES=F", "S&P 500 E-mini"), ("NQ", "NQ=F", "Nasdaq 100 E-mini"), ("YM", "YM=F", "Dow E-mini"),
             ("RTY", "RTY=F", "Russell 2000 E-mini"), ("ZT", "ZT=F", "UST 2Y"), ("ZF", "ZF=F", "UST 5Y"),
             ("ZN", "ZN=F", "UST 10Y"), ("ZB", "ZB=F", "UST Bond"), ("MOVE", "^MOVE", "MOVE (bond volatility)")]


def futures_board():
    out = []
    for key, tk, name in YAHOO_FUT:
        def run(tk=tk):
            raw = _get(f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(tk)}?range=5d&interval=1d",
                       retries=2)
            res = json.loads(raw)["chart"]["result"][0]
            m = res["meta"]
            q = res["indicators"]["quote"][0]
            closes = [c for c in q.get("close") or [] if c is not None]
            vols = [v for v in q.get("volume") or [] if v is not None]
            return {"value": m.get("regularMarketPrice"), "prev": closes[-2] if len(closes) > 1 else None,
                    "volume": m.get("regularMarketVolume") or (vols[-1] if vols else None),
                    "avgVolume": sum(vols[:-1]) / len(vols[:-1]) if len(vols) > 1 else None,
                    "asOf": (m.get("regularMarketTime") or 0) * 1000}
        q = _safe(f"yahoo {tk}", run, None)
        if q and q["value"] is not None:
            out.append({"key": key, "name": name, "source": "Yahoo Finance"} | q)
    return out


# Crypto derivatives from OKX (public API, reachable from GitHub's US runners; Binance and Bybit are not).
OKX = "https://www.okx.com/api/v5"
OKX_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE"]


def okx_liquidations(coin, ct_val, since_ms):
    """Long and short liquidations (USD) on OKX's USDT perpetual since `since_ms`."""
    longs = shorts = 0.0
    after, n, first = None, 0, None
    for _ in range(40):  # 100 per page; very busy days are capped and say so
        q = f"{OKX}/public/liquidation-orders?instType=SWAP&uly={coin}-USDT&state=filled&limit=100"
        details = (json.loads(_get(q + (f"&after={after}" if after else ""), retries=2)).get("data") or [{}])[0].get("details") or []
        if not details:
            break
        for d in details:
            if int(d["ts"]) < since_ms:
                return {"long_usd": round(longs), "short_usd": round(shorts), "count": n, "complete": True, "from_ms": since_ms}
            usd = float(d["sz"]) * ct_val * float(d["bkPx"])
            if d.get("posSide") == "long":
                longs += usd
            else:
                shorts += usd
            n += 1
            first = int(d["ts"])
        after = details[-1]["ts"]
    # OKX keeps only a recent window, so say where the sum actually starts
    return {"long_usd": round(longs), "short_usd": round(shorts), "count": n, "complete": False, "from_ms": first}


def crypto_derivs():
    now = int(time.time() * 1000)
    inst = _safe("okx instruments", lambda: {i["instId"]: float(i["ctVal"]) for i in json.loads(
        _get(f"{OKX}/public/instruments?instType=SWAP", retries=2))["data"]}, {})
    out = []
    for c in OKX_COINS:
        row = {"coin": c, "source": "OKX", "asOf": now}
        lsr = _safe(f"okx lsr {c}", lambda c=c: json.loads(_get(f"{OKX}/rubik/stat/contracts/long-short-account-ratio?ccy={c}&period=1H",
                                                                retries=2))["data"], [])
        if lsr:
            row["long_short"] = float(lsr[0][1])
            row["long_short_24h"] = float(lsr[24][1]) if len(lsr) > 24 else None
        oi = _safe(f"okx oi {c}", lambda c=c: json.loads(_get(f"{OKX}/rubik/stat/contracts/open-interest-volume?ccy={c}&period=1H",
                                                             retries=2))["data"], [])
        if oi:
            row["oi_usd"] = float(oi[0][1])
            row["oi_24h_usd"] = float(oi[24][1]) if len(oi) > 24 else None
            row["vol_24h_usd"] = sum(float(x[2]) for x in oi[:24])
        ct = inst.get(f"{c}-USDT-SWAP")
        if ct:
            liq = _safe(f"okx liquidations {c}", lambda c=c, ct=ct: okx_liquidations(c, ct, now - 24 * 3600 * 1000), None)
            if liq:
                row["liq24h"] = liq
        out.append(row)
    return out


def main():
    t0 = time.time()
    now_ms = int(time.time() * 1000)
    idx, stk, fx = nd.quotes()
    data = {"generatedAt": now_ms, "indices": idx, "stocks": stk, "forex": fx,
            "news": nd.news(now_ms), "calendar": nd.calendar(), "macro": macro_board(),
            "futuresBoard": futures_board(), "crypto_derivs": crypto_derivs()}
    from .sources import health_report
    data["health"] = health_report("live")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"live desk: indices={len(idx)} stocks={len(stk)} fx={len(fx)} news={len(data['news'])} "
          f"calendar={len(data['calendar'])} macro={len(data['macro'])} actuals={sum(1 for r in data['calendar'] if r['actual'])} "
          f"errors={len(ERRORS)} in {time.time() - t0:.0f}s")
    for e in ERRORS:
        print("  ", e)


if __name__ == "__main__":
    main()
