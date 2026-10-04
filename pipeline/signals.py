"""Setup detection, trade simulation and scoring.

The same `detect` runs live and in the backtest, so the statistics shown on the
terminal describe exactly the rules that produce today's alerts.
"""
from .indicators import atr, ema, levels, pivots, rvol

SETUPS = ("TREND_PULLBACK", "VOL_BREAKOUT", "RANGE_EDGE")


class Prepared:
    """Indicators computed once per asset so detection at any bar is cheap."""

    def __init__(self, bars):
        self.bars = bars
        closes = [b["c"] for b in bars]
        self.e20 = ema(closes, 20)
        self.e50 = ema(closes, 50)
        self.e200 = ema(closes, 200)
        self.atr = atr(bars)
        self.piv = pivots(bars)


def trend_at(p, i):
    c = p.bars[i]["c"]
    if i < 210:
        return "range"
    if c > p.e50[i] > p.e200[i] and p.e50[i] > p.e50[i - 10]:
        return "up"
    if c < p.e50[i] < p.e200[i] and p.e50[i] < p.e50[i - 10]:
        return "down"
    return "range"


def _setup(name, direction, entry, stop, target, why):
    risk = abs(entry - stop)
    if risk <= 0:
        return None
    return {"setup": name, "dir": direction, "entry": entry, "stop": stop, "target": target,
            "rr": abs(target - entry) / risk, "why": why}


def detect(p, i, rules):
    """All setups that trigger on closed bar i. Uses only bars[:i+1]."""
    bars = p.bars
    if i < 210:
        return []
    b, a = bars[i], p.atr[i]
    if a <= 0:
        return []
    c = b["c"]
    rng = b["h"] - b["l"] or a
    close_pos = (c - b["l"]) / rng  # 1 = closed at the high
    trend = trend_at(p, i)
    lv = levels(p.piv, i, a)
    sup = sorted((z for z in lv if z["price"] < c), key=lambda z: -z["price"])
    res = sorted((z for z in lv if z["price"] > c), key=lambda z: z["price"])
    rv = rvol(bars, i) or 0
    out = []

    def next_res(min_dist):
        return next((z["price"] for z in res if z["price"] > c + min_dist), None)

    def next_sup(min_dist):
        return next((z["price"] for z in sup if z["price"] < c - min_dist), None)

    # 1. Trend pullback: price dips into a support zone in an uptrend and rejects it
    # (only zones tested at least twice count: a level the market has already respected)
    strong_sup = [z for z in sup if z["touches"] >= 2]
    strong_res = [z for z in res if z["touches"] >= 2]
    if trend == "up" and strong_sup:
        z = strong_sup[0]
        s = z["price"]
        if b["l"] <= s + 0.5 * a and c - s <= 1.5 * a and c > b["o"] and close_pos >= 0.5:
            stop = min(b["l"] - 0.25 * a, s - 0.5 * a)
            tgt = next_res(0.5 * a) or c + 3 * a
            out.append(_setup("TREND_PULLBACK", "long", c, stop, tgt,
                              f"uptrend, rejected support {s:.6g} ({z['touches']} touches)"))
    if trend == "down" and strong_res:
        z = strong_res[0]
        r = z["price"]
        if b["h"] >= r - 0.5 * a and r - c <= 1.5 * a and c < b["o"] and close_pos <= 0.5:
            stop = max(b["h"] + 0.25 * a, r + 0.5 * a)
            tgt = next_sup(0.5 * a) or c - 3 * a
            out.append(_setup("TREND_PULLBACK", "short", c, stop, tgt,
                              f"downtrend, rejected resistance {r:.6g} ({z['touches']} touches)"))

    # 2. Breakout on abnormal volume
    hi20 = max(x["h"] for x in bars[i - 20:i])
    lo20 = min(x["l"] for x in bars[i - 20:i])
    if c > hi20 and rv >= rules["rvol_spike"] and trend != "down" and close_pos >= 0.7:
        tgt = next_res(1.0 * a) or c + 3.5 * a
        out.append(_setup("VOL_BREAKOUT", "long", c, c - 1.5 * a, tgt,
                          f"20-bar high broken on {rv:.1f}x volume"))
    if c < lo20 and rv >= rules["rvol_spike"] and trend != "up" and close_pos <= 0.3:
        tgt = next_sup(1.0 * a) or c - 3.5 * a
        out.append(_setup("VOL_BREAKOUT", "short", c, c + 1.5 * a, tgt,
                          f"20-bar low broken on {rv:.1f}x volume"))

    # 3. Range edge reaction: sideways market, price bounces off the range boundary
    if trend == "range":
        hi40 = max(x["h"] for x in bars[i - 40:i])
        lo40 = min(x["l"] for x in bars[i - 40:i])
        if hi40 - lo40 >= 4 * a:
            if b["l"] <= lo40 + 0.3 * a and c > b["o"] and c > lo40:
                out.append(_setup("RANGE_EDGE", "long", c, min(b["l"], lo40) - 0.7 * a, hi40 - 0.5 * a,
                                  f"range {lo40:.6g}-{hi40:.6g}, bounce off the floor"))
            if b["h"] >= hi40 - 0.3 * a and c < b["o"] and c < hi40:
                out.append(_setup("RANGE_EDGE", "short", c, max(b["h"], hi40) + 0.7 * a, lo40 + 0.5 * a,
                                  f"range {lo40:.6g}-{hi40:.6g}, rejected at the ceiling"))

    res_out = []
    for s in out:
        if s and s["rr"] >= rules["min_rr"]:
            s["rvol"] = round(rv, 2)
            s["atr"] = a
            s["trend"] = trend
            res_out.append(s)
    return res_out


