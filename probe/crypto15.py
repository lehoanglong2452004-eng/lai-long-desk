import json, sys
from pipeline import factory
for iv, tf in (("15m", "15m"), ("5m", "5m")):
    b = factory.binance_hist("BTCUSDT", iv, 5)
    json.dump({"t": [x["t"] for x in b], "o": [x["o"] for x in b], "h": [x["h"] for x in b], "l": [x["l"] for x in b], "c": [x["c"] for x in b], "v": [x["v"] for x in b]},
              open(f"probe/out/data/bars/BTC_{tf}.json", "w"))
