"""Lai Long Desk factory: Wyckoff + market structure (MSS) + volume/market profile, on 4 timeframes.

Every asset goes through the same departments on 1W, 1D, 4H and 1H bars:

  P1 raw material   closed OHLCV bars (source and timeframe recorded)
  P2 Wyckoff        trading range, phase, Spring / Upthrust / SOS / SOW events
  P3 structure      swing highs/lows, break of structure (BOS), market structure shift (MSS)
  P4 profile        volume profile (POC, value area) and market profile (time at price)
  P5 assembly       setups that need the departments to agree, graded by confluence
  P6 backtest       the same rules replayed bar by bar, every trade logged after costs

The direction filter always comes from the next timeframe up (1H <- 4H <- 1D <- 1W),
so a lower-timeframe trade is only taken with the bigger picture.

Writes site/data/factory/index.json and one file per asset (deployed with the site, not committed:
they are rebuilt every hour). Run after pipeline.run:
    python -m pipeline.factory
"""
import bisect
import concurrent.futures as cf
import datetime as dt
import json
import time
import urllib.parse
from pathlib import Path

from . import sources
from .indicators import atr, ema, pivots
from .run import DATA, ROOT, day_key, load_json
from .signals import simulate

TFS = ("1W", "1D", "4H", "1H")
SECS = {"1W": 604800, "1D": 86400, "4H": 14400, "1H": 3600}
HTF = {"1H": "4H", "4H": "1D", "1D": "1W", "1W": "1W"}
MAX_HOLD = {"1W": 26, "1D": 40, "4H": 60, "1H": 72}
RANGE_N = 40        # bars that define a Wyckoff trading range
PROFILE_N = 120     # bars in the volume / market profile
BINS = 40
MIN_RR = 2.0
CHART_BARS = 220


# ------------------------------------------------------------------ P1 raw material
def binance_hist(symbol, interval, pages):
    """Closed Binance klines, paging back `pages` x 1000 bars."""
    def run():
        out, end = [], None
        for _ in range(pages):
            q = {"symbol": symbol, "interval": interval, "limit": 1000}
            if end:
                q["endTime"] = end
            rows = json.loads(sources._get(f"{sources.BINANCE}/klines?{urllib.parse.urlencode(q)}"))
            if not rows:
                break
            out = rows + out
            end = int(rows[0][0]) - 1
            if len(rows) < 1000:
                break
        now_ms = time.time() * 1000
        seen, bars = set(), []
        for r in out:
            t = int(r[0]) // 1000
            if t in seen or int(r[6]) >= now_ms:
                continue
            seen.add(t)
            bars.append({"t": t, "o": float(r[1]), "h": float(r[2]), "l": float(r[3]), "c": float(r[4]), "v": float(r[7])})
        return bars
    return sources._safe(f"binance {symbol} {interval}", run, [])


def week_key(ts):
    y, w, _ = dt.datetime.fromtimestamp(ts + 6 * 3600, dt.timezone.utc).isocalendar()
    return (y, w)


def with_volume(bars, vol_bars, key):
    vol = {key(b["t"]): b["v"] for b in vol_bars}
    return [dict(b, v=vol.get(key(b["t"]), 0.0)) for b in bars]


def resample(bars, secs):
    out = []
    for b in bars:
        k = b["t"] // secs * secs
        if out and out[-1]["t"] == k:
            o = out[-1]
            o["h"], o["l"], o["c"], o["v"] = max(o["h"], b["h"]), min(o["l"], b["l"]), b["c"], o["v"] + b["v"]
        else:
            out.append(dict(b, t=k))
    # the last bucket may still be filling
    if out and out[-1]["t"] + secs > time.time():
        out.pop()
    return out


