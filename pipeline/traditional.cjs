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
const pack = (s) => [s.n, r2(s.win), r2(s.avgR), r2(s.totalR)];

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
  const assets = [], pooled = {}, errors = [];
  for (const [w] of T.WINDOWS) pooled[w] = [];
  for (const a of idx.assets) {
    try {
      const bars = load(a.symbol);
      if (!Object.keys(bars).length) continue;
      const A = T.runAsset(bars, { costPct: T.COST[a.cls] ?? 0.05 });
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
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ generated: Math.floor(Date.now() / 1000), runtime_s: (Date.now() - t0) / 1000, assets, grid, errors }));
  console.log(`traditional assets=${assets.length} errors=${errors.length} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main();
