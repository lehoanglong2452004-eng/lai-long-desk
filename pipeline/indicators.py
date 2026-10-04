"""Basic indicators on lists of bars. Pure Python, no dependencies."""
from statistics import median


def ema(values, n):
    out, k, prev = [], 2 / (n + 1), None
    for v in values:
        prev = v if prev is None else v * k + prev * (1 - k)
        out.append(prev)
    return out


def atr(bars, n=14):
    out, prev = [], None
    for i, b in enumerate(bars):
        tr = b["h"] - b["l"] if i == 0 else max(
            b["h"] - b["l"], abs(b["h"] - bars[i - 1]["c"]), abs(b["l"] - bars[i - 1]["c"]))
        prev = tr if prev is None else (prev * (n - 1) + tr) / n  # Wilder smoothing
        out.append(prev)
    return out


def rvol(bars, i, n=20):
    """Volume of bar i divided by the median volume of the n bars before it."""
    if i < n:
        return None
    base = median(b["v"] for b in bars[i - n:i])
    if not base or not bars[i]["v"]:
        return None
    return bars[i]["v"] / base


def pivots(bars, k=3):
    """Swing highs/lows: a bar higher (lower) than k bars on each side.

    Returns [(index, price, "H"|"L")]; a pivot at index p is only known at p + k.
    """
    out = []
    for p in range(k, len(bars) - k):
        win = bars[p - k:p + k + 1]
        if bars[p]["h"] == max(b["h"] for b in win):
            out.append((p, bars[p]["h"], "H"))
        if bars[p]["l"] == min(b["l"] for b in win):
            out.append((p, bars[p]["l"], "L"))
    return out


def levels(piv, i, atr_i, lookback=120, k=3):
    """Support/resistance zones from pivots confirmed by bar i (no look-ahead).

    Pivots closer than half an ATR are merged; touches = how many pivots formed the zone.
    """
    pts = sorted(p for idx, p, _ in piv if i - lookback <= idx <= i - k)
    zones = []
    for p in pts:
        if zones and p - zones[-1]["hi"] <= 0.5 * atr_i:
            z = zones[-1]
            z["hi"] = p
            z["sum"] += p
            z["touches"] += 1
        else:
            zones.append({"lo": p, "hi": p, "sum": p, "touches": 1})
    return [{"price": z["sum"] / z["touches"], "touches": z["touches"]} for z in zones]
