"""Synthetic market data so the pipeline and terminal can be tested offline."""
import random
import time

from pipeline import sources


def walk(n, start=100.0, step=86400, seed=1, drift=0.0004, vol=0.02):
    rnd = random.Random(seed)
    t = int(time.time()) // step * step - n * step
    px, out = start, []
    for k in range(n):
        regime = (k // 150) % 3  # up, range, down blocks
        d = drift if regime == 0 else -drift if regime == 2 else 0
        o = px
        c = o * (1 + d + rnd.gauss(0, vol))
        h = max(o, c) * (1 + abs(rnd.gauss(0, vol / 2)))
        l = min(o, c) * (1 - abs(rnd.gauss(0, vol / 2)))
        v = 1e6 * (1 + abs(rnd.gauss(0, 0.3))) * (4 if rnd.random() < 0.03 else 1)
        out.append({"t": t + k * step, "o": o, "h": h, "l": l, "c": c, "v": v})
        px = c
    return out


def install():
    """Replace every network source with deterministic fakes."""
    seeds = {}

    def seed(key):
        return seeds.setdefault(key, len(seeds) + 1)

    sources.binance_top_symbols = lambda q, n, ex: [{"symbol": f"C{i}USDT", "base": f"C{i}"} for i in range(6)]
    sources.binance_klines = lambda s, iv, lim: walk(lim, seed=seed(s + iv), step=86400 if iv == "1d" else 3600)
    sources.yahoo_chart = lambda tk, iv="1d", rng="5y": walk(1250 if iv == "1d" else 400, seed=seed(tk + iv),
                                                           step=86400 if iv == "1d" else 3600, vol=0.008)
    sources.hyperliquid_perps = lambda: {f"C{i}": {"funding_apr": (i - 3) * 20.0, "open_interest_usd": 1e8,
                                                   "volume_24h_usd": 5e7, "premium_pct": 0.01} for i in range(6)}
    rates = lambda base: [(f"d{i}", base - i * 0.002) for i in range(400)][::-1]  # noqa: E731
    sources.fred_series = lambda sid: rates({"DFF": 4.1, "DGS2": 3.6, "DGS10": 4.2}[sid])
    sources.cftc_cot = lambda code, weeks=160: [(f"2026-{w:03d}", 1000.0 * ((w * 37) % 101 - 50), 5e5)
                                                for w in range(weeks)]
