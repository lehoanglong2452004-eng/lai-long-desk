import json
import unittest

from tests import fake
from pipeline.signals import Prepared, detect, simulate, score
from pipeline import macro

RULES = {"min_rr": 2.0, "max_hold_bars": 20, "grade_a": 70, "grade_b": 55, "rvol_spike": 2.0, "rvol_quiet": 2.5}


class SignalTests(unittest.TestCase):
    def test_no_lookahead(self):
        bars = fake.walk(600, seed=7)
        full = Prepared(bars)
        for i in range(250, 590, 7):
            cut = Prepared(bars[: i + 1])
            a = [(s["setup"], s["dir"], round(s["stop"], 6)) for s in detect(full, i, RULES)]
            b = [(s["setup"], s["dir"], round(s["stop"], 6)) for s in detect(cut, i, RULES)]
            self.assertEqual(a, b, f"bar {i} uses future data")

    def test_simulate_stop_first_when_both_hit(self):
        bars = [{"t": 0, "o": 100, "h": 100, "l": 100, "c": 100, "v": 1},
                {"t": 1, "o": 100, "h": 120, "l": 90, "c": 100, "v": 1}]
        s = {"dir": "long", "stop": 95, "target": 110}
        res = simulate(bars, 0, s, 0.0, 20)
        self.assertEqual(res["result"], "loss")
        self.assertAlmostEqual(res["r"], -1)

    def test_costs_reduce_r(self):
        bars = [{"t": 0, "o": 100, "h": 100, "l": 100, "c": 100, "v": 1},
                {"t": 1, "o": 100, "h": 111, "l": 99, "c": 110, "v": 1}]
        s = {"dir": "long", "stop": 95, "target": 110}
        res = simulate(bars, 0, s, 0.5, 20)  # 0.5% of 100 = 0.5 = 0.1R
        self.assertAlmostEqual(res["r"], 2 - 0.1)

    def test_losing_backtest_caps_grade(self):
        s = {"setup": "TREND_PULLBACK", "dir": "long", "rr": 3.5, "rvol": 3.2}
        pts, grade, notes, proven = score(s, 1, None, None, {"n": 100, "exp_r": -0.1}, RULES)
        self.assertEqual(grade, "C")
        self.assertFalse(proven)

    def test_macro_alignment(self):
        # USD weak (bias -2): long gold aligned, long USDJPY against
        self.assertGreater(macro.alignment("long", -1, -2, -1), 0)
        self.assertLess(macro.alignment("long", 1, -2, -1), 0)


class EndToEnd(unittest.TestCase):
    def test_full_run_writes_terminal_data(self):
        import os, tempfile
        os.environ["LLD_DATA_DIR"] = tempfile.mkdtemp()
        fake.install()
        from pipeline import run
        run.main()
        latest = json.loads((run.DATA / "latest.json").read_text())
        self.assertGreater(latest["asset_count"], 20)
        self.assertIn("medium", latest["macro"])
        card = json.loads((run.DATA / "scorecard.json").read_text())
        self.assertTrue(card["equity_curve"])


if __name__ == "__main__":
    unittest.main()
