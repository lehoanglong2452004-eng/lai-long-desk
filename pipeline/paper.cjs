// Paper trading journal: every signal is written down the hour it appears, before anyone knows how it ends,
// and scored on later runs as new bars arrive. Unlike a backtest, nothing here can be re-chosen after the fact.
//   Traditional: council-aligned signals of every model on every timeframe.
//   MIDOTI     : signals v1.568 (default settings) takes on 15m, 30m and 1H.
// Files (committed with the scan, so the journal survives every run): site/data/paper/
//   state.json        last bar seen per system, asset and timeframe
//   YYYY-MM-DD.json   the entries of signals made that day (UTC); open ones are rescored every run
//   summary.json      what the page shows
"use strict";
const fs = require("fs");
const path = require("path");

// the scan runs about hourly, so only timeframes of 15 minutes and up can be written down before their outcome is known
const TRAD_TFS = ["1W", "1D", "4H", "1H", "15m"];
const MIDOTI_TFS = ["15m", "30m", "1H"];
const TF_SEC = { "1W": 604800, "1D": 86400, "4H": 14400, "1H": 3600, "30m": 1800, "15m": 900, "5m": 300, "1m": 60 };
const FINAL = new Set(["closed", "skip", "gone"]);
const day = (t) => new Date(t * 1000).toISOString().slice(0, 10);
const r3 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sig = (x) => (x == null || !isFinite(x) ? null : +(+x).toPrecision(7));

function open(dir, now) {
  fs.mkdirSync(dir, { recursive: true });
  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { return d; } };
  const J = { dir, now, state: read("state.json", { started: now, seen: {} }), days: new Map(), dirty: new Set(), byId: new Map() };
  for (const f of fs.readdirSync(dir).filter((f) => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort()) {
    const d = f.slice(0, 10), list = read(f, []);
    J.days.set(d, list);
    for (const e of list) J.byId.set(e.id, e);
  }
  return J;
}

function add(J, e) {
  if (J.byId.has(e.id)) return null;
  const d = day(e.sigClose);
  if (!J.days.has(d)) J.days.set(d, []);
  J.days.get(d).push(e); J.byId.set(e.id, e); J.dirty.add(d);
  return e;
}
function touch(J, e) { J.dirty.add(day(e.sigClose)); }
// a signal that never became a trade (another trade was open, or costs were too big for the stop) is counted, not kept
function drop(J, e) {
  const d = day(e.sigClose), list = J.days.get(d);
  if (list) { const k = list.indexOf(e); if (k >= 0) list.splice(k, 1); }
  J.byId.delete(e.id); J.dirty.add(d);
  J.state.skipped = J.state.skipped || {};
  J.state.skipped[e.sys] = (J.state.skipped[e.sys] || 0) + 1;
}

// ---------- Traditional ----------
function recordTrad(J, T, sym, cls, A) {
  const fresh = [];
  for (const tf of TRAD_TFS) {
    const r = A.res[tf];
    if (!r) continue;
    const key = `TRAD|${sym}|${tf}`, last = Math.min(r.closeT[r.n - 1], J.now), from = J.state.seen[key] ?? last - 1;
    if (last > from) {
      const evs = [].concat(r.elliott, r.wyckoff, r.darvas, r.breakouts, r.range);
      for (const e of evs) {
        const ct = r.closeT[e.i];
        if (ct <= from || ct > last) continue;
        const c = T.council(A.res, ct), vote = e.dir === 1 ? c.up : c.dn;
        if (vote < A.o.councilMin) continue;  // only what the council lets through
        const x = add(J, { id: `T|${sym}|${tf}|${e.kind}|${e.t}|${e.dir}`, sys: "TRAD", sym, cls, tf, kind: e.kind, dir: e.dir, sigT: e.t, sigClose: ct,
          seenAt: J.now, late: J.now - ct, vote: r3(vote), vol: !!e.vol, status: "pending" });
        if (x) fresh.push(x);
      }
      J.state.seen[key] = last;
    }
  }
  // score every unfinished entry of this asset against today's run
  const idx = new Map();
  for (const x of A.trades) idx.set(`${x.tf}|${x.kind}|${x.ev.t}|${x.dir}`, x);
  for (const e of J.byId.values()) {
    if (e.sys !== "TRAD" || e.sym !== sym || FINAL.has(e.status)) continue;
    const r = A.res[e.tf];
    if (!r) continue;
    const tr = idx.get(`${e.tf}|${e.kind}|${e.sigT}|${e.dir}`);
    if (tr) {
      Object.assign(e, { entry: sig(tr.entry), sl: sig(tr.sl), tp: tr.tps && tr.tps.length ? sig(tr.tps[tr.tps.length - 1][0]) : null, fillT: tr.t });
      if (tr.open) e.status = "open";
      else Object.assign(e, { status: "closed", R: r3(tr.R), why: tr.why, exitT: tr.exitT, exitPx: sig(tr.exitPx), mfe: r3(tr.mfe) });
    } else {
      const j = lastIdx(r.B.t, e.sigT);
      const still = [].concat(r.elliott, r.wyckoff, r.darvas, r.breakouts, r.range).some((x) => x.t === e.sigT && x.kind === e.kind && x.dir === e.dir);
      if (j < 0 || r.B.t[j] !== e.sigT) continue;           // the signal bar is outside the data we have: leave it
      if (!still) e.status = "gone";                          // the signal vanished on later data (a revised bar): kept as a warning
      else if (j < r.n - 1) { drop(J, e); continue; }         // no trade: another one was open, or costs were too big for the stop
    }
    touch(J, e);
  }
  return fresh;
}

