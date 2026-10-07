"""Free, public market-data sources.

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


# ---------------------------------------------------------------- crypto
BINANCE = "https://data-api.binance.vision/api/v3"


def binance_top_symbols(quote, top_n, exclude):
    def run():
        rows = json.loads(_get(f"{BINANCE}/ticker/24hr"))
        out = []
        for r in rows:
            s = r["symbol"]
            if not s.endswith(quote):
                continue
            base = s[: -len(quote)]
            if base in exclude or base.endswith(("UP", "DOWN", "BULL", "BEAR")):
                continue
            out.append((float(r["quoteVolume"]), s, base))
        out.sort(reverse=True)
        return [{"symbol": s, "base": b} for _, s, b in out[:top_n]]

    return _safe("binance tickers", run, [])


def top_by_market_cap(quote, top_n, exclude):
    """CoinGecko's largest coins by market cap that trade against `quote` on Binance spot."""
    def run():
        listed = {r["symbol"] for r in json.loads(_get(f"{BINANCE}/ticker/price"))}
        coins = []
        for page in (1, 2):
            coins += json.loads(_get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd"
                                     f"&order=market_cap_desc&per_page=100&page={page}&sparkline=false"))
        out, seen = [], set()
        for c in coins:
            base = c["symbol"].upper()
            if base in exclude or base in seen or f"{base}{quote}" not in listed:
                continue
            if abs((c.get("current_price") or 0) - 1) < 0.03:  # stablecoins
                continue
            seen.add(base)
            out.append({"symbol": f"{base}{quote}", "base": base, "market_cap": c.get("market_cap")})
            if len(out) >= top_n:
                break
        return out

    return _safe("coingecko top by market cap", run, [])


def binance_klines(symbol, interval, limit):
    def run():
        q = urllib.parse.urlencode({"symbol": symbol, "interval": interval, "limit": limit})
        rows = json.loads(_get(f"{BINANCE}/klines?{q}"))
        now_ms = time.time() * 1000
        # keep only closed candles: accuracy over speed
        return [
            {"t": int(r[0]) // 1000, "o": float(r[1]), "h": float(r[2]), "l": float(r[3]),
             "c": float(r[4]), "v": float(r[7])}  # quote volume (USDT)
            for r in rows if int(r[6]) < now_ms
        ]

    return _safe(f"binance {symbol} {interval}", run, [])


def hyperliquid_perps():
    """Funding, open interest and volume for every Hyperliquid perpetual."""
    def run():
        meta, ctxs = json.loads(_get("https://api.hyperliquid.xyz/info", data={"type": "metaAndAssetCtxs"}))
        out = {}
        for asset, ctx in zip(meta["universe"], ctxs):
            try:
                px = float(ctx["markPx"])
                out[asset["name"]] = {
                    "funding_apr": float(ctx["funding"]) * 24 * 365 * 100,  # hourly rate -> % per year
                    "open_interest_usd": float(ctx["openInterest"]) * px,
                    "volume_24h_usd": float(ctx["dayNtlVlm"]),
                    "premium_pct": float(ctx.get("premium") or 0) * 100,
                }
            except (TypeError, ValueError, KeyError):
                continue
        return out

    return _safe("hyperliquid", run, {})


# ------------------------------------------------- forex / futures / indices
def yahoo_chart(ticker, interval="1d", rng="5y"):
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
        # the last bar is the session still trading: drop it, signals use closed bars only
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


def cftc_cot(code, weeks=160):
    """CFTC Commitments of Traders, legacy futures-only (US government, public domain).

    Returns [(date, noncommercial_net, open_interest)] oldest first.
    """
    def run():
        q = urllib.parse.urlencode({
            "cftc_contract_market_code": code,
            "$order": "report_date_as_yyyy_mm_dd DESC",
            "$limit": weeks,
        })
        rows = json.loads(_get(f"https://publicreporting.cftc.gov/resource/6dca-aqww.json?{q}"))
        out = []
        for r in rows:
            try:
                net = float(r["noncomm_positions_long_all"]) - float(r["noncomm_positions_short_all"])
                out.append((r["report_date_as_yyyy_mm_dd"][:10], net, float(r["open_interest_all"])))
            except (KeyError, ValueError):
                continue
        return list(reversed(out))

    return _safe(f"cftc {code}", run, [])
