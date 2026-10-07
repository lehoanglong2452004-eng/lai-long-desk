import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tests import fake
from pipeline import factory


def tf_set(seed):
    return {"1W": fake.walk(400, seed=seed, step=604800, vol=0.05), "1D": fake.walk(1200, seed=seed + 1),
            "4H": fake.walk(1500, seed=seed + 2, step=14400, vol=0.01), "1H": fake.walk(2000, seed=seed + 3, step=3600, vol=0.006)}


class FactoryTests(unittest.TestCase):
    def test_departments_no_lookahead(self):
        bars = fake.walk(700, seed=11)
        full, *_ = factory.departments(bars)
        for i in range(120, 690, 23):
            cut, *_ = factory.departments(bars[: i + 1])
            self.assertEqual(full[i], cut[i], f"bar {i} uses future data")
            self.assertEqual(factory.setups_at(bars, full, i, 1, "1W"), factory.setups_at(bars[: i + 1], cut, i, 1, "1W"))

    def test_profile_value_area(self):
        bars = [{"t": k, "o": 100, "h": 101 + (k % 5 == 0) * 10, "l": 99, "c": 100, "v": 10} for k in range(50)]
        p = factory.profile(bars, 0, 50)
        self.assertLess(p["val"], 100.5)
        self.assertGreater(p["vah"], 99.5)
        self.assertLess(abs(p["poc"] - 100), 1.5)

    def test_process_all_timeframes_and_trade_log(self):
        res, trades = factory.process({"symbol": "X", "cls": "crypto", "source": "test", "tf": tf_set(5)}, 0.2)
        self.assertEqual(set(res["tfs"]), set(factory.TFS))
        self.assertTrue(trades, "no trades on 3000+ synthetic bars")
        t = trades[0]
        for k in ("tf", "setup", "dir", "entry_t", "entry", "stop", "target", "exit_t", "exit", "r", "reasons"):
            self.assertIn(k, t)
        self.assertGreaterEqual(t["exit_t"], t["entry_t"])
        s = factory.summary(res)
        self.assertIn("1W", s["tfs"])

    def test_write_bars_columns_for_midoti(self):
        bars = fake.walk(300, seed=3, step=3600, vol=0.01)
        with tempfile.TemporaryDirectory() as d, mock.patch.object(factory, "DATA", Path(d)):
            factory.write_bars([{"symbol": "X", "cls": "crypto", "source": "test", "yahoo": None, "bars": {"1H": bars, "4H": []}}])
            j = json.loads((Path(d) / "bars" / "X_1H.json").read_text())
            idx = json.loads((Path(d) / "bars" / "index.json").read_text())
        self.assertEqual(len(j["t"]), 300)
        self.assertEqual(set(j), {"s", "tf", "t", "o", "h", "l", "c", "v"})
        self.assertAlmostEqual(j["c"][-1], bars[-1]["c"], delta=abs(bars[-1]["c"]) * 1e-6)
        self.assertEqual(list(idx["assets"][0]["tfs"]), ["1H"])


if __name__ == "__main__":
    unittest.main()