// ---------- MIDOTI ----------
function recordMidoti(J, M, sym, cls, bars, costPct) {
  for (const tf of MIDOTI_TFS) {
    const B0 = bars[tf];
    if (!B0 || B0.t.length < 300) continue;
    const B = { t: B0.t, o: B0.o, h: B0.h, l: B0.l, c: B0.c, v: B0.v, closed: true };
    const r = M.run(B, Object.assign({}, M.DEFAULTS, { tfSec: TF_SEC[tf], mergeWkd: cls !== "crypto", costPct }));
    const key = `MIDOTI|${sym}|${tf}`, n = B.t.length, last = Math.min(B.t[n - 1] + TF_SEC[tf], J.now), from = J.state.seen[key] ?? last - 1;
    for (const ev of r.events) {
      const ct = ev.t + TF_SEC[tf];
      if (!ev.taken || ct <= from || ct > last) continue;
      add(J, { id: `M|${sym}|${tf}|${ev.t}|${ev.dir}`, sys: "MIDOTI", sym, cls, tf, kind: ev.grade === 2 ? "◆" : "◇", dir: ev.dir, sigT: ev.t, sigClose: ct,
        seenAt: J.now, late: J.now - ct, vol: ev.grade === 2, price: sig(ev.price), sl: sig(ev.sl), status: "pending" });
    }
    J.state.seen[key] = Math.max(from, last);
    const done = new Map(r.trades.map((x) => [x.sigT, x]));
    for (const e of J.byId.values()) {
      if (e.sys !== "MIDOTI" || e.sym !== sym || e.tf !== tf || FINAL.has(e.status)) continue;
      const tr = done.get(e.sigT);
      if (tr) Object.assign(e, { status: "closed", entry: sig(tr.entry), sl: sig(tr.sl0), R: r3(tr.R), why: tr.exitWhy, exitT: tr.exitT, exitPx: sig(tr.exitPx), mfe: r3(tr.mfe), fillT: tr.t });
      else if (r.open && r.open.sigT === e.sigT) Object.assign(e, { status: "open", entry: sig(r.open.entry), sl: sig(r.open.sl0), fillT: r.open.t });
      else {
        const j = lastIdx(B.t, e.sigT);
        if (j < 0 || B.t[j] !== e.sigT) continue;
        const still = r.events.some((x) => x.t === e.sigT && x.dir === e.dir && x.taken);
        if (!still) e.status = "gone";
        else if (j < n - 2) { drop(J, e); continue; }
      }
      touch(J, e);
    }
  }
}

function lastIdx(arr, t) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }

// ---------- summary for the pages ----------
function stat(list) {
  const c = list.filter((e) => e.status === "closed"), w = c.filter((e) => e.R > 0).length, s = c.reduce((a, e) => a + e.R, 0);
  return { signals: list.length, closed: c.length, open: list.filter((e) => e.status === "open").length, pending: list.filter((e) => e.status === "pending").length,
    skip: list.filter((e) => e.status === "skip").length, gone: list.filter((e) => e.status === "gone").length,
    win: c.length ? r3(w / c.length) : null, avgR: c.length ? r3(s / c.length) : null, totalR: r3(s) };
}
function curve(list) {
  let s = 0;
  const c = list.filter((e) => e.status === "closed").sort((a, b) => a.exitT - b.exitT).map((e) => [e.exitT, r3((s += e.R))]);
  const k = Math.max(1, Math.ceil(c.length / 300));
  return c.filter((_, i) => i % k === 0 || i === c.length - 1);
}
function finish(J, star) {
  const all = [...J.byId.values()];
  for (const e of all) if (e.sys === "TRAD" && e.seenAt === J.now && star) { e.star = star.has(`${e.sym}|${e.kind}|${e.tf}`); touch(J, e); }
  const live = (e) => e.status !== "closed" || e.seenAt < e.exitT;  // written down before the trade ended
  const out = { generated: J.now, started: J.state.started, sys: {} };
  for (const sys of ["TRAD", "MIDOTI"]) {
    const L = all.filter((e) => e.sys === sys);
    const byTf = {};
    for (const tf of Object.keys(TF_SEC)) { const s = L.filter((e) => e.tf === tf); if (s.length) byTf[tf] = stat(s); }
    out.sys[sys] = { skipped: (J.state.skipped || {})[sys] || 0, all: stat(L), live: stat(L.filter(live)), star: sys === "TRAD" ? stat(L.filter((e) => e.star)) : null, byTf, curve: curve(L), curveStar: sys === "TRAD" ? curve(L.filter((e) => e.star)) : null,
      recent: L.sort((a, b) => b.sigClose - a.sigClose).slice(0, 300) };
  }
  for (const d of J.dirty) fs.writeFileSync(path.join(J.dir, `${d}.json`), JSON.stringify(J.days.get(d)));
  fs.writeFileSync(path.join(J.dir, "state.json"), JSON.stringify(J.state));
  fs.writeFileSync(path.join(J.dir, "summary.json"), JSON.stringify(out));
  return out;
}

module.exports = { open, recordTrad, recordMidoti, finish, TRAD_TFS, MIDOTI_TFS };
