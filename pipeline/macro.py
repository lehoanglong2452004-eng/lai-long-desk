"""USD bias from interest-rate policy (medium term) and DXY + yields (intraday).

Bias is a number from -2 (USD weak) to +2 (USD strong). An asset's alignment with
a trade is  direction x usd_beta x bias : positive means the macro wind is behind it.
"""
from .indicators import ema


def _ago(series, n):
    return series[-1 - n][1] if len(series) > n else None


def _sign(x, dead=0.0):
    return 1 if x > dead else -1 if x < -dead else 0


def medium_term(dff, dgs2, dgs10, dxy_daily):
    reasons, score = [], 0
    out = {"fed_funds": None, "us2y": None, "us10y": None}
    if dff:
        ff = dff[-1][1]
        out["fed_funds"] = ff
        ff_90 = _ago(dff, 90)  # DFF is daily including weekends: ~90 days
        if ff_90 is not None:
            d = ff - ff_90
            if d < -0.1:
                score -= 1
                reasons.append(f"Fed cutting: funds rate {ff_90:.2f}% -> {ff:.2f}% in 90d")
            elif d > 0.1:
                score += 1
                reasons.append(f"Fed hiking: funds rate {ff_90:.2f}% -> {ff:.2f}% in 90d")
            else:
                reasons.append(f"Fed on hold at {ff:.2f}%")
        if dgs2:
            y2 = dgs2[-1][1]
            out["us2y"] = y2
            spread = y2 - ff
            if spread < -0.25:
                score -= 1
                reasons.append(f"2Y {y2:.2f}% below funds rate: market prices more cuts")
            elif spread > 0.25:
                score += 1
                reasons.append(f"2Y {y2:.2f}% above funds rate: market prices hikes")
    if dgs10:
        out["us10y"] = dgs10[-1][1]
        y10_60 = _ago(dgs10, 42)  # ~60 calendar days of business-day data
        if y10_60 is not None:
            reasons.append(f"10Y {y10_60:.2f}% -> {dgs10[-1][1]:.2f}% over ~2 months")
    if len(dxy_daily) > 200:
        closes = [b["c"] for b in dxy_daily]
        e50, e200 = ema(closes, 50)[-1], ema(closes, 200)[-1]
        c = closes[-1]
        if c > e50 > e200:
            score += 1
            reasons.append(f"DXY {c:.2f} in uptrend (above 50/200-day averages)")
        elif c < e50 < e200:
            score -= 1
            reasons.append(f"DXY {c:.2f} in downtrend (below 50/200-day averages)")
        else:
            reasons.append(f"DXY {c:.2f} no clear trend")
        out["dxy"] = c
    out["bias"] = max(-2, min(2, score))
    out["reasons"] = reasons
    return out


def intraday(dxy_1h, tnx_1h, lookback=8):
    """Last ~8 hours of DXY and the US 10Y yield."""
    out = {"bias": 0, "reasons": []}
    score = 0
    if len(dxy_1h) > lookback:
        a, b = dxy_1h[-1 - lookback]["c"], dxy_1h[-1]["c"]
        chg = (b - a) / a * 100
        out["dxy_chg_pct"] = round(chg, 3)
        score += _sign(chg, 0.05)
        out["reasons"].append(f"DXY {chg:+.2f}% over last {lookback}h")
    if len(tnx_1h) > lookback:
        a, b = tnx_1h[-1 - lookback]["c"], tnx_1h[-1]["c"]
        bp = (b - a) * 100 if b < 20 else (b - a) * 10  # ^TNX quoted in % (older feeds x10)
        out["us10y_chg_bp"] = round(bp, 1)
        score += _sign(bp, 2)
        out["reasons"].append(f"US10Y {bp:+.1f}bp over last {lookback}h")
    out["bias"] = score
    return out


def alignment(direction, usd_beta, medium_bias, intraday_bias):
    """+1 strongly aligned ... -1 strongly against. Medium term weighs 3x intraday (swing first)."""
    d = 1 if direction == "long" else -1
    m = _sign(medium_bias) * usd_beta * d
    i = _sign(intraday_bias) * usd_beta * d
    return max(-1.0, min(1.0, 0.75 * m + 0.25 * i))