def load_assets(cfg):
    """Same universe as the scan (read from latest.json), four timeframes each."""
    latest = load_json(DATA / "latest.json", {})
    universe = [(m["symbol"], m["cls"]) for m in latest.get("market", [])]
    yahoo = {f["symbol"]: (f["yahoo"], f.get("volume_proxy")) for f in cfg["forex"]}
    yahoo |= {c["symbol"]: (c["yahoo"], None) for c in cfg["commodities"]}
    yahoo |= {x["symbol"]: (x["yahoo"], None) for x in cfg.get("indices", [])}
    yahoo |= {x["symbol"]: (x["yahoo"], None) for x in cfg.get("stocks", [])}
    assets = []
    for sym, cls in universe:
        if cls == "crypto":
            pair = f"{sym}{cfg['crypto']['quote']}"
            h = binance_hist(pair, "1h", 9)
            tf = {"1W": binance_hist(pair, "1w", 1), "1D": binance_hist(pair, "1d", 2),
                  "4H": binance_hist(pair, "4h", 3), "1H": h[-3000:]}
            src = "Binance"
        elif sym in yahoo:
            tk, vp = yahoo[sym]
            w = sources.yahoo_chart(tk, "1wk", "10y")
            d = sources.yahoo_chart(tk, "1d", "5y")
            h = sources.yahoo_chart(tk, "1h", "730d")
            if vp:  # spot FX has no volume: borrow the CME future's
                w = with_volume(w, sources.yahoo_chart(vp, "1wk", "10y"), week_key)
                d = with_volume(d, sources.yahoo_chart(vp, "1d", "5y"), day_key)
                h = with_volume(h, sources.yahoo_chart(vp, "1h", "730d"), lambda t: t // 3600)
            tf = {"1W": w, "1D": d, "4H": resample(h, 14400)[-1500:], "1H": h[-2000:]}
            src = "Yahoo Finance" + (f" (volume {vp})" if vp else "")
        else:
            continue
        # the MIDOTI page replays its own rules in the browser, on a longer hourly history
        assets.append({"symbol": sym, "cls": cls, "source": src, "tf": tf, "yahoo": yahoo.get(sym) if cls != "crypto" else None,
                       "bars": {"1H": h[-BARS_N["1H"]:], "4H": tf["4H"], "1D": tf["1D"], "1W": tf["1W"]},
                       "pair": pair if cls == "crypto" else None})
    return assets


# bars kept per timeframe for the MIDOTI and Traditional pages (about 12 months of 1H, 3 of 15m, 1 of 5m, 1 week of 1m)
BARS_N = {"1m": 10080, "5m": 8640, "15m": 8640, "30m": 6000, "1H": 9000}
INTRADAY = {"1m": (60, "7d"), "5m": (300, "60d"), "15m": (900, "60d"), "30m": (1800, "60d")}  # Yahoo's limits
BINANCE_PAGES = {"1m": 11, "5m": 9, "15m": 9}


def intraday(a):
    """Intraday bars: Binance for crypto, Yahoo (60 days, 7 for 1m) for everything else."""
    if a.get("pair"):
        for iv, pages in BINANCE_PAGES.items():
            a["bars"][iv] = binance_hist(a["pair"], iv, pages)[-BARS_N[iv]:]
        return
    if not a.get("yahoo"):
        return
    tk, vp = a["yahoo"]
    for iv, (secs, rng) in INTRADAY.items():
        b = sources.yahoo_chart(tk, iv, rng)
        if vp:
            b = with_volume(b, sources.yahoo_chart(vp, iv, rng), lambda t, s=secs: t // s)
        a["bars"][iv] = b[-BARS_N[iv]:]


def sig(x, n=7):
    return float(f"{x:.{n}g}") if x else 0


def write_bars(assets):
    """site/data/bars/<SYM>_<TF>.json: compact columns for the MIDOTI page (deployed, not committed)."""
    out = DATA / "bars"
    out.mkdir(parents=True, exist_ok=True)
    index = []
    # intraday downloads are I/O bound: a few at a time keeps the hourly scan inside its time limit
    with cf.ThreadPoolExecutor(6) as pool:
        list(pool.map(intraday, assets))
    for a in assets:
        tfs = {}
        for f, bars in a.get("bars", {}).items():
            if not bars:
                continue
            (out / f"{a['symbol']}_{f}.json").write_text(json.dumps({
                "s": a["symbol"], "tf": f, "t": [b["t"] for b in bars], "o": [sig(b["o"]) for b in bars],
                "h": [sig(b["h"]) for b in bars], "l": [sig(b["l"]) for b in bars], "c": [sig(b["c"]) for b in bars],
                "v": [sig(b["v"], 4) for b in bars]}, separators=(",", ":")))
            tfs[f] = {"n": len(bars), "last": bars[-1]["t"]}
        if tfs:
            index.append({"symbol": a["symbol"], "cls": a["cls"], "source": a["source"], "tfs": tfs})
    (out / "index.json").write_text(json.dumps({"generated": int(time.time()), "assets": index}, separators=(",", ":")))


# ------------------------------------------------------------------ P4 profile
def profile(bars, lo_i, hi_i):
    """Volume profile and market profile (time at price) of bars[lo_i:hi_i]."""
    win = bars[max(0, lo_i):hi_i]
    if len(win) < 10:
        return None
    lo, hi = min(b["l"] for b in win), max(b["h"] for b in win)
    if hi <= lo:
        return None
    step = (hi - lo) / BINS
    vol, tpo = [0.0] * BINS, [0] * BINS
    has_vol = any(b["v"] for b in win)
    for b in win:
        a, z = int((b["l"] - lo) / step), min(BINS - 1, int((b["h"] - lo) / step))
        a = min(a, BINS - 1)
        share = (b["v"] if has_vol else 1.0) / (z - a + 1)
        for k in range(a, z + 1):
            vol[k] += share
            tpo[k] += 1
    poc = max(range(BINS), key=lambda k: vol[k])
    total, inside, a, z = sum(vol), vol[poc], poc, poc
    while inside < 0.7 * total and (a > 0 or z < BINS - 1):  # grow the 70% value area around the POC
        up = vol[z + 1] if z < BINS - 1 else -1
        dn = vol[a - 1] if a > 0 else -1
        if up >= dn:
            z += 1
            inside += up
        else:
            a -= 1
            inside += dn
    mid = lambda k: lo + (k + 0.5) * step  # noqa: E731
    tpo_poc = max(range(BINS), key=lambda k: tpo[k])
    return {"poc": mid(poc), "vah": lo + (z + 1) * step, "val": lo + a * step, "tpo_poc": mid(tpo_poc),
            "lo": lo, "hi": hi, "has_volume": has_vol,
            "bins": [[round(mid(k), 8), round(vol[k] / total, 4), tpo[k]] for k in range(BINS)]}


# ------------------------------------------------------------------ P2 + P3 departments, bar by bar
def departments(bars):
    """One pass over the bars: Wyckoff phase and events, swing structure and its breaks.

    Everything stored at index i uses bars[:i+1] only (pivots count from their confirmation bar).
    """
    n = len(bars)
    closes = [b["c"] for b in bars]
    e20, e50, a = ema(closes, 20), ema(closes, 50), atr(bars)
    piv = pivots(bars, 3)
    conf = {}
    for p, px, kind in piv:
        conf.setdefault(p + 3, []).append((p, px, kind))
    highs, lows = [], []          # confirmed swings: (index, price)
    sh = sl = None                # latest unbroken swing high / low: [index, price, broken]
    mss_dir = 0
    st = [None] * n
    events = []                   # wyckoff + structure events in time order
    last_w = None                 # last wyckoff event (kind, index)
    for i in range(n):
        b = bars[i]
        for p, px, kind in conf.get(i, []):
            if kind == "H":
                highs.append((p, px))
                sh = [p, px, False]
            else:
                lows.append((p, px))
                sl = [p, px, False]
        # P3: break of the latest swing in either direction
        brk = None
        if sh and not sh[2] and b["c"] > sh[1]:
            brk = {"kind": "MSS" if mss_dir < 0 else "BOS", "dir": 1, "level": sh[1], "swing_i": sh[0]}
            sh[2], mss_dir = True, 1
        elif sl and not sl[2] and b["c"] < sl[1]:
            brk = {"kind": "MSS" if mss_dir > 0 else "BOS", "dir": -1, "level": sl[1], "swing_i": sl[0]}
            sl[2], mss_dir = True, -1
        if brk:
            events.append(dict(brk, i=i, t=b["t"]))
        if len(highs) >= 2 and len(lows) >= 2:
            hh, hl = highs[-1][1] > highs[-2][1], lows[-1][1] > lows[-2][1]
            structure = "bull" if hh and hl else "bear" if not hh and not hl else "mixed"
        else:
            structure = "mixed"

        # P2: trading range of the RANGE_N bars before this one
        wy = {"phase": "transition", "bias": 0, "range": None, "event": None}
        if i >= RANGE_N + 30 and a[i] > 0:
            win = bars[i - RANGE_N:i]
            hi, lo = max(x["h"] for x in win), min(x["l"] for x in win)
            width = (hi - lo) / a[i]
            vmax = max(x["v"] for x in win)
            vs = sorted(x["v"] for x in win)
            vmed = vs[len(vs) // 2]
            rv = b["v"] / vmed if vmed else None
            rng = b["h"] - b["l"] or a[i]
            pos = (b["c"] - b["l"]) / rng
            if 2.5 <= width <= 12:
                pre = sum(x["c"] for x in bars[i - RANGE_N - 30:i - RANGE_N]) / 30
                came = "down" if pre > hi else "up" if pre < lo else "side"
                wy["range"] = {"hi": hi, "lo": lo, "since": win[0]["t"], "came_from": came, "width_atr": round(width, 1)}
                ev = None
                if b["l"] < lo and b["c"] > lo and pos >= 0.5 and lo - b["l"] <= 1.5 * a[i]:
                    ev = "spring"
                elif b["h"] > hi and b["c"] < hi and pos <= 0.5 and b["h"] - hi <= 1.5 * a[i]:
                    ev = "upthrust"
                elif b["c"] > hi and rv and rv >= 1.5:
                    ev = "sos"
                elif b["c"] < lo and rv and rv >= 1.5:
                    ev = "sow"
                if ev:
                    wy["event"] = {"kind": ev, "rvol": round(rv, 2) if rv else None,
                                   "top_volume": bool(vmax) and b["v"] >= vmax, "level": lo if ev in ("spring", "sow") else hi}
                    events.append({"kind": ev, "i": i, "t": b["t"], "level": wy["event"]["level"], "rvol": wy["event"]["rvol"],
                                   "top_volume": wy["event"]["top_volume"]})
                    last_w = (ev, i)
                recent = last_w if last_w and i - last_w[1] <= RANGE_N else None
                if came == "down":
                    wy["phase"] = "accumulation"
                elif came == "up":
                    wy["phase"] = "distribution"
                else:
                    wy["phase"] = "reaccumulation" if e50[i] > e50[i - 10] else "redistribution"
                if recent:
                    wy["bias"] = 1 if recent[0] in ("spring", "sos") else -1
                    # a range after a rally that then springs / breaks up is re-accumulation, and vice versa
                    if wy["phase"] == "distribution" and wy["bias"] > 0:
                        wy["phase"] = "reaccumulation"
                    elif wy["phase"] == "accumulation" and wy["bias"] < 0:
                        wy["phase"] = "redistribution"
            if wy["range"] is None or wy["event"] and wy["event"]["kind"] in ("sos", "sow"):
                if b["c"] > e50[i] and e20[i] > e50[i]:
                    wy["phase"], wy["bias"] = "markup", 1
                elif b["c"] < e50[i] and e20[i] < e50[i]:
                    wy["phase"], wy["bias"] = "markdown", -1
        st[i] = {"wy": wy, "structure": structure, "mss_dir": mss_dir, "brk": brk,
                 "sh": list(sh) if sh else None, "sl": list(sl) if sl else None, "atr": a[i]}
    return st, events, highs, lows


def htf_series(bars_htf, st_htf, secs_htf):
    """Close times and Wyckoff bias of the higher timeframe, for lookups without look-ahead."""
    closes = [b["t"] + secs_htf for b in bars_htf]
    return closes, [s["wy"]["bias"] if s else 0 for s in st_htf]


def bias_at(htf, t_close):
    closes, bias = htf
    j = bisect.bisect_right(closes, t_close) - 1
    return bias[j] if j >= 0 else 0


# ------------------------------------------------------------------ P5 assembly
def setups_at(bars, st, i, hb, htf_name):
    """Setups that trigger on closed bar i. hb = higher-timeframe bias (-1, 0, +1)."""
    s, b = st[i], bars[i]
    if not s or s["atr"] <= 0:
        return []
    a, c, out = s["atr"], b["c"], []
    ev, rg = s["wy"]["event"], s["wy"]["range"]

    def build(name, d, stop, targets, reasons):
        risk = (c - stop) * d
        if risk <= 0 or risk > 3 * a:
            return
        tgt = next((x for x in sorted(targets, key=lambda x: x * d) if (x - c) * d / risk >= MIN_RR), None)
        if tgt is None:
            return
        pts = sum(1 for r in reasons if r.get("plus"))
        out.append({"setup": name, "dir": "long" if d > 0 else "short", "entry": c, "stop": stop, "target": tgt,
                    "rr": round((tgt - c) * d / risk, 2), "grade": "A" if pts >= 3 else "B" if pts == 2 else "C",
                    "reasons": reasons})

    prof = None
    if ev and ev["kind"] in ("spring", "upthrust") or s["brk"] and s["brk"]["kind"] == "MSS":
        prof = profile(bars, i - PROFILE_N, i + 1)
    if not prof:
        return []
    hb_r = {"k": "htf", "tf": htf_name, "bias": hb}

    # Wyckoff Spring / Upthrust: false break of the range, back inside, ideally on the range's top volume
    if ev and ev["kind"] in ("spring", "upthrust") and rg:
        d = 1 if ev["kind"] == "spring" else -1
        if hb * d >= 0:
            edge = rg["lo"] if d > 0 else rg["hi"]
            at_value = (prof["val"] - 0.5 * a <= edge <= prof["val"] + 0.5 * a) if d > 0 else (prof["vah"] - 0.5 * a <= edge <= prof["vah"] + 0.5 * a)
            stop = b["l"] - 0.25 * a if d > 0 else b["h"] + 0.25 * a
            build("SPRING" if d > 0 else "UPTHRUST", d, stop,
                  [rg["hi"] if d > 0 else rg["lo"], prof["poc"], prof["vah"] if d > 0 else prof["val"]],
                  [dict(hb_r, plus=hb * d > 0),
                   {"k": ev["kind"], "level": edge, "rvol": ev["rvol"], "plus": ev["top_volume"], "top_volume": ev["top_volume"]},
                   {"k": "value_edge", "val": prof["val"], "vah": prof["vah"], "poc": prof["poc"], "plus": at_value},
                   {"k": "range", "lo": rg["lo"], "hi": rg["hi"], "came_from": rg["came_from"]}])

    # MSS from value: the higher timeframe points one way, the pullback reached value, structure shifts back
    brk = s["brk"]
    if brk and brk["kind"] == "MSS" and hb * brk["dir"] > 0:
        d = brk["dir"]
        sw = s["sl"] if d > 0 else s["sh"]
        if sw:
            px = sw[1]
            in_value = (px <= prof["val"] + 0.25 * a or abs(px - prof["poc"]) <= 0.5 * a) if d > 0 else \
                (px >= prof["vah"] - 0.25 * a or abs(px - prof["poc"]) <= 0.5 * a)
            if in_value:
                vols = sorted(x["v"] for x in bars[max(0, i - 20):i])
                rv = b["v"] / vols[len(vols) // 2] if vols and vols[len(vols) // 2] else None
                own = s["wy"]["phase"] in (("accumulation", "reaccumulation", "markup") if d > 0 else ("distribution", "redistribution", "markdown"))
                stop = px - 0.25 * a if d > 0 else px + 0.25 * a
                build("MSS_VALUE", d, stop, [prof["vah"] if d > 0 else prof["val"], prof["hi"] if d > 0 else prof["lo"], prof["poc"]],
                      [dict(hb_r, plus=True),
                       {"k": "mss", "level": brk["level"], "pullback": px, "rvol": round(rv, 2) if rv else None, "plus": bool(rv and rv >= 1.5)},
                       {"k": "in_value", "val": prof["val"], "vah": prof["vah"], "poc": prof["poc"]},
                       {"k": "phase", "phase": s["wy"]["phase"], "plus": own}])
    return out


# ------------------------------------------------------------------ P6 backtest
def stats(trades):
    done = [t for t in trades if t["result"] != "skipped"]
    if not done:
        return {"n": 0}
    rs = [t["r"] for t in done]
    gains, losses = sum(r for r in rs if r > 0), -sum(r for r in rs if r < 0)
    eq = peak = dd = 0.0
    for r in rs:
        eq += r
        peak = max(peak, eq)
        dd = max(dd, peak - eq)
    return {"n": len(done), "win_rate": round(sum(1 for r in rs if r > 0) / len(done) * 100, 1),
            "exp_r": round(sum(rs) / len(done), 3), "total_r": round(sum(rs), 1),
            "pf": round(gains / losses, 2) if losses else None, "max_dd_r": round(dd, 1)}


def run_tf(bars, st, htf, tf, cost):
    trades, busy = [], {}
    for i in range(RANGE_N + 30, len(bars)):
        hb = bias_at(htf, bars[i]["t"] + SECS[tf])
        for s in setups_at(bars, st, i, hb, HTF[tf]):
            key = (s["setup"], s["dir"])
            if busy.get(key, -1) >= i:
                continue
            res = simulate(bars, i, s, cost, MAX_HOLD[tf])
            if res is None:  # still open: shown as the live signal, not counted
                continue
            busy[key] = i + res["bars"]
            xi = min(i + res["bars"], len(bars) - 1)
            exit_px = s["target"] if res["result"] == "win" else s["stop"] if res["result"] == "loss" else bars[xi]["c"]
            trades.append({"tf": tf, "setup": s["setup"], "dir": s["dir"], "grade": s["grade"],
                           "signal_t": bars[i]["t"], "entry_t": bars[i + 1]["t"] if i + 1 < len(bars) else None,
                           "entry": res["entry"], "stop": s["stop"], "target": s["target"],
                           "exit_t": bars[xi]["t"], "exit": exit_px, "result": res["result"], "r": round(res["r"], 3),
                           "bars": res["bars"], "reasons": s["reasons"], "t": bars[i]["t"]})
    return trades


def r8(x):
    return round(x, 8) if isinstance(x, float) else x


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    return r8(o)


def process(asset, cost):
    tfb = {tf: asset["tf"].get(tf) or [] for tf in TFS}
    deps = {tf: departments(tfb[tf]) if len(tfb[tf]) > RANGE_N + 40 else None for tf in TFS}
    out = {"symbol": asset["symbol"], "cls": asset["cls"], "source": asset["source"], "cost_pct": cost, "tfs": {}}
    trades_all = []
    for tf in TFS:
        bars, dep = tfb[tf], deps[tf]
        if not dep:
            continue
        st, events, highs, lows = dep
        h = HTF[tf]
        hdep = deps.get(h)
        htf = htf_series(tfb[h], hdep[0], SECS[h]) if hdep else ([], [])
        trades = run_tf(bars, st, htf, tf, cost)
        trades_all += trades
        i = len(bars) - 1
        hb = bias_at(htf, bars[i]["t"] + SECS[tf])
        live = setups_at(bars, st, i, hb, h)
        s = st[i]
        prof = profile(bars, i - PROFILE_N, i + 1)
        first = bars[max(0, i - CHART_BARS + 1)]["t"]
        out["tfs"][tf] = {
            "bars": [[b["t"], r8(b["o"]), r8(b["h"]), r8(b["l"]), r8(b["c"]), round(b["v"], 2)] for b in bars[-CHART_BARS:]],
            "last_t": bars[i]["t"], "price": bars[i]["c"], "atr": s["atr"],
            "wyckoff": s["wy"], "structure": s["structure"], "mss_dir": s["mss_dir"],
            "swing_high": s["sh"], "swing_low": s["sl"],
            "swings": [[bars[p]["t"], px, "H"] for p, px in highs if bars[p]["t"] >= first] +
                      [[bars[p]["t"], px, "L"] for p, px in lows if bars[p]["t"] >= first],
            "events": [{k: v for k, v in e.items() if k != "i"} for e in events if e["t"] >= first][-30:],
            "profile": prof, "htf": h, "htf_bias": hb,
            "signals": [dict(x, signal_t=bars[i]["t"]) for x in live],
            "stats": stats(trades), "stats_by_setup": {k: stats([t for t in trades if t["setup"] == k]) for k in ("SPRING", "UPTHRUST", "MSS_VALUE")},
            "stats_by_grade": {g: stats([t for t in trades if t["grade"] == g]) for g in "ABC"},
            "trades": [{k: v for k, v in t.items() if k != "t"} for t in trades][-150:],
        }
    return clean(out), trades_all


def summary(a):
    tfs = {}
    for tf, x in a["tfs"].items():
        tfs[tf] = {"phase": x["wyckoff"]["phase"], "bias": x["wyckoff"]["bias"], "structure": x["structure"],
                   "mss_dir": x["mss_dir"], "htf_bias": x["htf_bias"],
                   "signal": [{k: s[k] for k in ("setup", "dir", "grade", "entry", "stop", "target", "rr")} for s in x["signals"]],
                   "n": x["stats"].get("n", 0), "exp_r": x["stats"].get("exp_r")}
    bias = sum(v["bias"] * w for v, w in ((tfs.get(t), w) for t, w in (("1W", 3), ("1D", 2), ("4H", 1), ("1H", 1))) if v)
    return {"symbol": a["symbol"], "cls": a["cls"], "price": a["tfs"].get("1D", {}).get("price") or next(iter(a["tfs"].values()))["price"],
            "score": bias, "tfs": tfs}


def main():
    t0 = time.time()
    cfg = json.loads((ROOT / "config.json").read_text())
    out_dir = DATA / "factory"
    out_dir.mkdir(parents=True, exist_ok=True)
    assets = load_assets(cfg)
    write_bars(assets)
    index, all_trades = [], []
    for a in assets:
        try:
            res, trades = process(a, cfg["costs_roundtrip_pct"][a["cls"]])
        except Exception as e:  # noqa: BLE001 - one bad series must not stop the factory
            sources.ERRORS.append(f"factory {a['symbol']}: {e}")
            continue
        if not res["tfs"]:
            continue
        res["generated"] = int(time.time())
        (out_dir / f"{a['symbol']}.json").write_text(json.dumps(res, separators=(",", ":")))
        index.append(summary(res))
        all_trades += [dict(t, cls=a["cls"]) for t in trades]
    grid = {tf: {"all": stats([t for t in all_trades if t["tf"] == tf]),
                 **{s: stats([t for t in all_trades if t["tf"] == tf and t["setup"] == s]) for s in ("SPRING", "UPTHRUST", "MSS_VALUE")},
                 **{f"grade_{g}": stats([t for t in all_trades if t["tf"] == tf and t["grade"] == g]) for g in "ABC"}}
            for tf in TFS}
    (out_dir / "index.json").write_text(json.dumps(clean({
        "generated": int(time.time()), "runtime_s": round(time.time() - t0, 1), "assets": index, "stats": grid,
        "costs_roundtrip_pct": cfg["costs_roundtrip_pct"], "rules": {"range_n": RANGE_N, "profile_n": PROFILE_N, "min_rr": MIN_RR,
                                                                    "max_hold": MAX_HOLD, "htf": HTF},
        "errors": [e for e in sources.ERRORS if "factory" in e or "1w" in e or "1wk" in e][:30],
    }), separators=(",", ":")))
    print(f"factory assets={len(index)} trades={len(all_trades)} errors={len(sources.ERRORS)} in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    from . import sources as _src
    try:
        main()
    except Exception as e:  # the status page should show a crashed desk, then the step still fails
        _src.save_health("factory", {"crashed": f"{type(e).__name__}: {e}"[:300]})
        raise
    _src.save_health("factory")
