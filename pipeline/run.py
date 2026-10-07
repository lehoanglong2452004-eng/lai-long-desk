"""Lai Long Desk scan: fetch free data, find setups, grade them, write the terminal's JSON.

Run:  python -m pipeline.run
"""
import datetime as dt
import json
import os
import time
from pathlib import Path

from . import macro, notify, sources
from .indicators import rvol
from .signals import Prepared, SETUPS, detect, quiet_volume, score, simulate, trend_at

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("LLD_DATA_DIR") or ROOT / "site" / "data")
CLASSES = ("index", "stock", "crypto", "forex", "commodity")


def utc(ts):
    return dt.datetime.fromtimestamp(ts, dt.timezone.utc)


def day_key(ts):
    # FX spot and CME futures stamp the same session a few hours apart; +6h maps both to one date
    return utc(ts + 6 * 3600).date().isoformat()


def merge_volume(price_bars, vol_bars):
    vol = {day_key(b["t"]): b["v"] for b in vol_bars}
    return [dict(b, v=vol.get(day_key(b["t"]), 0.0)) for b in price_bars]


def merge_volume_hourly(price_bars, vol_bars):
    vol = {b["t"] // 3600: b["v"] for b in vol_bars}
    return [dict(b, v=vol.get(b["t"] // 3600, 0.0)) for b in price_bars]


def cot_percentile(rows, invert=False):
    if len(rows) < 20:
        return None
    nets = [(-n if invert else n) for _, n, _ in rows]
    last = nets[-1]
    pct = sum(1 for x in nets if x <= last) / len(nets) * 100
    prev = nets[-2]
    return {"date": rows[-1][0], "net": last, "change": last - prev, "pct": round(pct)}


def stats(trades):
    done = [t for t in trades if t["result"] != "skipped"]
    n = len(done)
    if not n:
        return {"n": 0, "win_rate": None, "exp_r": None, "total_r": 0, "pf": None, "max_dd_r": 0, "max_loss_streak": 0}
    rs = [t["r"] for t in sorted(done, key=lambda t: t["t"])]
    gains = sum(r for r in rs if r > 0)
    losses = -sum(r for r in rs if r < 0)
    eq = peak = dd = 0.0
    streak = worst = 0
    for r in rs:
        eq += r
        peak = max(peak, eq)
        dd = max(dd, peak - eq)
        streak = streak + 1 if r < 0 else 0
        worst = max(worst, streak)
    return {
        "n": n,
        "win_rate": round(sum(1 for r in rs if r > 0) / n * 100, 1),
        "exp_r": round(sum(rs) / n, 3),
        "total_r": round(sum(rs), 1),
        "pf": round(gains / losses, 2) if losses else None,
        "max_dd_r": round(dd, 1),
        "max_loss_streak": worst,
    }


def backtest(prep, cls, cost, rules):
    """Replay the live rules on every past closed bar; one open trade per setup at a time."""
    trades, busy_until = [], {}
    bars = prep.bars
    for i in range(210, len(bars) - 1):
        for s in detect(prep, i, rules):
            key = (s["setup"], s["dir"])
            if busy_until.get(key, -1) >= i:
                continue
            res = simulate(bars, i, s, cost, rules["max_hold_bars"])
            if res is None:
                continue
            busy_until[key] = i + res["bars"]
            trades.append({"t": bars[i]["t"], "cls": cls, "setup": s["setup"], "dir": s["dir"],
                           "result": res["result"], "r": res["r"]})
    return trades


def intraday_spike(bars_1h):
    """Abnormal hourly volume in the last 3 closed hours vs the median of the 48 before."""
    best = None
    for i in range(max(48, len(bars_1h) - 3), len(bars_1h)):
        rv = rvol(bars_1h, i, 48)
        if rv and 3 <= rv <= 100 and (best is None or rv > best["rvol"]):
            b = bars_1h[i]
            best = {"rvol": round(rv, 1), "t": b["t"], "move_pct": round((b["c"] - b["o"]) / b["o"] * 100, 2)}
    return best


def load_universe(cfg):
    assets = []
    cc = cfg["crypto"]
    picks = []
    if cc.get("select") == "market_cap":
        picks = sources.top_by_market_cap(cc["quote"], cc["top_n"], set(cc["exclude"]))
    for s in picks or sources.binance_top_symbols(cc["quote"], cc["top_n"], set(cc["exclude"])):
        assets.append({"symbol": s["base"], "cls": "crypto", "usd_beta": cfg["crypto_usd_beta"],
                       "daily": sources.binance_klines(s["symbol"], "1d", 1000),
                       "hourly": sources.binance_klines(s["symbol"], "1h", 200), "cot": None})
    for f in cfg["forex"]:
        vp = f.get("volume_proxy")  # CME currency futures lend their volume; pairs without one have none
        daily = merge_volume(sources.yahoo_chart(f["yahoo"], "1d", "5y"),
                             sources.yahoo_chart(vp, "1d", "5y") if vp else [])
        hourly = merge_volume_hourly(sources.yahoo_chart(f["yahoo"], "1h", "1mo"),
                                     sources.yahoo_chart(vp, "1h", "1mo") if vp else [])
        code = cfg["forex_cot"].get(f["symbol"])
        # CME FX futures are quoted as the foreign currency vs USD: invert for USDxxx pairs
        cot = cot_percentile(sources.cftc_cot(code), invert=f["symbol"].startswith("USD")) if code else None
        assets.append({"symbol": f["symbol"], "cls": "forex", "usd_beta": f["usd_beta"],
                       "daily": daily, "hourly": hourly, "cot": cot})
    for c in cfg["commodities"]:
        cot = cot_percentile(sources.cftc_cot(c["cot"])) if c.get("cot") else None
        assets.append({"symbol": c["symbol"], "cls": "commodity", "usd_beta": c["usd_beta"],
                       "daily": sources.yahoo_chart(c["yahoo"], "1d", "5y"),
                       "hourly": sources.yahoo_chart(c["yahoo"], "1h", "1mo"), "cot": cot})
    for x in cfg.get("indices", []):
        cot = cot_percentile(sources.cftc_cot(x["cot"])) if x.get("cot") else None
        assets.append({"symbol": x["symbol"], "cls": "index", "usd_beta": x["usd_beta"],
                       "daily": sources.yahoo_chart(x["yahoo"], "1d", "5y"),
                       "hourly": sources.yahoo_chart(x["yahoo"], "1h", "1mo"), "cot": cot})
    for x in cfg.get("stocks", []):  # the 7 largest US tech stocks
        assets.append({"symbol": x["symbol"], "cls": "stock", "usd_beta": x["usd_beta"],
                       "daily": sources.yahoo_chart(x["yahoo"], "1d", "5y"),
                       "hourly": sources.yahoo_chart(x["yahoo"], "1h", "1mo"), "cot": None})
    return [a for a in assets if len(a["daily"]) > 230]


def load_json(path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default


def update_log(log, assets_by_key, new_setups, cfg, now):
    """Append new graded setups once, then settle open ones with the bars that followed."""
    rules = cfg["signal_rules"]
    open_keys = {(e["symbol"], e["setup"], e["dir"]) for e in log if e["status"] == "open"}
    for s in new_setups:
        key = (s["symbol"], s["setup"], s["dir"])
        if s["grade"] in ("A", "B") and key not in open_keys and not any(
                e["symbol"] == s["symbol"] and e["bar_t"] == s["bar_t"] and e["setup"] == s["setup"] for e in log):
            log.append({k: s[k] for k in ("symbol", "cls", "setup", "dir", "grade", "score", "entry",
                                          "stop", "target", "rr", "bar_t")} | {"logged": now, "status": "open"})
            open_keys.add(key)
    for e in log:
        if e["status"] != "open":
            continue
        a = assets_by_key.get(e["symbol"])
        if not a:
            continue
        bars = a["daily"]
        idx = next((i for i, b in enumerate(bars) if b["t"] == e["bar_t"]), None)
        if idx is None:
            continue
        res = simulate(bars, idx, e, cfg["costs_roundtrip_pct"][e["cls"]], rules["max_hold_bars"])
        if res:
            e.update(status=res["result"], r=round(res["r"], 3), fill=res["entry"], closed_bars=res["bars"])
    return log


def main():
    t0 = time.time()
    cfg = json.loads((ROOT / "config.json").read_text())
    rules = cfg["signal_rules"]
    now = int(time.time())

    med = macro.medium_term(sources.fred_series("DFF"), sources.fred_series("DGS2"),
                            sources.fred_series("DGS10"), sources.yahoo_chart("DX-Y.NYB", "1d", "2y"))
    intr = macro.intraday(sources.yahoo_chart("DX-Y.NYB", "1h", "5d"), sources.yahoo_chart("^TNX", "1h", "5d"))
    perps = sources.hyperliquid_perps()
    assets = load_universe(cfg)

    all_trades, live, market, radar = [], [], [], []
    preps = {}
    for a in assets:
        cost = cfg["costs_roundtrip_pct"][a["cls"]]
        p = Prepared(a["daily"])
        preps[a["symbol"]] = p
        all_trades += [dict(t, symbol=a["symbol"]) for t in backtest(p, a["cls"], cost, rules)]

    hist = {}
    for cls in CLASSES:
        for st in SETUPS:
            hist[(cls, st)] = stats([t for t in all_trades if t["cls"] == cls and t["setup"] == st])

    for a in assets:
        p, bars = preps[a["symbol"]], a["daily"]
        i = len(bars) - 1
        b, prev = bars[i], bars[i - 1]
        crowd = perps.get(a["symbol"], {}).get("funding_apr") if a["cls"] == "crypto" else None
        cot_pct = a["cot"]["pct"] if a["cot"] else None
        trend = trend_at(p, i)
        rv = rvol(bars, i)
        market.append({
            "symbol": a["symbol"], "cls": a["cls"], "price": b["c"],
            "chg_pct": round((b["c"] - prev["c"]) / prev["c"] * 100, 2), "trend": trend,
            "rvol": round(rv, 2) if rv else None, "atr_pct": round(p.atr[i] / b["c"] * 100, 2),
            "funding_apr": round(crowd, 1) if crowd is not None else None,
            "oi_usd": perps.get(a["symbol"], {}).get("open_interest_usd") if a["cls"] == "crypto" else None,
            "cot": a["cot"], "bar_t": b["t"],
            "spark": [round(x["c"], 8) for x in bars[-90:]],
        })
        for s in detect(p, i, rules):
            align = macro.alignment(s["dir"], a["usd_beta"], med["bias"], intr["bias"])
            h = hist.get((a["cls"], s["setup"]))
            pts, grade, notes, proven = score(s, align, crowd, cot_pct, h, rules)
            live.append(s | {"symbol": a["symbol"], "cls": a["cls"], "score": pts, "grade": grade,
                             "notes": notes, "proven": proven, "macro_align": round(align, 2),
                             "bar_t": b["t"], "hist": h, "cost_pct": cfg["costs_roundtrip_pct"][a["cls"]]})
        q = quiet_volume(p, i, rules)
        if q:
            radar.append({"symbol": a["symbol"], "cls": a["cls"], "tf": "1D", "kind": "quiet_volume"} | q)
        sp = intraday_spike(a["hourly"]) if a["hourly"] else None
        if sp:
            radar.append({"symbol": a["symbol"], "cls": a["cls"], "tf": "1H", "kind": "hourly_spike"} | sp)

    live.sort(key=lambda s: -s["score"])
    radar.sort(key=lambda r: -r["rvol"])

    crowding = sorted(
        ({"symbol": k} | {kk: round(vv, 2) for kk, vv in v.items()} for k, v in perps.items()
         if v["volume_24h_usd"] > 5_000_000),
        key=lambda x: -abs(x["funding_apr"]))[:25]

    log_path = DATA / "signals_log.json"
    old_log = load_json(log_path, [])
    old_open = {(e["symbol"], e["bar_t"], e["setup"]) for e in old_log if e["status"] == "open"}
    log = update_log(old_log, {a["symbol"]: a for a in assets}, live, cfg, now)
    newly_logged = [e for e in log if e["logged"] == now and e["grade"] == "A"]
    closed_now = [e for e in log if (e["symbol"], e["bar_t"], e["setup"]) in old_open and e["status"] != "open"]

    live_stats = {cls: stats([dict(e, t=e["bar_t"], result=e["status"]) for e in log
                              if e["cls"] == cls and e["status"] not in ("open",)])
                  for cls in CLASSES}
    bt_class = {cls: stats([t for t in all_trades if t["cls"] == cls]) for cls in CLASSES}

    # equity curve of the whole backtest, in R, weekly points
    eq, curve, last_week = 0.0, [], None
    for t in sorted((t for t in all_trades if t["result"] != "skipped"), key=lambda t: t["t"]):
        eq += t["r"]
        wk = t["t"] // (7 * 86400)
        if wk != last_week:
            curve.append([t["t"], round(eq, 2)])
            last_week = wk
        else:
            curve[-1] = [t["t"], round(eq, 2)]

    DATA.mkdir(parents=True, exist_ok=True)
    latest = {
        "generated": now, "runtime_s": round(time.time() - t0, 1),
        "macro": {"medium": med, "intraday": intr},
        "setups": live, "radar": radar, "market": market, "crowding": crowding,
        "errors": sources.ERRORS[:30], "asset_count": len(assets),
    }
    (DATA / "latest.json").write_text(json.dumps(latest, separators=(",", ":")))
    (DATA / "scorecard.json").write_text(json.dumps({
        "generated": now,
        "backtest": {f"{c}|{s}": v for (c, s), v in hist.items()},
        "backtest_class": bt_class, "live_class": live_stats, "equity_curve": curve,
        "costs_roundtrip_pct": cfg["costs_roundtrip_pct"], "rules": rules,
    }, separators=(",", ":")))
    log_path.write_text(json.dumps(log[-2000:], indent=0))

    notify.telegram(newly_logged, closed_now, med)
    print(f"assets={len(assets)} setups={len(live)} radar={len(radar)} trades_bt={len(all_trades)} "
          f"errors={len(sources.ERRORS)} in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