def quiet_volume(p, i, rules):
    """Abnormal volume while price barely moved: someone is positioning quietly."""
    if i < 21:
        return None
    b, a = p.bars[i], p.atr[i]
    rv = rvol(p.bars, i)
    if not rv or rv < rules["rvol_quiet"] or abs(b["c"] - p.bars[i - 1]["c"]) >= 0.5 * a:
        return None
    rng = b["h"] - b["l"] or a
    pos = (b["c"] - b["l"]) / rng
    hint = "accumulation" if pos > 0.6 else "distribution" if pos < 0.4 else "unclear"
    return {"rvol": round(rv, 2), "hint": hint, "move_atr": round((b["c"] - p.bars[i - 1]["c"]) / a, 2)}


def simulate(bars, start, s, cost_pct, max_hold):
    """Follow a setup on the bars after `start`.

    Entry at the next bar's open, fixed stop and target. If one bar touches both,
    the stop is assumed first (conservative). Returns None while still open.
    """
    if start + 1 >= len(bars):
        return None
    entry = bars[start + 1]["o"]
    long = s["dir"] == "long"
    risk = (entry - s["stop"]) if long else (s["stop"] - entry)
    if risk <= 0:  # gapped through the stop before entry: skip the trade
        return {"result": "skipped", "r": 0.0, "bars": 0, "entry": entry}
    cost_r = entry * cost_pct / 100 / risk
    end = min(len(bars), start + 1 + max_hold)
    for j in range(start + 1, end):
        b = bars[j]
        if (long and b["l"] <= s["stop"]) or (not long and b["h"] >= s["stop"]):
            return {"result": "loss", "r": -1 - cost_r, "bars": j - start, "entry": entry}
        if (long and b["h"] >= s["target"]) or (not long and b["l"] <= s["target"]):
            gross = abs(s["target"] - entry) / risk
            return {"result": "win", "r": gross - cost_r, "bars": j - start, "entry": entry}
    if end - (start + 1) < max_hold:
        return None  # not finished yet
    last = bars[end - 1]["c"]
    gross = ((last - entry) if long else (entry - last)) / risk
    return {"result": "expired", "r": gross - cost_r, "bars": max_hold, "entry": entry}


def score(s, macro_align, crowd, cot_pct, hist, rules):
    """0-100 quality score with the reasons that moved it."""
    pts = {"TREND_PULLBACK": 50, "VOL_BREAKOUT": 45, "RANGE_EDGE": 40}[s["setup"]]
    notes = []
    rv = s.get("rvol") or 0
    vol_pts = 15 if rv >= 3 else 10 if rv >= 2 else 5 if rv >= 1.5 else 0
    if vol_pts:
        pts += vol_pts
        notes.append(f"+{vol_pts} volume {rv:.1f}x")
    if s["rr"] >= 3:
        pts += 5
        notes.append("+5 R:R >= 3")
    sign = 1 if s["dir"] == "long" else -1
    if macro_align:
        m = 10 * macro_align
        pts += m
        notes.append(f"{m:+.0f} macro (rates/USD)")
    if crowd is not None:
        f = crowd * sign  # positive = trading with the crowd
        if f > 30:
            pts -= 10
            notes.append("-10 crowded side (funding)")
        elif f < -10:
            pts += 5
            notes.append("+5 crowd on the other side (squeeze fuel)")
    if cot_pct is not None:
        cp = cot_pct if sign > 0 else 100 - cot_pct
        if cp >= 90:
            pts -= 5
            notes.append("-5 speculators already extreme (COT)")
        elif cp <= 10:
            pts += 5
            notes.append("+5 speculators positioned the other way (COT)")
    proven = None
    if hist and hist["n"] >= 30:
        proven = hist["exp_r"] > 0
        if proven and hist["exp_r"] >= 0.2:
            pts += 5
            notes.append(f"+5 backtest {hist['exp_r']:+.2f}R/trade")
        if not proven:
            pts = min(pts, rules["grade_b"] - 1)
            notes.append(f"capped: backtest loses after costs ({hist['exp_r']:+.2f}R)")
    pts = max(0, min(100, round(pts)))
    grade = "A" if pts >= rules["grade_a"] else "B" if pts >= rules["grade_b"] else "C"
    return pts, grade, notes, proven
