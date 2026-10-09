// Order Flow engine: turns a stream of trades (price, size, aggressor side) plus candles, open interest and
// order-book snapshots into footprint bars and the order-flow tools of the Order Flow page.
// Runs in the browser and in Node (tests). Times are milliseconds. Nothing here talks to the network.
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.OFCORE = f(); })(this, function () {
  "use strict";
  const niceStep = (x) => { if (!(x > 0) || !isFinite(x)) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m < 1.5 ? 1 : m < 2.25 ? 2 : m < 3.5 ? 2.5 : m < 7.5 ? 5 : 10) * p; };
  const pctl = (arr, q) => { if (!arr.length) return NaN; const a = Float64Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * a.length)))]; };
  const DAY = 864e5;
  // leverage mix assumed for the estimated liquidation zones, and the maintenance margin
  const LEV = [[5, 0.1], [10, 0.3], [25, 0.3], [50, 0.2], [100, 0.1]], MM = 0.005;

  function Engine(o) {
    this.tf = o.tf; this.rs = o.rs; this.imbRatio = o.imbRatio || 3; this.userBig = o.userBig || 0;
    this.kb = []; this.bars = []; this.idx = new Map();
    this.T = []; this.P = []; this.Q = []; this.Bu = []; this.ID = [];
    this.from = Infinity; this.lastId = -Infinity; this.backfilled = false;
    this.m1 = []; this.m1idx = new Map();
    this.oi = [];
    this.liqs = []; this.ices = []; this.iceRec = new Map(); this.walls = new Map(); this.pow = []; this.book = null;
    this.resetDerived();
  }
  const E = Engine.prototype;

  E.resetDerived = function () {
    this.secs = new Map(); this.curSec = -1; this.sec = null;
    this.big = []; this.sweeps = []; this.stops = []; this.patts = []; this.steps = []; this.recent = [];
    this.pr = null; this.prevPx = NaN;
    this.ringN = []; this.ringNi = 0; this.nPush = 0; this.thrA = Infinity; this.thrP = Infinity; this.thrW = Infinity;
    this.ringS = []; this.ringSi = 0; this.sPush = 0; this.thrS = Infinity;
    this.ringV = []; this.ringVi = 0; this.vPush = 0; this.thrV = Infinity;
    this.pat = new Map(); this.patLast = new Map(); this.stopLast = { 1: -Infinity, 0: -Infinity };
    this.thrF = this.userBig > 0 ? this.userBig : Infinity;
  };

  // ---------- candles ----------
  E.loadBars = function (rows) { this.kb = rows.slice(); this.rebuild(); };
  E.loadM1 = function (rows) { this.m1 = rows.map((r) => ({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v })); this.m1idx = new Map(this.m1.map((m, i) => [m.t, i])); };
  E.setOI = function (pts) { this.oi = pts.filter((p) => isFinite(p[1])).sort((a, b) => a[0] - b[0]); };
  E.addOI = function (t, v) { if (!isFinite(v)) return; const L = this.oi[this.oi.length - 1]; if (L && t <= L[0]) return; this.oi.push([t, v]); };
  E.oiAt = function (t) {
    const a = this.oi, n = a.length;
    if (!n || t < a[0][0]) return NaN;
    if (t >= a[n - 1][0]) return a[n - 1][1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m][0] <= t) lo = m; else hi = m; }
    const u = (t - a[lo][0]) / (a[hi][0] - a[lo][0] || 1);
    return a[lo][1] + (a[hi][1] - a[lo][1]) * u;
  };
  E.dOI = function (i) {
    const B = this.bars[i], a = this.oi;
    if (!B || !a.length || B.t < a[0][0]) return NaN;
    const e = Math.min(B.t + this.tf, a[a.length - 1][0]);
    if (e <= B.t) return NaN;
    return this.oiAt(e) - this.oiAt(B.t);
  };
  // delta of a bar: exact from trades, exact from the exchange's taker-buy volume, or estimated from the candle shape
  E.delta = function (B) {
    if (B.cov || isFinite(B.bv)) return { d: B.bv - B.sv, est: false };
    const r = B.h - B.l;
    return { d: r > 0 ? B.v * (B.c - B.o) / r : 0, est: true };
  };

  E.newBar = function (t0, p) {
    const B = { t: t0, o: p, h: p, l: p, c: p, v: 0, bv: 0, sv: 0, cov: t0 >= this.from, n: 0, fp: null, cd: 0, dmax: 0, dmin: 0, spd: 0 };
    if (B.cov) B.fp = new Map();
    this.bars.push(B); this.idx.set(t0, this.bars.length - 1);
    return B;
  };

  // ---------- trades ----------
  // live trade from the websocket
  E.addTrade = function (t, p, q, b, id) {
    if (id != null) { if (id <= this.lastId) return false; this.lastId = id; }
    const n = this.T.length;
    if (n && t < this.T[n - 1]) t = this.T[n - 1];
    this.T.push(t); this.P.push(p); this.Q.push(q); this.Bu.push(b ? 1 : 0); this.ID.push(id == null ? -1 : id);
    // keep the 1-minute candles of the session tools current
    const m0 = Math.floor(t / 6e4) * 6e4, L = this.m1[this.m1.length - 1];
    if (!L || m0 > L.t) { this.m1.push({ t: m0, o: p, h: p, l: p, c: p, v: q }); this.m1idx.set(m0, this.m1.length - 1); }
    else if (m0 === L.t) { if (p > L.h) L.h = p; if (p < L.l) L.l = p; L.c = p; L.v += q; }
    this.ingest(n, true);
    if (this.T.length > 450000) this.trim(120000);
    return true;
  };
  E.trim = function (k) {
    for (const a of [this.T, this.P, this.Q, this.Bu, this.ID]) a.splice(0, k);
    this.from = Math.max(this.from, Math.ceil((this.T[0] || 0) / this.tf) * this.tf);
  };
  // history of trades (oldest first) fetched after the page opened; merged under the live ones
  E.setBackfill = function (rows) {
    const maxId = rows.length ? rows[rows.length - 1][4] : -Infinity;
    const keep = [];
    for (let i = 0; i < this.T.length; i++) if (this.ID[i] < 0 || this.ID[i] > maxId) keep.push([this.T[i], this.P[i], this.Q[i], this.Bu[i], this.ID[i]]);
    const all = rows.concat(keep);
    this.T = all.map((r) => r[0]); this.P = all.map((r) => r[1]); this.Q = all.map((r) => r[2]); this.Bu = all.map((r) => (r[3] ? 1 : 0)); this.ID = all.map((r) => r[4]);
    // only bars that start after the first known trade are complete
    const t0 = rows.length ? rows[0][0] : (this.T.length ? this.T[0] : Date.now());
    this.from = Math.ceil(t0 / this.tf) * this.tf;
    if (rows.length) this.lastId = Math.max(this.lastId, maxId);
    this.backfilled = true;
    this.rebuild();
  };
  E.setRows = function (rs) { this.rs = rs; this.rebuild(); };

  E.rebuild = function () {
    this.bars = this.kb.map((r) => {
      const cov = r.t >= this.from;
      return { t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: cov ? 0 : r.v, bv: cov ? 0 : r.bv, sv: cov ? 0 : (isFinite(r.bv) ? r.v - r.bv : NaN), cov, n: 0, fp: cov ? new Map() : null, cd: 0, dmax: 0, dmin: 0, spd: 0 };
    });
    this.idx = new Map(this.bars.map((B, i) => [B.t, i]));
    this.resetDerived();
    // fixed big-trade threshold: 99.95th percentile of all prints we hold
    if (!(this.userBig > 0)) {
      const ns = []; let pt = -1, pb = -1, acc = 0;
      for (let i = 0; i < this.T.length; i++) {
        if (this.T[i] !== pt || this.Bu[i] !== pb) { if (acc) ns.push(acc); acc = 0; pt = this.T[i]; pb = this.Bu[i]; }
        acc += this.P[i] * this.Q[i];
      }
      if (acc) ns.push(acc);
      this.thrF = ns.length >= 1000 ? pctl(ns, 0.9995) : Infinity;
    }
    for (let i = 0; i < this.T.length; i++) this.ingest(i, false);
  };

  E.ingest = function (i, live) {
    const t = this.T[i], p = this.P[i], q = this.Q[i], b = this.Bu[i] === 1;
    const t0 = Math.floor(t / this.tf) * this.tf;
    let k = this.idx.get(t0), B;
    if (k === undefined) {
      const L = this.bars[this.bars.length - 1];
      if (L && t0 < L.t) return;               // older than the candles we hold
      B = this.newBar(t0, p);
    } else B = this.bars[k];
    if (B.cov) {
      if (!B.n) { B.o = B.h = B.l = p; B.v = B.bv = B.sv = 0; B.cd = B.dmax = B.dmin = 0; if (!B.fp) B.fp = new Map(); }
      B.n++;
      const r = Math.floor(p / this.rs + 1e-9);
      let c = B.fp.get(r); if (!c) { c = [0, 0]; B.fp.set(r, c); }
      if (b) c[1] += q; else c[0] += q;
      B.cd += b ? q : -q; if (B.cd > B.dmax) B.dmax = B.cd; if (B.cd < B.dmin) B.dmin = B.cd;
    }
    if (p > B.h) B.h = p; if (p < B.l) B.l = p; B.c = p; B.v += q;
    if (b) B.bv += q; else B.sv += q;
    // per-second tape
    const s = Math.floor(t / 1000);
    if (s !== this.curSec) { if (this.sec) this.endSec(this.sec); this.curSec = s; this.sec = { s, nb: 0, ns: 0, vb: 0, vs: 0, hi: p, lo: p }; this.secs.set(s, this.sec); }
    const S = this.sec;
    if (b) { S.nb++; S.vb += q; } else { S.ns++; S.vs += q; }
    if (p > S.hi) S.hi = p; if (p < S.lo) S.lo = p;
    // prints: trades of one aggressive order share the timestamp and side
    let pr = this.pr;
    if (!pr || pr.t !== t || pr.b !== b) { if (pr) this.endPrint(pr); pr = this.pr = { t, b, q: 0, n: 0, p0: p, p1: p, lv: 0, lp: NaN }; }
    pr.q += q; pr.n += p * q; pr.p1 = p; if (p !== pr.lp) { pr.lv++; pr.lp = p; }
    if (live) this.iceTrade(t, p, q, b);
  };

  const ring = (self, key, ik, pk, v, cap, every, onRe) => {
    const R = self[key];
    if (R.length < cap) R.push(v); else { R[self[ik]] = v; self[ik] = (self[ik] + 1) % cap; }
    self[pk]++;
    if (self[pk] % every === 0 || self[pk] === 300 || self[pk] === 1000) onRe(R);
  };

  E.endPrint = function (pr) {
    const n = pr.n, p = pr.n / pr.q;
    ring(this, "ringN", "ringNi", "nPush", n, 8000, 400, (R) => { if (R.length >= 1000) { this.thrA = pctl(R, 0.998); this.thrP = pctl(R, 0.7); this.thrW = pctl(R, 0.97); } });
    const rec = { t: pr.t, b: pr.b, p, q: pr.q, n, p0: pr.p0, p1: pr.p1, lv: pr.lv };
    this.recent.push(rec); if (this.recent.length > 9000) this.recent.splice(0, 2000);
    if (n >= this.thrF || n >= this.thrA) { rec.f = n >= this.thrF; rec.a = n >= this.thrA; this.big.push(rec); if (this.big.length > 5000) this.big.splice(0, 1000); }
    // sweep: one aggressive order took out three price levels or more
    if (pr.lv >= 3 && n >= this.thrW) { this.sweeps.push(rec); if (this.sweeps.length > 3000) this.sweeps.splice(0, 500); }
    // spread volume: size that went through at the moment price stepped to a new level
    if (isFinite(this.prevPx) && pr.p1 !== this.prevPx) {
      ring(this, "ringS", "ringSi", "sPush", pr.q, 3000, 250, (R) => { if (R.length >= 300) this.thrS = pctl(R, 0.99); });
      if (pr.q >= this.thrS) { this.steps.push({ t: pr.t, b: pr.b, p: pr.p1, q: pr.q, dir: pr.p1 > this.prevPx ? 1 : -1 }); if (this.steps.length > 3000) this.steps.splice(0, 500); }
    }
    this.prevPx = pr.p1;
    // tape pattern: the same size repeated by the same side, eight times in 30 seconds (a slicing algorithm)
    if (n >= this.thrP && isFinite(this.thrP)) {
      const key = (pr.b ? "B" : "S") + (+pr.q.toPrecision(6));
      let L = this.pat.get(key); if (!L) { L = []; this.pat.set(key, L); }
      L.push(pr.t); while (L.length && L[0] < pr.t - 30000) L.shift();
      if (L.length >= 8 && (this.patLast.get(key) || -Infinity) < pr.t - 60000) {
        this.patLast.set(key, pr.t);
        this.patts.push({ t: pr.t, b: pr.b, q: pr.q, c: L.length, p });
        if (this.patts.length > 2000) this.patts.splice(0, 500);
      }
      if (this.pat.size > 5000) this.pat.clear();
    }
  };

  // a second of tape is finished: speed of tape, and stop runs
  E.endSec = function (S) {
    const v = S.vb + S.vs, i = this.idx.get(Math.floor(S.s * 1000 / this.tf) * this.tf);
    if (i !== undefined) { const B = this.bars[i]; if (S.nb + S.ns > B.spd) B.spd = S.nb + S.ns; }
    ring(this, "ringV", "ringVi", "vPush", v, 3600, 120, (R) => { if (R.length >= 300) this.thrV = pctl(R, 0.995); });
    if (v >= this.thrV && i !== undefined && i >= 20) {
      const buy = S.vb >= 0.75 * v, sell = S.vs >= 0.75 * v;
      if (buy || sell) {
        let hi = -Infinity, lo = Infinity;
        for (let j = i - 20; j < i; j++) { const B = this.bars[j]; if (B.h > hi) hi = B.h; if (B.l < lo) lo = B.l; }
        const side = buy ? 1 : 0, t = S.s * 1000;
        if (((buy && S.hi > hi) || (sell && S.lo < lo)) && t - this.stopLast[side] > 120000) {
          this.stopLast[side] = t;
          this.stops.push({ t, b: buy, p: buy ? S.hi : S.lo, lvl: buy ? hi : lo, q: v });
        }
      }
    }
    if (this.secs.size > 30000) { const cut = S.s - 6 * 3600; for (const k of this.secs.keys()) { if (k < cut) this.secs.delete(k); else break; } }
  };

  // ---------- order book ----------
  E.setBook = function (bids, asks, t) {
    const bm = new Map(bids), am = new Map(asks);
    this.book = { b: bids, a: asks, bm, am, t };
    // walls from the top 20 levels, unless a deeper snapshot came in recently
    if (!(t - (this.deepT || -Infinity) < 30000)) this.wallScan(bids, asks, t, 3000);
    // DOM power: resting bids against resting asks
    const sb = bids.reduce((a, x) => a + x[1] * x[0], 0), sa = asks.reduce((a, x) => a + x[1] * x[0], 0);
    const L = this.pow[this.pow.length - 1], pw = sb + sa > 0 ? (sb - sa) / (sb + sa) : 0;
    if (!L || t - L[0] >= 1000) { this.pow.push([t, pw, sb, sa]); if (this.pow.length > 3600) this.pow.splice(0, 600); }
    else { L[1] = pw; L[2] = sb; L[3] = sa; }
    this.iceBook(t);
  };
  // walls: resting orders four times the typical level size; ttl = how long one may go unseen before it is dropped
  E.wallScan = function (bids, asks, t, ttl) {
    const qs = bids.map((x) => x[1]).concat(asks.map((x) => x[1]));
    const med = pctl(qs, 0.5);
    for (const [arr, side] of [[bids, 1], [asks, 0]]) for (const [p, q] of arr) {
      if (!(q >= 4 * med)) continue;
      const k = side + ":" + p, w = this.walls.get(k);
      if (w) { w.q = q; w.last = t; if (q > w.max) w.max = q; } else this.walls.set(k, { p, b: side === 1, q, max: q, since: t, last: t });
    }
    for (const [k, w] of this.walls) if (t - w.last > ttl) this.walls.delete(k);
  };
  // deep book snapshot (hundreds of levels, every few seconds): walls further from the price, and pressure within 1%
  E.setDeep = function (bids, asks, t) {
    this.deepT = t;
    this.wallScan(bids, asks, t, 25000);
    const mid = bids.length && asks.length ? (bids[0][0] + asks[0][0]) / 2 : NaN;
    let sb = 0, sa = 0;
    for (const [p, q] of bids) if (p >= mid * 0.99) sb += p * q;
    for (const [p, q] of asks) if (p <= mid * 1.01) sa += p * q;
    this.deep = { t, sb, sa, pw: sb + sa > 0 ? (sb - sa) / (sb + sa) : 0 };
  };
  // iceberg: more size traded at a price than was ever shown there, and the level is still standing
  E.iceTrade = function (t, p, q, b) {
    if (!this.book) return;
    const side = b ? 0 : 1, k = side + ":" + p, disp = (side ? this.book.bm : this.book.am).get(p) || 0;
    let r = this.iceRec.get(k);
    if (!r || t - r.last > 30000) { r = { p, b: side === 1, exec: 0, hits: 0, shown: disp, t0: t, last: t, ev: null }; this.iceRec.set(k, r); }
    r.exec += q; r.last = t; if (t !== r.lt) { r.hits++; r.lt = t; } if (disp > r.shown) r.shown = disp;
  };
  E.iceBook = function (t) {
    for (const [k, r] of this.iceRec) {
      if (t - r.last > 60000) { this.iceRec.delete(k); continue; }
      const now = (r.b ? this.book.bm : this.book.am).get(r.p) || 0;
      if (now > r.shown) r.shown = now;
      if (now > 0 && r.shown > 0 && r.hits >= 3 && r.exec >= 2 * r.shown && r.exec * r.p >= Math.min(this.thrA, 1e12) * 0.5) {
        if (!r.ev) { r.ev = { t, p: r.p, b: r.b, exec: r.exec, shown: r.shown }; this.ices.push(r.ev); if (this.ices.length > 500) this.ices.splice(0, 100); }
        else { r.ev.exec = r.exec; r.ev.shown = r.shown; r.ev.tl = t; }
      }
    }
  };
  E.addLiq = function (t, p, q, longLiq) { this.liqs.push({ t, p, q, n: p * q, long: longLiq }); if (this.liqs.length > 3000) this.liqs.splice(0, 500); };

  // ---------- tools computed over the bars ----------
  E.imbalances = function (B) {   // diagonal: buyers at a price against sellers one row lower, and the reverse
    const out = { buy: new Set(), sell: new Set() };
    if (!B.fp) return out;
    const R = this.imbRatio, vs = [];
    for (const c of B.fp.values()) vs.push(c[0] + c[1]);
    const minC = pctl(vs, 0.5);   // a side facing an empty row needs at least a typical cell's size
    for (const [k, c] of B.fp) {
      const below = B.fp.get(k - 1), above = B.fp.get(k + 1), ob = below ? below[0] : 0, oa = above ? above[1] : 0;
      if (c[1] > 0 && c[1] >= R * ob && (ob > 0 || c[1] >= minC)) out.buy.add(k);
      if (c[0] > 0 && c[0] >= R * oa && (oa > 0 || c[0] >= minC)) out.sell.add(k);
    }
    return out;
  };
  E.stacked = function (minRun) {
    minRun = minRun || 3;
    const zones = [], bars = this.bars;
    for (let i = 0; i < bars.length; i++) {
      const B = bars[i];
      if (!B.fp || !B.cov || B.n < 5) continue;
      const im = this.imbalances(B);
      for (const [set, dir] of [[im.buy, 1], [im.sell, -1]]) {
        const ks = [...set].sort((a, b) => a - b);
        let s = 0;
        for (let j = 1; j <= ks.length; j++) {
          if (j < ks.length && ks[j] === ks[j - 1] + 1) continue;
          if (j - s >= minRun) zones.push({ i, t: B.t, dir, lo: ks[s] * this.rs, hi: (ks[j - 1] + 1) * this.rs, rows: j - s, end: null });
          s = j;
        }
      }
    }
    for (const z of zones) for (let j = z.i + 1; j < bars.length; j++) {
      const B = bars[j];
      if ((z.dir === 1 && B.c < z.lo) || (z.dir === -1 && B.c > z.hi)) { z.end = j; break; }
    }
    return zones;
  };
  E.fvg = function () {
    const bars = this.bars, out = [], n = bars.length;
    let rng = 0, m = 0;
    for (let i = Math.max(0, n - 200); i < n; i++) { rng += bars[i].h - bars[i].l; m++; }
    const minG = 0.1 * (m ? rng / m : 0);
    for (let i = 2; i < n; i++) {
      const a = bars[i - 2], c = bars[i];
      if (c.l > a.h && c.l - a.h >= minG) out.push({ i: i - 1, dir: 1, lo: a.h, hi: c.l, top: c.l, end: null });
      else if (c.h < a.l && a.l - c.h >= minG) out.push({ i: i - 1, dir: -1, lo: c.h, hi: a.l, bot: c.h, end: null });
    }
    for (const g of out) for (let j = g.i + 2; j < n; j++) {
      const B = bars[j];
      if (g.dir === 1) { if (B.l <= g.lo) { g.end = j; break; } if (B.l < g.hi) g.hi = B.l; }
      else { if (B.h >= g.hi) { g.end = j; break; } if (B.h > g.lo) g.lo = B.h; }
    }
    return out;
  };
  E.clusters = function (mode, q) {   // cells that stand out: by volume or by delta
    const vals = [], cells = [];
    const lo = Math.max(0, this.bars.length - 400);
    for (let i = lo; i < this.bars.length; i++) {
      const B = this.bars[i]; if (!B.fp || !B.cov) continue;
      for (const [k, c] of B.fp) { const v = mode === "delta" ? Math.abs(c[1] - c[0]) : c[0] + c[1]; vals.push(v); cells.push([i, k, v, c[1] - c[0]]); }
    }
    if (vals.length < 30) return [];
    const thr = pctl(vals, q || 0.985);
    return cells.filter((c) => c[2] >= thr && c[2] > 0).map((c) => ({ i: c[0], p: (c[1] + 0.5) * this.rs, v: c[2], d: c[3] }));
  };
  E.barPOC = function (B) { let bk = null, bv = -1; if (B.fp) for (const [k, c] of B.fp) { const v = c[0] + c[1]; if (v > bv) { bv = v; bk = k; } } return bk; };

  // open-interest regime of a bar
  E.regime = function (i) {
    const d = this.dOI(i), B = this.bars[i];
    if (!isFinite(d) || d === 0) return null;
    const up = B.c >= B.o;
    return d > 0 ? (up ? "LN" : "SN") : (up ? "SC" : "LC");
  };

  // estimated liquidation zones: new open interest is placed at the bar's price, split between longs and shorts by
  // who was aggressive, spread over a typical leverage mix, and removed when price trades through it
  E.liqZones = function () {
    const bars = this.bars, n = bars.length, out = { long: new Map(), short: new Map(), zr: NaN, swept: [] };
    if (!this.oi.length || !n) return out;
    const zr = out.zr = niceStep(bars[n - 1].c * 0.0012);
    const L = out.long, Sh = out.short;
    for (let i = 0; i < n; i++) {
      const B = bars[i];
      for (const [k, v] of L) if ((k + 1) * zr >= B.l && i > 0) { L.delete(k); if (i >= n - 30) out.swept.push({ i, long: true, p: (k + 0.5) * zr, q: v }); }
      for (const [k, v] of Sh) if (k * zr <= B.h && i > 0) { Sh.delete(k); if (i >= n - 30) out.swept.push({ i, long: false, p: (k + 0.5) * zr, q: v }); }
      const d = this.dOI(i);
      if (!isFinite(d) || d === 0) continue;
      const dd = this.delta(B).d, f = Math.min(0.9, Math.max(0.1, 0.5 + 0.5 * (B.v > 0 ? dd / B.v : 0)));
      const px = (B.h + B.l + B.c) / 3;
      if (d > 0) {
        for (const [lev, w] of LEV) {
          const kl = Math.floor(px * (1 - 1 / lev + MM) / zr), ks = Math.floor(px * (1 + 1 / lev - MM) / zr);
          L.set(kl, (L.get(kl) || 0) + d * w * f);
          Sh.set(ks, (Sh.get(ks) || 0) + d * w * (1 - f));
        }
      } else {
        const tl = [...L.values()].reduce((a, x) => a + x, 0), ts = [...Sh.values()].reduce((a, x) => a + x, 0);
        const cl = -d * (1 - f), cs = -d * f;   // buyers while OI falls: shorts covering
        if (tl > 0) { const r = Math.max(0, 1 - cl / tl); for (const [k, v] of L) L.set(k, v * r); }
        if (ts > 0) { const r = Math.max(0, 1 - cs / ts); for (const [k, v] of Sh) Sh.set(k, v * r); }
      }
    }
    return out;
  };

  // ---------- session tools (UTC day) from 1-minute candles ----------
  E.session = function (pr) {
    const m = this.m1, n = m.length;
    const vw = new Float64Array(n).fill(NaN), sd = new Float64Array(n).fill(NaN);
    const va = new Map();
    let day = -1, prof = null, sv = 0, svp = 0, svpp = 0, pk = null, pv = -1, kmin = Infinity, kmax = -Infinity;
    const lastProf = { prof: null };
    for (let i = 0; i < n; i++) {
      const b = m[i], d = Math.floor(b.t / DAY);
      if (d !== day) { day = d; prof = new Map(); sv = svp = svpp = 0; pk = null; pv = -1; kmin = Infinity; kmax = -Infinity; }
      const tp = (b.h + b.l + b.c) / 3, v = b.v;
      if (v > 0) { sv += v; svp += v * tp; svpp += v * tp * tp; }
      if (sv > 0) { vw[i] = svp / sv; sd[i] = Math.sqrt(Math.max(0, svpp / sv - vw[i] * vw[i])); }
      const k0 = Math.floor(b.l / pr), k1 = Math.floor(b.h / pr), per = v / (k1 - k0 + 1);
      if (v > 0) for (let k = k0; k <= k1; k++) {
        const x = (prof.get(k) || 0) + per; prof.set(k, x);
        if (x > pv) { pv = x; pk = k; }
        if (k < kmin) kmin = k; if (k > kmax) kmax = k;
      }
      const end = b.t + 6e4;
      if (pk !== null && (end % this.tf === 0 || i === n - 1)) va.set(i, valueArea(prof, pk, kmin, kmax, pr));
      if (i === n - 1) lastProf.prof = prof;
    }
    return { vw, sd, va, prof: lastProf.prof, pr };
  };
  function valueArea(prof, pk, kmin, kmax, pr) {
    let tot = 0; for (const v of prof.values()) tot += v;
    let lo = pk, hi = pk, acc = prof.get(pk) || 0;
    const g = (k) => prof.get(k) || 0;
    while (acc < 0.7 * tot && (lo > kmin || hi < kmax)) {
      const up = hi < kmax ? g(hi + 1) : -1, dn = lo > kmin ? g(lo - 1) : -1;
      if (up >= dn) { hi++; acc += up; } else { lo--; acc += dn; }
    }
    return { poc: (pk + 0.5) * pr, vah: (hi + 1) * pr, val: lo * pr };
  }
  E.m1At = function (te) { return this.m1idx.get(te - 6e4); };

  // Market profile (TPO) of one UTC day: 30-minute periods lettered A, B, C...
  const LET = "ABCDEFGHIJKLMNOPQRSTUVWXabcdefghijklmnopqrstuvwx";
  E.tpo = function (dayStart) {
    const rows = this.m1.filter((b) => b.t >= dayStart && b.t < dayStart + DAY);
    if (rows.length < 5) return null;
    let H = -Infinity, Lo = Infinity;
    for (const b of rows) { if (b.h > H) H = b.h; if (b.l < Lo) Lo = b.l; }
    const tr = niceStep((H - Lo) / 45 || H * 0.0005);
    const map = new Map();
    for (const b of rows) {
      const per = Math.floor((b.t - dayStart) / 18e5), ch = LET[per];
      for (let k = Math.floor(b.l / tr); k <= Math.floor(b.h / tr); k++) {
        let s = map.get(k); if (!s) { s = new Set(); map.set(k, s); }
        s.add(per);
      }
    }
    const ks = [...map.keys()].sort((a, b) => b - a);
    const out = ks.map((k) => { const s = [...map.get(k)].sort((a, b) => a - b); return { k, p: k * tr, per: s, txt: s.map((x) => LET[x]).join(""), n: s.length }; });
    let pk = null, pv = -1;
    const mid = (H + Lo) / 2;
    for (const r of out) if (r.n > pv || (r.n === pv && Math.abs(r.p - mid) < Math.abs(pk.p - mid))) { pv = r.n; pk = r; }
    const prof = new Map(out.map((r) => [r.k, r.n]));
    const va = valueArea(prof, pk.k, ks[ks.length - 1], ks[0], tr);
    const ib = rows.filter((b) => b.t < dayStart + 36e5);
    return { rows: out, tr, poc: va.poc, vah: va.vah, val: va.val, ibH: Math.max(...ib.map((b) => b.h)), ibL: Math.min(...ib.map((b) => b.l)), open: rows[0].o, close: rows[rows.length - 1].c, hi: H, lo: Lo, periods: Math.floor((rows[rows.length - 1].t - dayStart) / 18e5) + 1, singles: out.filter((r) => r.n === 1).length };
  };

  return { Engine, niceStep, pctl, LEV, MM, DAY };
});
