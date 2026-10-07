import json
import tempfile
import time
import unittest
from pathlib import Path

from pipeline import health, sources


class HealthTests(unittest.TestCase):
    def test_counts_and_fails_in_row(self):
        d = Path(tempfile.mkdtemp())
        health.DATA = d
        (d / "health").mkdir()
        now = int(time.time())

        def report(ok, fail):
            (d / "health" / "scan.json").write_text(json.dumps(
                {"desk": "scan", "t": now, "errors": fail, "sources": {"yahoo": {"ok": ok, "fail": fail, "error": "x" if fail else None, "what": "yahoo GC=F"}}}))

        for ok, fail in ((5, 0), (0, 3), (0, 2), (1, 1), (0, 4)):
            report(ok, fail)
            health.main()
        h = json.loads((d / "health.json").read_text())
        y = next(s for s in h["sources"] if s["key"] == "yahoo")
        self.assertEqual(y["status"], "down")
        self.assertEqual(y["fails_in_row"], 4)
        self.assertEqual([s for _, s in y["history"]], ["ok", "down", "down", "partial", "down"])
        self.assertEqual(next(x for x in h["desks"] if x["desk"] == "global")["state"], "missing")

    def test_safe_counts_by_source(self):
        sources.CALLS.clear()
        sources._safe("fred DGS10", lambda: 1, None)
        sources._safe("fred DFF", lambda: 1 / 0, None)
        self.assertEqual(sources.CALLS["fred"]["ok"], 1)
        self.assertEqual(sources.CALLS["fred"]["fail"], 1)
        self.assertEqual(sources.CALLS["fred"]["what"], "fred DFF")


if __name__ == "__main__":
    unittest.main()
