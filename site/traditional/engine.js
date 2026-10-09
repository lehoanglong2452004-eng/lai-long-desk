// Traditional desk engine: pure price + volume, every timeframe from W1 down to M1.
//   Council   : each timeframe votes up/down from its swing structure; W1 and D1 weigh most.
//   Strategy 1: Elliott counts with three scenarios, Wyckoff spring/upthrust, Darvas boxes.
//   Strategy 2: breakouts of swing levels, then retests 1-4 (with and without volume), and failed breakouts.
//   Strategy 3: range trading, TP1 at the middle and TP2 at the opposite edge, split by the trend before the range.
// Every value at bar i uses bars 0..i only; entries fill at the next bar's open. Shared by the page and the server (Node).
(function (root) {
  "use strict";

  const TFS = ["1W", "1D", "4H", "1H", "15m", "5m", "1m"];
  const TF_SEC = { "1W": 604800, "1D": 86400, "4H": 14400, "1H": 3600, "15m": 900, "5m": 300, "1m": 60 };
  const WEIGHT = { "1W": 25, "1D": 25, "4H": 10, "1H": 10, "15m": 10, "5m": 10, "1m": 10 };
  // round-trip cost (% of price) by asset class: exchange fees + spread + a little slippage on liquid markets
  const COST = { crypto: 0.1, forex: 0.01, commodity: 0.03, index: 0.01, stock: 0.02 };
  const WINDOWS = [["12m", 365], ["6m", 182], ["3m", 91], ["1m", 30], ["1w", 7], ["1d", 1]];
  const DEFAULTS = {
    zz: 2.0,          // swing = a reversal of 2 x ATR(14)
    volMin: 1.5,      // volume confirmation: RVOL by time of day
    rr: 2,            // breakout and retest trades: win = 2R before the stop
    maxTests: 4,
    rangeLen: 30,     // bars a range must hold
    councilMin: 60,   // % of the council needed to trade in a direction
    costPct: 0.1,     // round-trip cost in % of price
    maxHold: 120,
    maxCostR: 0.25,   // skip trades whose round-trip cost exceeds 25% of the risk
  };

  // ---------- helpers ----------
  function atr(B, n) {
    const out = new Float64Array(B.c.length);
    let a = NaN, s = 0;
    for (let i = 0; i < B.c.length; i++) {
      const tr = i ? Math.max(B.h[i] - B.l[i], Math.abs(B.h[i] - B.c[i - 1]), Math.abs(B.l[i] - B.c[i - 1])) : B.h[i] - B.l[i];
      if (i < n) { s += tr; a = s / (i + 1); } else a = (a * (n - 1) + tr) / n;
      out[i] = a;
    }
    return out;
  }
  // relative volume against the same time of day (intraday) or the last 20 bars (D1/W1)
  function rvol(B, tfSec) {
    const n = B.c.length, out = new Float64Array(n), map = new Map();
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += B.v[i]; if (i >= 20) s -= B.v[i - 20];
      let ref = s / Math.min(i + 1, 20);
      if (tfSec < 86400) {
        const k = Math.floor((B.t[i] % 86400) / tfSec), buf = map.get(k);
        if (buf && buf.length >= 5) ref = buf.reduce((x, y) => x + y, 0) / buf.length;
        if (!buf) map.set(k, [B.v[i]]); else { buf.push(B.v[i]); if (buf.length > 20) buf.shift(); }
      }
      out[i] = ref > 0 ? B.v[i] / ref : 0;
    }
    return out;
  }
  // ATR zigzag. A pivot is known only at its confirmation bar `c`, so nothing looks ahead.
  function zigzag(B, A, k) {
    const piv = [], n = B.c.length;
    let dir = 0, hiI = 0, hiP = B.h[0], loI = 0, loP = B.l[0];
    for (let i = 1; i < n; i++) {
      const th = k * A[i];
      if (dir >= 0 && B.h[i] >= hiP) { hiP = B.h[i]; hiI = i; }
      if (dir <= 0 && B.l[i] <= loP) { loP = B.l[i]; loI = i; }
      if (dir === 0) {
        if (hiP - B.l[i] > th && hiI < i) { dir = -1; loP = B.l[i]; loI = i; }
        else if (B.h[i] - loP > th && loI < i) { dir = 1; hiP = B.h[i]; hiI = i; }
      } else if (dir === 1 && B.l[i] < hiP - th) {
        piv.push({ i: hiI, c: i, p: hiP, hi: true }); dir = -1; loP = B.l[i]; loI = i;
      } else if (dir === -1 && B.h[i] > loP + th) {
        piv.push({ i: loI, c: i, p: loP, hi: false }); dir = 1; hiP = B.h[i]; hiI = i;
      }
    }
    return piv;
  }
  // swing structure per bar: +1 higher highs and higher lows (or close above the last swing high), -1 the mirror
  function trendSeries(B, piv) {
    const n = B.c.length, out = new Int8Array(n);
    let k = 0;
    const hs = [], ls = [];
    for (let i = 0; i < n; i++) {
      while (k < piv.length && piv[k].c <= i) { (piv[k].hi ? hs : ls).push(piv[k].p); k++; }
      let t = 0;
      if (hs.length >= 2 && ls.length >= 2) {
        const [h1, h2] = hs.slice(-2), [l1, l2] = ls.slice(-2);
        t = h2 > h1 && l2 > l1 ? 1 : h2 < h1 && l2 < l1 ? -1 : 0;
      }
      if (hs.length && B.c[i] > hs[hs.length - 1]) t = 1;
      if (ls.length && B.c[i] < ls[ls.length - 1]) t = -1;
      out[i] = t;
    }
    return out;
  }
  const lastIdx = (arr, t) => { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; };

  // stops closer than half an ATR are widened: a tighter stop is noise, and costs would eat it
  const widen = (sl, e, dir, a) => (dir === 1 ? Math.min(sl, e - 0.5 * a) : Math.max(sl, e + 0.5 * a));

  // ---------- trade simulation ----------
  // tps: [[price, fraction], ...]; after the first target the stop moves to break-even.
  // trail(i, pos) may return a tighter stop each bar. Exit on stop, last target, or maxHold at the close.
  function simulate(B, i0, dir, sl, tps, o, trail) {
    const n = B.c.length;
    if (i0 >= n) return null;
    const entry = B.o[i0], r = Math.abs(entry - sl);
    if (!(r > 0) || (dir === 1 ? sl >= entry : sl <= entry)) return null;
    if (entry * o.costPct / 100 > o.maxCostR * r) return null;  // the stop is so close that costs would eat over a quarter of the risk: not tradable
    let stop = sl, left = 1, got = 0, k = 0, mfe = 0, mae = 0, exitI = -1, exitPx = NaN, why = "";
    for (let i = i0; i < n && i - i0 <= o.maxHold; i++) {
      mfe = Math.max(mfe, dir === 1 ? (B.h[i] - entry) / r : (entry - B.l[i]) / r);
      mae = Math.max(mae, dir === 1 ? (entry - B.l[i]) / r : (B.h[i] - entry) / r);
      if (dir === 1 ? B.l[i] <= stop : B.h[i] >= stop) {
        const px = dir === 1 ? Math.min(B.o[i], stop) : Math.max(B.o[i], stop);
        got += left * dir * (px - entry) / r; left = 0; exitI = i; exitPx = px; why = k ? "be" : "sl"; break;
      }
      while (k < tps.length && (dir === 1 ? B.h[i] >= tps[k][0] : B.l[i] <= tps[k][0])) {
        const f = Math.min(left, tps[k][1]);
        got += f * dir * (tps[k][0] - entry) / r; left -= f; k++;
        if (k === 1) stop = entry;
        if (left <= 1e-9) { exitI = i; exitPx = tps[k - 1][0]; why = "tp"; break; }
      }
      if (exitI >= 0) break;
      if (trail) { const s = trail(i); if (isFinite(s)) stop = dir === 1 ? Math.max(stop, s) : Math.min(stop, s); }
      if (trail && (dir === 1 ? B.c[i] < stop : B.c[i] > stop) && i > i0) {
        got += left * dir * (B.c[i] - entry) / r; left = 0; exitI = i; exitPx = B.c[i]; why = "trail"; break;
      }
    }
    if (exitI < 0) {
      const i = Math.min(n - 1, i0 + o.maxHold);
      if (i === n - 1 && i - i0 < o.maxHold) return { open: true, i: i0, t: B.t[i0], entry, sl, r, dir, mfe, mae, tps };
      got += left * dir * (B.c[i] - entry) / r; exitI = i; exitPx = B.c[i]; why = "time";
    }
    const cost = entry * o.costPct / 100 / r;
    return { i: i0, t: B.t[i0], entry, sl, r, dir, tps, exitI, exitT: B.t[exitI], exitPx, why, R: got - cost, gross: got, mfe, mae, bars: exitI - i0 + 1 };
  }

  // ---------- strategy 1a: Elliott ----------
  const FIB = (x, a, b) => x >= a && x <= b;
  function elliott(B, A, piv, o) {
    const out = [];
    let busyTo = -1;
    for (let k = 2; k < piv.length; k++) {
      const c = piv[k].c;
      const P = piv.slice(Math.max(0, k - 5), k + 1);
      const m = matchWave(P, A[c]);
      if (!m) continue;
      // outcome: which comes first, the S1 target (theory), the invalidation (S3), or neither in time (S2: sideways)
      const H = Math.min(o.maxHold, Math.max(20, 3 * (piv[k].i - P[0].i)));
      let sc = 2, endI = Math.min(B.c.length - 1, c + H);
      for (let i = c + 1; i <= Math.min(B.c.length - 1, c + H); i++) {
        if (m.dir === 1 ? B.h[i] >= m.target : B.l[i] <= m.target) { sc = 1; endI = i; break; }
        if (m.dir === 1 ? B.c[i] < m.invalid : B.c[i] > m.invalid) { sc = 3; endI = i; break; }
      }
      const done = c + H < B.c.length || sc !== 2;
      const ev = Object.assign(m, { i: c, t: B.t[c], piv: P.map((p) => [p.i, p.p]), scenario: done ? sc : 0, endI, rv: 0 });
      if (c + 1 < B.c.length && c > busyTo) {
        const tr = simulate(B, c + 1, m.dir, m.invalid - m.dir * 0.1 * A[c], [[m.target, 1]], o);
        if (tr) { ev.trade = tr; busyTo = tr.open ? Infinity : tr.exitI; }
      }
      out.push(ev);
    }
    return out;
  }
  // P: last pivots (oldest first). Returns the most complete Elliott reading that obeys the hard rules.
  function matchWave(P, a) {
    const n = P.length;
    const L = (x, y) => Math.abs(y.p - x.p);
    const res = [];
    // after wave 5: expect an A-B-C against the impulse
    if (n >= 6) {
      const [p0, p1, p2, p3, p4, p5] = P.slice(-6), d = p1.p > p0.p ? 1 : -1;
      const w1 = d * (p1.p - p0.p), w3 = d * (p3.p - p2.p), w5 = d * (p5.p - p4.p);
      if (w1 > 0 && d * (p2.p - p0.p) > 0 && d * (p3.p - p1.p) > 0 && d * (p4.p - p1.p) > 0 && d * (p5.p - p3.p) > 0 && !(w3 < w1 && w3 < w5)) {
        const fit = [FIB(L(p1, p2) / w1, 0.382, 0.786), FIB(w3 / w1, 1.382, 2.8), FIB(L(p3, p4) / w3, 0.236, 0.5), FIB(w5 / w1, 0.5, 1.7)].filter(Boolean).length;
        res.push({ kind: "W5", dir: -d, target: p5.p - d * 0.382 * Math.abs(p5.p - p0.p), invalid: p5.p, fit, base: p5.p, w1 });
      }
    }
    // after wave 4: expect wave 5 (often equal to wave 1); wave 4 must not enter wave 1
    if (n >= 5 && !res.length) {
      const [p0, p1, p2, p3, p4] = P.slice(-5), d = p1.p > p0.p ? 1 : -1;
      const w1 = d * (p1.p - p0.p), w3 = d * (p3.p - p2.p);
      if (w1 > 0 && d * (p2.p - p0.p) > 0 && d * (p3.p - p1.p) > 0 && d * (p4.p - p1.p) > 0 && w3 > 0 && d * (p3.p - p4.p) > 0) {
        const fit = [FIB(L(p1, p2) / w1, 0.382, 0.786), FIB(w3 / w1, 1.382, 2.8), FIB(L(p3, p4) / w3, 0.236, 0.5)].filter(Boolean).length;
        res.push({ kind: "W4", dir: d, target: p4.p + d * w1, invalid: p1.p, fit, base: p4.p, w1 });
      }
    }
    // after wave 2: expect wave 3 (1.618 x wave 1); wave 2 must not go beyond the start of wave 1
    if (n >= 3 && !res.length) {
      const [p0, p1, p2] = P.slice(-3), d = p1.p > p0.p ? 1 : -1, w1 = d * (p1.p - p0.p), rt = L(p1, p2) / w1;
      if (w1 > 3 * a && d * (p2.p - p0.p) > 0 && FIB(rt, 0.382, 0.886)) {
        const fit = [FIB(rt, 0.5, 0.618), w1 > 4 * a].filter(Boolean).length + 1;
        res.push({ kind: "W2", dir: d, target: p2.p + d * 1.618 * w1, invalid: p0.p, fit, base: p2.p, w1 });
      }
    }
    // after an A-B-C correction: expect the old trend to resume (C about equal to A, B 38-88% of A)
    if (n >= 4 && !res.length) {
      const [x, pa, pb, pc] = P.slice(-4), d = x.p > pa.p ? 1 : -1;  // d = direction of the trend being corrected
      const A = L(x, pa), Bw = L(pa, pb), Cw = L(pb, pc);
      if (A > 2 * a && FIB(Bw / A, 0.382, 0.886) && FIB(Cw / A, 0.618, 1.618) && d * (pa.p - pc.p) > 0) {
        const fit = [FIB(Cw / A, 0.9, 1.1), FIB(Bw / A, 0.5, 0.618)].filter(Boolean).length + 1;
        res.push({ kind: "ABC", dir: d, target: x.p, invalid: pc.p, fit, base: pc.p, w1: A });
      }
    }
    return res[0] || null;
  }

  // ---------- ranges (shared by Wyckoff and strategy 3) ----------
  function ranges(B, A, o) {
    const n = B.c.length, L = o.rangeLen, out = [];
    let cur = null;
    for (let i = L; i < n; i++) {
      if (cur) {
        const brk = B.c[i] > cur.top + 0.1 * A[i] ? 1 : B.c[i] < cur.bot - 0.1 * A[i] ? -1 : 0;
        if (brk || i - cur.start > 4 * L) { cur.end = i; cur.exit = brk; out.push(cur); cur = null; }
        continue;
      }
      let top = -Infinity, bot = Infinity;
      for (let k = i - L + 1; k <= i; k++) { top = Math.max(top, B.h[k]); bot = Math.min(bot, B.l[k]); }
      const h = top - bot;
      if (!(h <= 6 * A[i] && h >= 2 * A[i])) continue;
      let up = 0, dn = 0, lastU = -9, lastD = -9;
      for (let k = i - L + 1; k <= i; k++) {
        if (B.h[k] >= top - 0.2 * h && k - lastU > 3) { up++; lastU = k; }
        if (B.l[k] <= bot + 0.2 * h && k - lastD > 3) { dn++; lastD = k; }
      }
      if (up < 2 || dn < 2) continue;
      const j = i - L, ref = Math.max(0, j - L);
      const ch = B.c[j] - B.c[ref];
      const prior = ch > 2 * A[j] ? 1 : ch < -2 * A[j] ? -1 : 0;
      cur = { start: i - L + 1, found: i, top, bot, mid: (top + bot) / 2, prior, t: B.t[i] };
    }
    if (cur) { cur.end = n - 1; cur.exit = 0; cur.open = true; out.push(cur); }
    return out;
  }

  // ---------- strategy 1b: Wyckoff spring / upthrust inside a range ----------
  function wyckoff(B, A, RV, R, o) {
    const out = [];
    for (const g of R) {
      let busy = -1;
      // an open range also scans its last bar, so a signal on the newest closed bar shows (it fills at the next open)
      for (let i = g.found + 1; i <= (g.open ? B.c.length - 1 : Math.min(g.end, B.c.length - 2)); i++) {
        if (i <= busy) continue;
        const spring = B.l[i] < g.bot - 0.1 * A[i] && B.c[i] > g.bot;
        const ut = B.h[i] > g.top + 0.1 * A[i] && B.c[i] < g.top;
        if (!spring && !ut) continue;
        const dir = spring ? 1 : -1;
        const sl = widen(dir === 1 ? B.l[i] - 0.1 * A[i] : B.h[i] + 0.1 * A[i], i + 1 < B.c.length ? B.o[i + 1] : B.c[i], dir, A[i]);
        const tr = simulate(B, i + 1, dir, sl, [[g.mid, 0.5], [dir === 1 ? g.top : g.bot, 0.5]], o);
        out.push({ kind: spring ? "SPRING" : "UPTHRUST", i, t: B.t[i], dir, vol: RV[i] >= o.volMin, rv: RV[i], range: g, prior: g.prior, trade: tr });
        if (tr) busy = tr.open ? Infinity : tr.exitI;
      }
    }
    return out;
  }

  // ---------- strategy 1c: Darvas boxes (both directions), stop trails the newest box ----------
  function darvasBoxes(B, dir, look) {
    // a new `look`-bar extreme starts a box; the top holds 3 bars, then the bottom holds 3 bars
    const n = B.c.length, hi = (i) => dir * (dir === 1 ? B.h[i] : B.l[i]), lo = (i) => dir * (dir === 1 ? B.l[i] : B.h[i]);
    const boxes = [];
    let st = 0, top = NaN, bot = NaN, ti = -1, bi = -1;
    for (let i = look; i < n; i++) {
      if (st === 0) {
        let ext = -Infinity; for (let k = i - look; k < i; k++) ext = Math.max(ext, hi(k));
        if (hi(i) > ext) { st = 1; top = hi(i); ti = i; }
      } else if (st === 1) {
        if (hi(i) > top) { top = hi(i); ti = i; } else if (i - ti >= 3) { st = 2; bot = Infinity; for (let k = ti; k <= i; k++) bot = Math.min(bot, lo(k)); bi = i; }
      } else if (st === 2) {
        if (hi(i) > top) { st = 1; top = hi(i); ti = i; } else if (lo(i) < bot) { bot = lo(i); bi = i; } else if (i - bi >= 3) { st = 3; boxes.push({ from: ti, at: i, top: dir * top, bot: dir * bot, dir }); }
      } else if (st === 3) {
        if (dir * B.c[i] > top) { boxes[boxes.length - 1].brk = i; st = 1; top = hi(i); ti = i; } else if (dir * B.c[i] < bot) st = 0;
      }
    }
    return boxes;
  }
  function darvas(B, A, RV, o) {
    const out = [], all = [];
    for (const dir of [1, -1]) {
      const boxes = darvasBoxes(B, dir, 50), at = boxes.map((b) => b.at);
      all.push(...boxes);
      let busy = -1;
      for (const box of boxes) {
        const i = box.brk;
        if (i === undefined || i <= busy) continue;
        const tr = simulate(B, i + 1, dir, box.bot - dir * 0.1 * A[i], [], o, (j) => {
          const b = boxes[lastIdx(at, j)];
          return b && b.at > i ? b.bot - dir * 0.1 * A[j] : NaN;
        });
        out.push({ kind: "DARVAS", i, t: B.t[i], dir, vol: RV[i] >= o.volMin, rv: RV[i], box, trade: tr });
        if (tr) busy = tr.open ? Infinity : tr.exitI;
      }
    }
    return { events: out.sort((a, b) => a.i - b.i), boxes: all.sort((a, b) => a.at - b.at) };
  }

  // ---------- strategy 2: breakouts and retests ----------
  function breakouts(B, A, RV, piv, o) {
    const n = B.c.length, out = [];
    const levels = [];
    let k = 0;
    const watch = [];  // broken levels being watched for retests
    for (let i = 1; i < n; i++) {
      while (k < piv.length && piv[k].c <= i) { levels.push({ p: piv[k].p, hi: piv[k].hi, from: piv[k].c, alive: true }); k++; }
      if (i % 200 === 0) for (let j = levels.length - 1; j >= 0; j--) if (!levels[j].alive) levels.splice(j, 1);
      // new breakouts: first close beyond an untouched swing level
      for (const lv of levels) {
        if (!lv.alive || i - lv.from > 300) { lv.alive = false; continue; }
        const dir = lv.hi ? 1 : -1;
        if (dir * (B.c[i] - lv.p) > 0.1 * A[i] && dir * (B.c[i - 1] - lv.p) <= 0) {
          lv.alive = false;
          const w = { level: lv.p, dir, i, tests: 0, away: false, done: false, ext: dir === 1 ? B.h[i] : B.l[i], rvB: RV[i] };
          watch.push(w);
          const sl = dir === 1 ? Math.min(lv.p - 0.25 * A[i], B.c[i] - 0.5 * A[i]) : Math.max(lv.p + 0.25 * A[i], B.c[i] + 0.5 * A[i]);
          out.push(entryRec("B0", w, i, dir, sl, RV[i], B, o));
        } else if (dir * (B.c[i] - lv.p) > 0) lv.alive = false;  // gapped through without a clean break: drop
      }
      // retests of levels already broken
      for (const w of watch) {
        if (w.done || i <= w.i) continue;
        const d = w.dir, A_ = A[i];
        w.ext = d === 1 ? Math.max(w.ext, B.h[i]) : Math.min(w.ext, B.l[i]);
        if (i - w.i > 100) { w.done = true; continue; }
        if (d * (B.c[i] - w.level) < -0.25 * A_) {  // failed breakout: back inside
          w.done = true;
          const sl = w.ext + d * 0.1 * A_;
          out.push(entryRec("FAIL", w, i, -d, sl, RV[i], B, o));
          continue;
        }
        if (d * ((d === 1 ? B.l[i] : B.h[i]) - w.level) > 0.5 * A_) w.away = true;
        const touch = d * ((d === 1 ? B.l[i] : B.h[i]) - w.level) <= 0.25 * A_;
        if (touch && w.away && d * (B.c[i] - w.level) > 0) {  // touched and rejected: one more test
          w.tests++; w.away = false;
          if (w.tests > o.maxTests) { w.done = true; continue; }
          const sl = (d === 1 ? Math.min(B.l[i], w.level) : Math.max(B.h[i], w.level)) - d * 0.1 * A_;
          out.push(entryRec(`T${w.tests}`, w, i, d, sl, RV[i], B, o));
        }
      }
    }
    return { events: out, watch: watch.filter((w) => !w.done).slice(-5) };
  }
  function entryRec(kind, w, i, dir, sl, rv, B, o) {
    // win = 2R reached before the stop (a fixed target, so the win rates are comparable across tests)
    let tr = null;
    if (i + 1 < B.c.length) {
      const e = B.o[i + 1];
      sl = widen(sl, e, dir, o.A[i]);
      const r = dir * (e - sl);
      if (r > 0) tr = simulate(B, i + 1, dir, sl, [[e + dir * o.rr * r, 1]], o);
    }
    return { kind, i, t: B.t[i], dir, level: w.level, test: w.tests, vol: rv >= o.volMin, rv, trade: tr };
  }

  // ---------- strategy 3: trading inside ranges ----------
  function rangeTrades(B, A, RV, R, o) {
    const out = [];
    for (const g of R) {
      let busy = -1;
      const h = g.top - g.bot;
      for (let i = g.found + 1; i <= (g.open ? B.c.length - 1 : Math.min(g.end - 1, B.c.length - 2)); i++) {
        if (i <= busy) continue;
        const atBot = B.l[i] <= g.bot + 0.15 * h && B.c[i] > B.o[i] && B.c[i] > g.bot;
        const atTop = B.h[i] >= g.top - 0.15 * h && B.c[i] < B.o[i] && B.c[i] < g.top;
        if (!atBot && !atTop) continue;
        const dir = atBot ? 1 : -1;
        const sl = widen(dir === 1 ? Math.min(B.l[i], g.bot) - 0.25 * A[i] : Math.max(B.h[i], g.top) + 0.25 * A[i], i + 1 < B.c.length ? B.o[i + 1] : B.c[i], dir, A[i]);
        const tr = simulate(B, i + 1, dir, sl, [[g.mid, 0.5], [dir === 1 ? g.top : g.bot, 0.5]], o);
        out.push({ kind: dir === 1 ? "R_LONG" : "R_SHORT", i, t: B.t[i], dir, vol: RV[i] >= o.volMin, rv: RV[i], range: g, prior: g.prior, trade: tr });
        if (tr) busy = tr.open ? Infinity : tr.exitI;
      }
    }
    return out;
  }

  // ---------- one timeframe ----------
  function runTF(B, tf, opt) {
    const o = Object.assign({}, DEFAULTS, opt);
    const n = B.c.length;
    if (n < 80) return null;
    const A = atr(B, 14), RV = rvol(B, TF_SEC[tf]), piv = zigzag(B, A, o.zz), trend = trendSeries(B, piv);
    const R = ranges(B, A, o);
    const ell = elliott(B, A, piv, o);
    const wy = wyckoff(B, A, RV, R, o);
    const dv = darvas(B, A, RV, o);
    const bo = breakouts(B, A, RV, piv, Object.assign({}, o, { A }));
    const rg = rangeTrades(B, A, RV, R, o);
    const closeT = Array.from(B.t, (t) => t + TF_SEC[tf]);
    return { tf, n, B, A, RV, piv, trend, closeT, ranges: R, elliott: ell, wyckoff: wy, darvas: dv.events, boxes: dv.boxes, breakouts: bo.events, watch: bo.watch, range: rg, o };
  }

  // ---------- council: votes at time t (seconds), small timeframes first ----------
  function council(res, t) {
    const votes = [];
    for (const tf of TFS.slice().reverse()) {
      const r = res[tf];
      if (!r) continue;
      const j = lastIdx(r.closeT, t);
      if (j < 0 || t - r.closeT[j] > 3 * TF_SEC[tf] + 3 * 86400) continue;  // too stale to vote
      votes.push({ tf, w: WEIGHT[tf], v: r.trend[j], t: r.closeT[j] });
    }
    const tot = votes.reduce((s, x) => s + x.w, 0) || 1;
    const up = votes.filter((x) => x.v === 1).reduce((s, x) => s + x.w, 0) / tot * 100;
    const dn = votes.filter((x) => x.v === -1).reduce((s, x) => s + x.w, 0) / tot * 100;
    return { votes, up, dn, flat: 100 - up - dn, side: up >= dn ? 1 : -1 };
  }

  // ---------- everything for one asset ----------
  const MODELS = ["W2", "W4", "W5", "ABC", "SPRING", "UPTHRUST", "DARVAS", "B0", "T1", "T2", "T3", "T4", "FAIL", "R_LONG", "R_SHORT"];
  const GROUP = { W2: 1, W4: 1, W5: 1, ABC: 1, SPRING: 1, UPTHRUST: 1, DARVAS: 1, B0: 2, T1: 2, T2: 2, T3: 2, T4: 2, FAIL: 2, R_LONG: 3, R_SHORT: 3 };
  function runAsset(bars, opt) {
    const o = Object.assign({}, DEFAULTS, opt);
    const res = {};
    for (const tf of TFS) if (bars[tf] && bars[tf].t && bars[tf].t.length) res[tf] = runTF(bars[tf], tf, o);
    // "now" = close of the newest bar on the finest timeframe; a forming W1/D1 bar closes in the future and must not set it
    const fine = TFS.filter((tf) => res[tf]).pop();
    const now = res[fine].closeT[res[fine].n - 1];
    const trades = [];
    for (const tf of TFS) {
      const r = res[tf];
      if (!r) continue;
      const add = (e, kind) => {
        if (!e.trade) return;
        const c = council(res, r.closeT[e.i]);
        const agree = (e.dir === 1 ? c.up : c.dn) >= o.councilMin;
        trades.push(Object.assign({ tf, kind: kind || e.kind, group: GROUP[kind || e.kind], vote: e.dir === 1 ? c.up : c.dn, agree, ev: e }, e.trade, { dir: e.dir, vol: e.vol }));
      };
      r.elliott.forEach((e) => add(e));
      r.wyckoff.forEach((e) => add(e));
      r.darvas.forEach((e) => add(e));
      r.breakouts.forEach((e) => add(e));
      r.range.forEach((e) => add(e));
    }
    trades.sort((a, b) => a.t - b.t);
    return { res, now, trades, council: council(res, now), o };
  }

  // ---------- statistics ----------
  function stats(tr) {
    const done = tr.filter((x) => !x.open), n = done.length, w = done.filter((x) => x.R > 0).length;
    let s = 0, gw = 0, gl = 0, peak = 0, dd = 0;
    for (const x of done) { s += x.R; if (x.R > 0) gw += x.R; else gl -= x.R; peak = Math.max(peak, s); dd = Math.max(dd, peak - s); }
    const m = n ? s / n : null, sd = n > 1 ? Math.sqrt(done.reduce((a, x) => a + (x.R - m) ** 2, 0) / (n - 1)) : null;
    const t = n > 1 && sd > 0 ? m / (sd / Math.sqrt(n)) : null;
    return { n, win: n ? w / n : null, avgR: m, totalR: s, pf: gl ? gw / gl : gw ? Infinity : null, dd, open: tr.length - n, sd, t, p: t == null ? null : pT(t, n - 1) };
  }

  // ---------- validation: is a green cell skill or luck? ----------
  // one-sided p-value of "mean R > 0" from Student's t (normal approximation with a small-sample correction)
  function pT(t, df) {
    const z = t * (1 - 1 / (4 * df)) / Math.sqrt(1 + t * t / (2 * df));
    return 1 - normCdf(z);
  }
  function normCdf(z) {
    const k = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
    const q = d * k * (0.3193815 + k * (-0.3565638 + k * (1.781478 + k * (-1.821256 + k * 1.330274))));
    return z >= 0 ? 1 - q : q;
  }
  // Benjamini-Hochberg: q-values that control the share of false discoveries when many cells are tested at once
  function bh(ps) {
    const idx = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), m = ps.length, q = new Array(m);
    let min = 1;
    for (let r = m - 1; r >= 0; r--) { min = Math.min(min, idx[r][0] * m / (r + 1)); q[idx[r][1]] = min; }
    return q;
  }
  // trades: closed trades with { key, t (entry), exitT, R }. Returns
  //   cells   : every key tested over the whole sample, with t-stat, p and BH q
  //   wf      : walk-forward. Each week, keep only the keys that passed the test on trades closed BEFORE that week,
  //             then take their trades of that week. Compared with trading every key, and with "hindsight"
  //             (keys picked with the whole sample, the usual illusion of a backtest table)
  //   split   : each key's average R in the first 2/3 of the time versus the last 1/3
  function validate(trades, o) {
    o = Object.assign({ minN: 8, q: 0.2, step: 7 * 86400, warm: 0.33 }, o);
    const T = trades.filter((x) => !x.open).sort((a, b) => a.t - b.t);
    if (T.length < 2) return null;
    const t0 = T[0].t, t1 = Math.max(...T.map((x) => x.exitT));
    const by = new Map();
    for (const x of T) { if (!by.has(x.key)) by.set(x.key, []); by.get(x.key).push(x); }
    const cells = [];
    for (const [key, a] of by) { const s = stats(a); if (s.n >= o.minN && s.p != null) cells.push(Object.assign({ key }, s)); }
    const qs = bh(cells.map((c) => c.p));
    cells.forEach((c, i) => { c.q = qs[i]; c.sig = qs[i] < o.q && c.avgR > 0; });
    // "hindsight" = what reading a backtest table does: keep every green cell, judged on the very trades it is then scored on
    const hind = new Set(cells.filter((c) => c.avgR > 0).map((c) => c.key));
    // walk-forward with running sums per key, advanced as each week's boundary moves
    const byExit = T.slice().sort((a, b) => a.exitT - b.exitT), acc = new Map();
    let k = 0, j = 0;
    const start = t0 + o.warm * (t1 - t0), sel = [], all = [], hin = [], nai = [], weeks = [];
    for (let b = start; b < t1; b += o.step) {
      while (k < byExit.length && byExit[k].exitT < b) {
        const x = byExit[k++], a = acc.get(x.key) || { n: 0, s: 0, ss: 0 };
        a.n++; a.s += x.R; a.ss += x.R * x.R; acc.set(x.key, a);
      }
      const test = [];
      for (const [key, a] of acc) {
        if (a.n < o.minN) continue;
        const m = a.s / a.n, sd = Math.sqrt(Math.max(0, (a.ss - a.n * m * m) / (a.n - 1)));
        if (sd > 0) test.push({ key, m, p: pT(m / (sd / Math.sqrt(a.n)), a.n - 1) });
      }
      const q = bh(test.map((x) => x.p)), pick = new Set(test.filter((x, i) => q[i] < o.q && x.m > 0).map((x) => x.key));
      const green = new Set(test.filter((x) => x.m > 0).map((x) => x.key));  // naive: green so far, no test
      weeks.push([b, pick.size, green.size]);
      while (j < T.length && T[j].t < b) j++;
      for (; j < T.length && T[j].t < b + o.step; j++) {
        const x = T[j];
        all.push(x);
        if (pick.has(x.key)) sel.push(x);
        if (green.has(x.key)) nai.push(x);
        if (hind.has(x.key)) hin.push(x);
      }
    }
    const curve = (a) => { let c = 0; return a.slice().sort((p, q) => p.exitT - q.exitT).map((x) => [x.exitT, (c += x.R)]); };
    // first 2/3 versus last 1/3 of the time, per key
    const mid = t0 + (t1 - t0) * 2 / 3, split = [];
    for (const [key, a] of by) {
      const is = stats(a.filter((x) => x.exitT < mid)), oos = stats(a.filter((x) => x.t >= mid));
      if (is.n >= o.minN && oos.n >= 3) split.push([key, is.avgR, oos.avgR, is.n, oos.n, is.p]);
    }
    return { cells, tested: cells.length, green: cells.filter((c) => c.avgR > 0).length, sig: cells.filter((c) => c.sig),
      start, end: t1, weeks, wf: { sel: stats(sel), all: stats(all), hind: stats(hin), naive: stats(nai), selC: curve(sel), allC: curve(all), hindC: curve(hin), naiveC: curve(nai) }, split, mid };
  }
  function windowed(trades, now, days, f) {
    return trades.filter((x) => x.t >= now - days * 86400 && (!f || f(x)));
  }
  // probability tables used by the page and the server summary
  function tables(A, days, filt) {
    const now = A.now, T = windowed(A.trades, now, days, filt);
    const grid = {};
    for (const m of MODELS) for (const tf of TFS) grid[`${m}|${tf}`] = stats(T.filter((x) => x.kind === m && x.tf === tf));
    const bo = {};
    for (const tf of TFS) for (const k of ["B0", "T1", "T2", "T3", "T4", "FAIL"]) {
      const s = T.filter((x) => x.tf === tf && x.kind === k);
      bo[`${k}|${tf}`] = { all: stats(s), vol: stats(s.filter((x) => x.vol)), novol: stats(s.filter((x) => !x.vol)) };
    }
    // ranges: how they ended given the trend before them, and how long/short plans did
    const rg = {};
    for (const tf of TFS) {
      const r = A.res[tf];
      if (!r) continue;
      const R = r.ranges.filter((g) => !g.open && g.t >= now - days * 86400);
      for (const p of [1, 0, -1]) {
        const s = R.filter((g) => g.prior === p);
        rg[`${p}|${tf}`] = { n: s.length, up: s.filter((g) => g.exit === 1).length, down: s.filter((g) => g.exit === -1).length,
          long: stats(T.filter((x) => x.tf === tf && x.kind === "R_LONG" && x.ev.prior === p)), short: stats(T.filter((x) => x.tf === tf && x.kind === "R_SHORT" && x.ev.prior === p)) };
      }
    }
    // Elliott scenarios: how often each scenario happened
    const el = {};
    for (const tf of TFS) {
      const r = A.res[tf];
      if (!r) continue;
      for (const kd of ["W2", "W4", "W5", "ABC", "ALL"]) {
        const e = r.elliott.filter((x) => x.scenario && x.t >= now - days * 86400 && (kd === "ALL" || x.kind === kd));
        el[`${kd}|${tf}`] = { n: e.length, s1: e.filter((x) => x.scenario === 1).length, s2: e.filter((x) => x.scenario === 2).length, s3: e.filter((x) => x.scenario === 3).length };
      }
    }
    return { grid, bo, rg, el, all: stats(T) };
  }

  // ---------- the current picture of one timeframe (for the page) ----------
  function current(A, tf) {
    const r = A.res[tf];
    if (!r) return null;
    const n = r.n, last = r.B.c[n - 1];
    const ell = r.elliott[r.elliott.length - 1] || null;
    const lastPiv = r.piv.slice(-6);
    const rg = r.ranges[r.ranges.length - 1];
    const box = r.boxes.filter((b) => b.at > n - 200).slice(-2);
    return { tf, last, trend: r.trend[n - 1], elliott: ell && n - 1 - ell.i < 200 ? ell : null, pivots: lastPiv, range: rg && rg.open ? rg : null, boxes: box, watch: r.watch, atr: r.A[n - 1] };
  }

  const api = { TFS, TF_SEC, WEIGHT, COST, WINDOWS, DEFAULTS, MODELS, GROUP, runTF, runAsset, council, stats, tables, windowed, current, zigzag, atr, matchWave, validate, bh, pT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TRAD = api;
})(typeof self !== "undefined" ? self : this);
