import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from tests import fake

ROOT = Path(__file__).resolve().parent.parent
NODE = shutil.which("node")
STEP = {"1W": 604800, "1D": 86400, "4H": 14400, "1H": 3600, "15m": 900, "5m": 300, "1m": 60}


def cols(bars, sym, tf):
    return {"s": sym, "tf": tf, **{k: [b[k] for b in bars] for k in "tohlcv"}}


@unittest.skipUnless(NODE, "node is not installed")
class TraditionalTests(unittest.TestCase):
    def test_server_summary(self):
        with tempfile.TemporaryDirectory() as d:
            bars = Path(d) / "bars"
            bars.mkdir()
            for k, (sym, cls) in enumerate([("AAA", "crypto"), ("BBB", "forex")]):
                for j, (tf, step) in enumerate(STEP.items()):
                    b = fake.walk(1500, step=step, seed=10 * k + j, vol=0.01)
                    (bars / f"{sym}_{tf}.json").write_text(json.dumps(cols(b, sym, tf)))
            (bars / "index.json").write_text(json.dumps({"assets": [{"symbol": "AAA", "cls": "crypto"}, {"symbol": "BBB", "cls": "forex"}, {"symbol": "CCC", "cls": "stock"}]}))
            subprocess.run([NODE, str(ROOT / "pipeline" / "traditional.cjs")], check=True, env={**os.environ, "LLD_DATA_DIR": d}, capture_output=True)
            out = json.loads((Path(d) / "trad" / "index.json").read_text())
            self.assertEqual([a["symbol"] for a in out["assets"]], ["AAA", "BBB"])  # CCC has no bars: skipped
            self.assertEqual(out["errors"], [])
            a = out["assets"][0]
            self.assertEqual(set(a["win"]), {"12m", "6m", "3m", "1m", "1w", "1d"})
            self.assertAlmostEqual(a["council"]["up"] + a["council"]["dn"] <= 100, True)
            self.assertTrue(any(out["grid"]["12m"]))

    def test_signals_do_not_look_ahead(self):
        # every signal found on bars 0..k must be found identically when the run only sees bars 0..k
        script = r"""
const T = require(process.argv[1]); const n = 1200;
let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
const B = { t: [], o: [], h: [], l: [], c: [], v: [] }; let p = 100;
for (let i = 0; i < n; i++) { const d = Math.floor(i / 150) % 3 === 0 ? 0.002 : Math.floor(i / 150) % 3 === 2 ? -0.002 : 0;
  const o = p, c = o * (1 + d + (r() - 0.5) * 0.02); B.t.push(1.7e9 + i * 3600); B.o.push(o); B.c.push(c);
  B.h.push(Math.max(o, c) * (1 + r() * 0.005)); B.l.push(Math.min(o, c) * (1 - r() * 0.005)); B.v.push(1000 + r() * 1000); p = c; }
const cut = (k) => Object.fromEntries(Object.entries(B).map(([f, a]) => [f, a.slice(0, k + 1)]));
const key = (R, k) => [].concat(R.elliott, R.wyckoff, R.darvas, R.breakouts, R.range).filter((e) => e.i <= k).map((e) => `${e.kind}@${e.i}:${e.dir}`).sort().join(",");
const full = T.runTF(B, "1H", {}); let bad = 0, tot = 0;
for (let k = 300; k < n - 1; k += 97) { const part = T.runTF(cut(k), "1H", {}); tot += key(full, k).split(",").length;
  if (key(full, k) !== key(part, k) || full.trend[k] !== part.trend[k]) { bad++; console.error("mismatch at", k); } }
console.log(JSON.stringify({ bad, tot }));
"""
        r = subprocess.run([NODE, "-e", script, str(ROOT / "site" / "traditional" / "engine.js")], capture_output=True, text=True, check=True)
        res = json.loads(r.stdout)
        self.assertEqual(res["bad"], 0, r.stderr)
        self.assertGreater(res["tot"], 20)


if __name__ == "__main__":
    unittest.main()
