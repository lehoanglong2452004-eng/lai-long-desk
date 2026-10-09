"""Order Flow engine (site/orderflow/ofcore.js): footprint sums match the trades, bars are rebuilt the same way
live and from history, and the tools run on a synthetic tape."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = r"""
const O = require(process.argv[1]);
const tf = 3e5, NOW = 1790000000000 - (1790000000000 % tf);
const px = (t) => 60000 + 800 * Math.sin(t / 3.6e6) + 150 * Math.sin(t / 4e5) + 10 * Math.sin(t / 1.7e3);
const kb = [];
for (let t = NOW - 300 * tf; t < NOW; t += tf) kb.push({ t, o: px(t), h: px(t) + 30, l: px(t) - 30, c: px(t + tf - 1), v: 50, bv: 25 });
const trades = [];
for (let id = 0; id < 20000; id++) { const t = NOW - 3 * 3600e3 + id * 500, h = Math.abs(Math.sin(id * 12.9898) * 43758.5453) % 1;
  trades.push([t, Math.round(px(t) * 10) / 10, +(0.001 + h * 0.4).toFixed(3), h > 0.48, id]); }
const A = new O.Engine({ tf, rs: 10 }); A.loadBars(kb); A.setBackfill(trades);
const B = new O.Engine({ tf, rs: 10 }); B.loadBars(kb); B.setBackfill(trades.slice(0, 8000));
for (const r of trades.slice(8000)) B.addTrade(r[0], r[1], r[2], r[3], r[4]);
const cov = A.bars.filter((b) => b.cov);
let bad = 0;
for (const b of cov) { let s = 0, bv = 0; for (const c of b.fp.values()) { s += c[0] + c[1]; bv += c[1]; } if (Math.abs(s - b.v) > 1e-6 || Math.abs(bv - b.bv) > 1e-6) bad++; }
const same = cov.every((b) => { const j = B.idx.get(b.t); return j !== undefined && Math.abs(B.bars[j].v - b.v) < 1e-6 && Math.abs(B.bars[j].bv - b.bv) < 1e-6; });
A.loadM1(kb.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })));
A.setOI(kb.map((b, i) => [b.t, 1e5 + 50 * Math.sin(i / 5)]));
const s = A.session(25), lz = A.liqZones();
console.log(JSON.stringify({ cov: cov.length, bad, same, va: s.va.size, lz: lz.long.size + lz.short.size, fvg: A.fvg().length, reg: A.regime(A.bars.length - 2) }));
"""


@unittest.skipUnless(shutil.which("node"), "node not installed")
class OrderFlowEngine(unittest.TestCase):
    def test_footprint(self):
        out = subprocess.run(["node", "-e", SCRIPT, str(ROOT / "site/orderflow/ofcore.js")], capture_output=True, text=True, check=True)
        r = json.loads(out.stdout)
        self.assertGreater(r["cov"], 30)
        self.assertEqual(r["bad"], 0)          # every footprint adds up to its bar's volume and buy volume
        self.assertTrue(r["same"])             # live trades build the same bars as history
        self.assertGreater(r["va"], 0)
        self.assertGreater(r["lz"], 0)


if __name__ == "__main__":
    unittest.main()
