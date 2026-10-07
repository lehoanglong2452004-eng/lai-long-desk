"""Fast refresh for the news page: quotes, headlines and the economic calendar (with actual figures).

Runs every few minutes on GitHub Actions and is published to the `live-data` branch, which the
page reads from raw.githubusercontent.com. Live ticks between refreshes come from the browser.

Run:  python -m pipeline.live_desk     -> writes live/live.json
"""
import json
import os
import time
from pathlib import Path

from . import news_desk as nd
from .sources import ERRORS

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("LLD_LIVE_OUT") or ROOT / "live" / "live.json")


def main():
    t0 = time.time()
    now_ms = int(time.time() * 1000)
    idx, stk, fx = nd.quotes()
    data = {"generatedAt": now_ms, "indices": idx, "stocks": stk, "forex": fx,
            "news": nd.news(now_ms), "calendar": nd.calendar()}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"live desk: indices={len(idx)} stocks={len(stk)} fx={len(fx)} news={len(data['news'])} "
          f"calendar={len(data['calendar'])} actuals={sum(1 for r in data['calendar'] if r['actual'])} "
          f"errors={len(ERRORS)} in {time.time() - t0:.0f}s")
    for e in ERRORS:
        print("  ", e)


if __name__ == "__main__":
    main()
