// Traditional desk, server side: run site/traditional/engine.js (the same code the page runs) on every asset's
// bars and write site/data/trad/index.json: the council, which models work now per window, and live signals.
//   node pipeline/traditional.cjs            (after pipeline.factory has written site/data/bars)
"use strict";
const fs = require("fs");
const path = require("path");
const T = require("../site/traditional/engine.js");

const DATA = process.env.LLD_DATA_DIR ? path.resolve(process.env.LLD_DATA_DIR) : path.join(__dirname, "..", "site", "data");
const BARS = path.join(DATA, "bars");
const OUT = path.join(DATA, "trad");
const MIN_N = 8;  // fewer trades than this is not a result

const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);
const pack = (s) => [s.n, r2(s.win), r2(s.avgR), r2(s.totalR), s.p == null ? null : Math.round(s.p * 1e4) / 1e4];
const r3 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1000) / 1000);
// at most n points of a cumulative curve, keeping the last one
const thin = (c, n = 300) => { const k = Math.max(1, Math.ceil(c.length / n)); return c.filter((_, i) => i % k === 0 || i === c.length - 1).map(([t, v]) => [t, r2(v)]); };
function summary(v, top = 40) {
  if (!v) return null;
  const st = (x) => ({ n: x.n, win: r3(x.win), avgR: r3(x.avgR), totalR: r2(x.totalR), p: r3(x.p) });
  return { tested: v.tested, green: v.green, nsig: v.sig.length, start: v.start, end: v.end, mid: v.mid,
    sig: v.sig.sort((a, b) => a.q - b.q).slice(0, top).map((c) => [c.key, c.n, r3(c.win), r3(c.avgR), r2(c.t), r3(c.q)]),
    wf: { sel: st(v.wf.sel), all: st(v.wf.all), hind: st(v.wf.hind), naive: st(v.wf.naive), selC: thin(v.wf.selC), allC: thin(v.wf.allC), hindC: thin(v.wf.hindC), naiveC: thin(v.wf.naiveC) },
    weeks: v.weeks, split: v.split.slice(0, 600).map((x) => [x[0], r3(x[1]), r3(x[2]), x[3], x[4], r3(x[5])]) };
}

function load(sym) {
  const bars = {};
  for (const tf of T.TFS) {
    const f = path.join(BARS, `${sym}_${tf}.json`);
    if (fs.existsSync(f)) bars[tf] = JSON.parse(fs.readFileSync(f, "utf8"));
  }
  return bars;
}

function main() {
  const t0 = Date.now();
  const idx = JSON.parse(fs.readFileSync(path.join(BARS, "index.json"), "utf8"));
  fs.mkdirSync(OUT, { recursive: true });
  const assets = [], pooled = {}, errors = [], val = { asset: [], cls: [] };
  for (const [w] of T.WINDOWS) pooled[w] = [];
  for (const a of idx.assets) {
    try {
      const bars = load(a.symbol);
      if (!Object.keys(bars).length) continue;
      const A = T.runAsset(bars, { costPct: T.COST[a.cls] ?? 0.05 });
      // validation sample: council-aligned closed trades of the last 12 months
      const vt = A.trades.filter((x) => x.agree && !x.open && x.t >= A.now - 365 * 86400);
      for (const x of T.PEGGED.includes(a.symbol) ? [] : vt) {  // pegged currencies stay out of the validation pools
        val.asset.push({ key: `${a.symbol}|${x.kind}|${x.tf}`, t: x.t, exitT: x.exitT, R: x.R });
        val.cls.push({ key: `${a.cls}|${x.kind}|${x.tf}`, t: x.t, exitT: x.exitT, R: x.R });
      }
      const row = { symbol: a.symbol, cls: a.cls, now: A.now, council: { up: r2(A.council.up), dn: r2(A.council.dn), votes: A.council.votes.map((v) => [v.tf, v.v]) }, win: {}, signals: [] };
      for (const [w, days] of T.WINDOWS) {
        const tr = T.windowed(A.trades, A.now, days, (x) => x.agree);
        pooled[w].push(...tr.filter((x) => !x.open).map((x) => [x.kind, x.tf, x.R, x.vol ? 1 : 0]));
        const best = [];
        for (const m of T.MODELS) for (const tf of T.TFS) {
          const s = T.stats(tr.filter((x) => x.kind === m && x.tf === tf));
          if (s.n >= MIN_N) best.push([m, tf, ...pack(s)]);
        }
        best.sort((x, y) => y[4] - x[4]);
        row.win[w] = { all: pack(T.stats(tr)), best: best.slice(0, 5) };
      }
      // signals on the last closed bar of each timeframe
      for (const tf of T.TFS) {
        const r = A.res[tf];
        if (!r) continue;
        const evs = [].concat(r.elliott, r.wyckoff, r.darvas, r.breakouts, r.range).filter((e) => e.i >= r.n - 2);
        for (const e of evs) {
          const c = T.council(A.res, r.closeT[e.i]);
          row.signals.push({ tf, kind: e.kind, dir: e.dir, t: e.t, vol: !!e.vol, vote: r2(e.dir === 1 ? c.up : c.dn) });
        }
      }
      assets.push(row);
    } catch (e) {
      errors.push(`${a.symbol}: ${e.message}`);
    }
  }
  // all assets pooled: which model works on which timeframe in each window (council-aligned trades)
  const grid = {};
  for (const [w] of T.WINDOWS) {
    grid[w] = {};
    for (const m of T.MODELS) for (const tf of T.TFS) {
      const R = pooled[w].filter((x) => x[0] === m && x[1] === tf).map((x) => ({ R: x[2] }));
      const s = T.stats(R);
      if (s.n) grid[w][`${m}|${tf}`] = pack(s);
    }
  }
  // q-values per window over the pooled grid: which pooled cells survive testing many cells at once
  for (const [w] of T.WINDOWS) {
    const keys = Object.keys(grid[w]).filter((k) => grid[w][k][0] >= MIN_N && grid[w][k][4] != null);
    const q = T.bh(keys.map((k) => grid[w][k][4]));
    keys.forEach((k, i) => grid[w][k].push(Math.round(q[i] * 1e4) / 1e4));
  }
  const t1 = Date.now();
  const validation = { generated: Math.floor(Date.now() / 1000), asset: summary(T.validate(val.asset)), cls: summary(T.validate(val.cls)) };
  fs.writeFileSync(path.join(OUT, "validate.json"), JSON.stringify(validation));
  console.log(`validation ${((Date.now() - t1) / 1000).toFixed(1)}s: asset-level tested=${validation.asset && validation.asset.tested} significant=${validation.asset && validation.asset.nsig}`);
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ generated: Math.floor(Date.now() / 1000), runtime_s: (Date.now() - t0) / 1000, assets, grid, errors }));
  console.log(`traditional assets=${assets.length} errors=${errors.length} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main();
