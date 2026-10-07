// MIDOTI v1.568 rules, replayed bar by bar on closed candles (port of the Pine script, sections 1-9).
// Same order as the script: sessions and OP -> VWAP/ATR/DMI/CMF -> RVOL by time of day -> KSI ->
// CCRY, bias, MLP -> time filters -> conditions L1-L8 -> position engine (TP1/TP2, BE, trailing, exits, risk locks).
// Every value at bar i uses bars 0..i only. A signal on bar i is filled at the open of bar i+1.
(function (root) {
  "use strict";

  const DEFAULTS = {
    view: "auto", anchor: "ny", mergeWkd: true,
    sessOn: true, asia: true, eu: true, us: true, warmMin: 30, rollOn: true, eodOn: false,
    band1: 1, band2: 2, adxLen: 14, adxSig: 20, adxStrong: 25, rvolLen: 20, rvolCcry: 1.2, rvolStr: 1.5,
    pbVolOn: false, pbRvolMax: 1, cmfLen: 20, wC1: 0.4, wC2: 0.3, wC3: 0.3, ksiBuy: 65, ksiSell: 35, mlpZoneK: 0.1,
    // core setup, each can be switched off
    L1: true, L2: true, L3: true, zVw: true, zMl: true, zOp: true, inBand: true,
    pbBars: 5, slMode: "C", slOutside: true, slBufAtr: 0.1, slMinAtr: 0.3, slMaxAtr: 1.5, slOkOn: true,
    l4On: false, rrMin: 2, tradeA: false, htfOn: false,
    // extra filters that are not in v1.568 (off by default)
    ksiOn: false, adxStrongOn: false, ccryOn: false,
    // money and exits
    bal: 10000, riskD: 1, riskA: 0.5, riskRed: 0.5, costPct: 0.1,
    tp1R: 2, tp1Pct: 50, tp2R: 3, beOn: true, beOffR: 0.05, trailOn: true, trailAtr: 0.25,
    timeStopOn: true, timeStop: 12, opExitOn: true, oppExitOn: true,
    locksOn: true, dayLoss: 3, weekLoss: 6, maxTrades: 3, coolMin: 30,
  };

  // ---------- time zones (offset cached per zone and hour) ----------
  const FMT = {}, OFF = {};
  function offsetMin(ms, tz) {
    const key = tz + Math.floor(ms / 3600000);
    let o = OFF[key];
    if (o !== undefined) return o;
    const f = FMT[tz] || (FMT[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }));
    const p = {};
    for (const x of f.formatToParts(new Date(Math.floor(ms / 3600000) * 3600000))) p[x.type] = +x.value;
    o = Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / 3600000) * 3600000) / 60000);
    OFF[key] = o;
    return o;
  }
  // wall clock in a zone: a Date whose UTC fields read as local time there
  const wall = (ms, tz) => new Date(ms + offsetMin(ms, tz) * 60000);
  const minOfDay = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
  const inWin = (m, a, b) => (a <= b ? m >= a && m < b : m >= a || m < b);

  const ANCHOR = { ny: ["America/New_York", 0], asia: ["Asia/Tokyo", 540], eu: ["Europe/London", 480], us: ["America/New_York", 480] };

  // ---------- indicator helpers ----------
  function rma(src, n) {
    const out = new Float64Array(src.length).fill(NaN);
    let s = 0, k = 0, v = NaN;
    for (let i = 0; i < src.length; i++) {
      const x = src[i];
      if (!isFinite(x)) { out[i] = v; continue; }
      if (k < n) { s += x; k++; if (k === n) v = s / n; } else v = (v * (n - 1) + x) / n;
      out[i] = v;
    }
    return out;
  }

  function run(B, opt) {
    const o = Object.assign({}, DEFAULTS, opt || {});
    const n = B.t.length, tfSec = o.tfSec, tfMin = tfSec / 60;
    const swing = o.view === "swing" || (o.view === "auto" && tfSec >= 3600);
    const [opTz, opMin] = ANCHOR[o.anchor] || ANCHOR.ny;
    const O = B.o, H = B.h, L = B.l, C = B.c, V = B.v;
    const hasVolAll = V.some((x) => x > 0);
    const W = hasVolAll ? V : V.map(() => 1);  // no volume at all: equal weights for VWAP

    // 1. sessions and OP. Reference period: day (intraday) or week (swing); higher period: week or month.
    const dayKey = new Array(n), refKey = new Array(n), htfKey = new Array(n), wkKey = new Array(n);
    for (let i = 0; i < n; i++) {
      const ms = B.t[i] * 1000;
      let d = wall(ms - opMin * 60000, opTz);  // shift so the OP anchor starts the day
      const dow = d.getUTCDay();
      if (o.mergeWkd && (dow === 0 || dow === 6)) d = new Date(d.getTime() - (dow === 0 ? 2 : 1) * 86400000);
      const dk = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
      const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
      const wk = mon.getTime() / 86400000;
      dayKey[i] = dk; wkKey[i] = wk;
      refKey[i] = swing ? wk : dk;
      htfKey[i] = swing ? d.getUTCFullYear() * 100 + d.getUTCMonth() : wk;
    }

    const S = {
      vw: new Float64Array(n), vwU2: new Float64Array(n), vwL2: new Float64Array(n), htfVw: new Float64Array(n),
      op: new Float64Array(n), mlp: new Float64Array(n), pHigh: new Float64Array(n), pLow: new Float64Array(n),
      atr: null, diP: null, diM: null, adx: null, cmf: new Float64Array(n), rvol: new Float64Array(n), ksi: new Float64Array(n),
      ccry: new Int8Array(n), bias: new Int8Array(n), htfBias: new Int8Array(n), newSess: new Uint8Array(n), timeOk: new Uint8Array(n),
      sig: new Int8Array(n), grade: new Int8Array(n),
    };

    // ATR(14), DMI, CMF
    const tr = new Float64Array(n), pdm = new Float64Array(n), mdm = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (i === 0) { tr[i] = H[i] - L[i]; pdm[i] = mdm[i] = NaN; continue; }
      tr[i] = Math.max(H[i] - L[i], Math.abs(H[i] - C[i - 1]), Math.abs(L[i] - C[i - 1]));
      const up = H[i] - H[i - 1], dn = L[i - 1] - L[i];
      pdm[i] = up > dn && up > 0 ? up : 0;
      mdm[i] = dn > up && dn > 0 ? dn : 0;
    }
    const atr = rma(tr, 14), trA = rma(Array.from(tr).map((x, i) => (i === 0 ? NaN : x)), o.adxLen);
    const pA = rma(pdm, o.adxLen), mA = rma(mdm, o.adxLen);
    const diP = new Float64Array(n), diM = new Float64Array(n), dx = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      diP[i] = trA[i] > 0 ? 100 * pA[i] / trA[i] : NaN;
      diM[i] = trA[i] > 0 ? 100 * mA[i] / trA[i] : NaN;
      const s = diP[i] + diM[i];
      dx[i] = s > 0 ? 100 * Math.abs(diP[i] - diM[i]) / s : isFinite(s) ? 0 : NaN;
    }
    const adx = rma(dx, o.adxLen);
    S.atr = atr; S.diP = diP; S.diM = diM; S.adx = adx;
    let mfv = 0, vs = 0;
    const mfvA = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      mfvA[i] = H[i] !== L[i] ? ((C[i] - L[i]) - (H[i] - C[i])) / (H[i] - L[i]) * V[i] : 0;
      mfv += mfvA[i]; vs += V[i];
      if (i >= o.cmfLen) { mfv -= mfvA[i - o.cmfLen]; vs -= V[i - o.cmfLen]; }
      S.cmf[i] = vs > 0 ? mfv / vs : 0;
    }

    // ATR of the reference period (previous completed day or week), for the MLP zone width
    const atrRef = new Float64Array(n).fill(NaN);
    {
      let ph = NaN, pl = NaN, pc = NaN, ch = NaN, cl = NaN, cc = NaN, a = NaN, k = 0, s = 0, last = null;
      for (let i = 0; i < n; i++) {
        const key = swing ? wkKey[i] : dayKey[i];
        if (key !== last) {
          if (last !== null) {  // close the finished period
            const t = isFinite(pc) ? Math.max(ch - cl, Math.abs(ch - pc), Math.abs(cl - pc)) : ch - cl;
            if (k < 14) { s += t; k++; if (k === 14) a = s / 14; } else a = (a * 13 + t) / 14;
            pc = cc;
          }
          ch = H[i]; cl = L[i]; last = key;
        } else { ch = Math.max(ch, H[i]); cl = Math.min(cl, L[i]); }
        cc = C[i];
        atrRef[i] = a;
      }
      void ph; void pl;
    }

    // RVOL by time of day (same minute of the day in the OP zone), fallback SMA(20)
    const todMap = new Map();
    let vsum20 = 0;
    for (let i = 0; i < n; i++) {
      vsum20 += V[i]; if (i >= 20) vsum20 -= V[i - 20];
      const tod = minOfDay(wall(B.t[i] * 1000, opTz));
      const buf = todMap.get(tod);
      let ref = NaN;
      if (buf && buf.length >= Math.min(5, o.rvolLen)) ref = buf.reduce((x, y) => x + y, 0) / buf.length;
      if (!isFinite(ref)) ref = vsum20 / Math.min(i + 1, 20);
      S.rvol[i] = ref > 0 ? V[i] / ref : 1;
      if (i < n - 1 || B.closed !== false) {
        if (!buf) todMap.set(tod, [V[i]]); else { buf.push(V[i]); if (buf.length > o.rvolLen) buf.shift(); }
      }
    }

    // sessions, OP, VWAP and the walk through conditions and positions
    let opPrice = NaN, sHigh = NaN, sLow = NaN, pHigh = NaN, pLow = NaN, pClose = NaN, refStart = NaN, htfOpen = NaN;
    let sw = 0, swv = 0, sw2 = 0, hw = 0, hwv = 0, cumVol = 0;
    const trades = [], events = [];
    // position state (9)
    let pDir = 0, pSL = NaN, pRisk = NaN, pGrade = 0, pSig = -1;
    let posDir = 0, pos = null;
    let dayPct = 0, weekPct = 0, dayTrd = 0, consLoss = 0, lastLoss = -1e9;
    const lastI = n - 1, liveLast = B.closed === false;
    let check = null;

    for (let i = 0; i < n; i++) {
      const ms = B.t[i] * 1000;
      const newSess = i === 0 || refKey[i] !== refKey[i - 1];
      const newHtf = i === 0 || htfKey[i] !== htfKey[i - 1];
      const newWeek = i === 0 || wkKey[i] !== wkKey[i - 1];
      S.newSess[i] = newSess ? 1 : 0;
      if (newSess) { refStart = ms; pHigh = sHigh; pLow = sLow; pClose = i ? C[i - 1] : NaN; opPrice = O[i]; sHigh = H[i]; sLow = L[i]; }
      else { sHigh = Math.max(sHigh, H[i]); sLow = Math.min(sLow, L[i]); }
      if (newHtf) htfOpen = O[i];
      const src = (H[i] + L[i] + C[i]) / 3;
      if (newSess) { sw = 0; swv = 0; sw2 = 0; }
      if (newHtf) { hw = 0; hwv = 0; }
      sw += W[i]; swv += W[i] * src; sw2 += W[i] * src * src; hw += W[i]; hwv += W[i] * src;
      cumVol += V[i];
      const vw = sw > 0 ? swv / sw : src, sd = sw > 0 ? Math.sqrt(Math.max(0, sw2 / sw - vw * vw)) : 0;
      const vwU2 = vw + o.band2 * sd, vwL2 = vw - o.band2 * sd;
      const htfVw = hw > 0 ? hwv / hw : src;
      S.vw[i] = vw; S.vwU2[i] = vwU2; S.vwL2[i] = vwL2; S.htfVw[i] = htfVw; S.op[i] = opPrice;
      S.pHigh[i] = pHigh; S.pLow[i] = pLow;
      const a14 = atr[i], rv = S.rvol[i], hasVol = cumVol > 0;

      // 4. KSI
      const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
      const c1 = a14 > 0 ? clamp((C[i] - htfVw) / (1.5 * a14), -1, 1) : 0;
      const dS = diP[i] + diM[i];
      const c2 = dS > 0 ? (diP[i] - diM[i]) / dS * clamp((adx[i] - 15) / 15, 0, 1) : 0;
      const c3 = clamp(S.cmf[i] / 0.25, -1, 1);
      const wS = o.wC1 + o.wC2 + o.wC3;
      const ksiRaw = wS > 0 ? (o.wC1 * c1 + o.wC2 * c2 + o.wC3 * c3) / wS : 0;
      const ksi = 50 + 50 * ksiRaw * clamp(0.5 + 0.5 * (rv - 1), 0.5, 1);
      S.ksi[i] = ksi;

      // 5. CCRY, bias, MLP
      const isBlue = C[i] > vw && diP[i] > diM[i] && rv >= o.rvolCcry && C[i] > O[i];
      const isBlack = C[i] < vw && diM[i] > diP[i] && rv >= o.rvolCcry && C[i] < O[i];
      const ccry = isBlue ? 1 : isBlack ? -1 : 0;
      const bias = C[i] > opPrice && C[i] > vw ? 1 : C[i] < opPrice && C[i] < vw ? -1 : 0;
      const htfBias = C[i] > htfOpen && C[i] > htfVw ? 1 : C[i] < htfOpen && C[i] < htfVw ? -1 : 0;
      const mlp = (pHigh + pLow) / 2;
      const zW = o.mlpZoneK * (isFinite(atrRef[i]) ? atrRef[i] : a14 * 10);
      const pvP = (pHigh + pLow + pClose) / 3, pvR1 = 2 * pvP - pLow, pvS1 = 2 * pvP - pHigh;
      const opAbove = opPrice > mlp;
      S.ccry[i] = ccry; S.bias[i] = bias; S.htfBias[i] = htfBias; S.mlp[i] = mlp;

      // 6. time filters (intraday view only, as in the script)
      let inAsia = false, inEu = false, inUs = false, rollWin = false, warmWin = false, eodWin = false;
      if (!swing) {
        const tk = minOfDay(wall(ms, "Asia/Tokyo")), ld = minOfDay(wall(ms, "Europe/London")), ny = minOfDay(wall(ms, "America/New_York"));
        inAsia = inWin(tk, 540, 1080); inEu = inWin(ld, 480, 1020); inUs = inWin(ny, 480, 1020);
        rollWin = o.rollOn && inWin(ny, 1015, 1085);
        warmWin = o.warmMin > 0 && ms - refStart < o.warmMin * 60000;
        eodWin = o.eodOn && inWin(minOfDay(wall(ms, "Asia/Ho_Chi_Minh")), 225, 240);
      }
      const outSess = !swing && o.sessOn && !((o.asia && inAsia) || (o.eu && inEu) || (o.us && inUs));
      const timeOk = !rollWin && !outSess && !eodWin && !warmWin;
      S.timeOk[i] = timeOk ? 1 : 0;

      // 8. conditions
      const tol = 0.1 * a14;
      let lowPB = Infinity, highPB = -Infinity;
      for (let k = Math.max(0, i - o.pbBars + 1); k <= i; k++) { lowPB = Math.min(lowPB, L[k]); highPB = Math.max(highPB, H[k]); }
      const adxUp = adx[i] >= o.adxSig && i >= 3 && adx[i] > adx[i - 3];
      const okM = isFinite(mlp);
      const tVwL = o.zVw && lowPB <= vw + tol && C[i] > vw;
      const tMlL = o.zMl && okM && opAbove && lowPB <= mlp + zW + tol && C[i] > mlp;
      const tOpL = o.zOp && okM && !opAbove && lowPB <= opPrice + tol && C[i] > opPrice;
      const tVwS = o.zVw && highPB >= vw - tol && C[i] < vw;
      const tOpS = o.zOp && okM && opAbove && highPB >= opPrice - tol && C[i] < opPrice;
      const tMlS = o.zMl && okM && !opAbove && highPB >= mlp - zW - tol && C[i] < mlp;
      const zoneL = tVwL || tMlL || tOpL, zoneS = tVwS || tOpS || tMlS;
      const L1 = !o.L1 || bias === 1, S1 = !o.L1 || bias === -1;
      const L2 = !o.L2 || (adxUp && diP[i] > diM[i]), S2 = !o.L2 || (adxUp && diM[i] > diP[i]);
      const L3 = !o.L3 || (zoneL && C[i] > O[i] && (!o.inBand || C[i] <= vwU2));
      const S3 = !o.L3 || (zoneS && C[i] < O[i] && (!o.inBand || C[i] >= vwL2));
      let pbRv = NaN;
      if (i >= o.pbBars) { let s = 0; for (let k = i - o.pbBars; k < i; k++) s += S.rvol[k]; pbRv = s / o.pbBars; }
      const volPB = !o.pbVolOn || !hasVol || (pbRv < o.pbRvolMax && rv > pbRv);

      // stop loss by structure (C: pullback low/high, A: last opposite-colour candle)
      let oppLow = NaN, oppHigh = NaN;
      if (o.slMode === "A") for (let k = 1; k <= 30 && i - k >= 0; k++) {
        if (!isFinite(oppLow) && C[i - k] < O[i - k]) oppLow = L[i - k];
        if (!isFinite(oppHigh) && C[i - k] > O[i - k]) oppHigh = H[i - k];
        if (isFinite(oppLow) && isFinite(oppHigh)) break;
      }
      // round-trip cost = one spread + fees + slippage; the SL buffer adds the spread part only
      const spreadPx = C[i] * o.costPct / 100 * 0.3;
      const buf = o.slBufAtr * a14 + spreadPx;
      let baseL = o.slMode === "A" ? oppLow : lowPB;
      if (o.slOutside && isFinite(baseL)) baseL = Math.min(baseL, L[i]);
      if (!isFinite(baseL) || baseL >= C[i]) baseL = L[i];
      let slL = baseL - buf, distL = C[i] - slL;
      if (distL < o.slMinAtr * a14) { distL = o.slMinAtr * a14; slL = C[i] - distL; }
      const slOkL = !o.slOkOn || distL <= o.slMaxAtr * a14;
      let baseS = o.slMode === "A" ? oppHigh : highPB;
      if (o.slOutside && isFinite(baseS)) baseS = Math.max(baseS, H[i]);
      if (!isFinite(baseS) || baseS <= C[i]) baseS = H[i];
      let slS = baseS + buf, distS = slS - C[i];
      if (distS < o.slMinAtr * a14) { distS = o.slMinAtr * a14; slS = C[i] + distS; }
      const slOkS = !o.slOkOn || distS <= o.slMaxAtr * a14;

      // L4: nearest structural target must be at least RR x risk away
      let tgtL = NaN, tgtS = NaN;
      for (const x of [pHigh, vwU2, pvR1]) if (isFinite(x) && x > C[i] && (!isFinite(tgtL) || x < tgtL)) tgtL = x;
      for (const x of [pLow, vwL2, pvS1]) if (isFinite(x) && x < C[i] && (!isFinite(tgtS) || x > tgtS)) tgtS = x;
      const L4 = !o.l4On || !isFinite(tgtL) || tgtL - C[i] >= o.rrMin * distL;
      const S4 = !o.l4On || !isFinite(tgtS) || C[i] - tgtS >= o.rrMin * distS;
      const L8 = hasVol && rv >= o.rvolStr;
      const xL = (!o.ksiOn || ksi >= o.ksiBuy) && (!o.adxStrongOn || adx[i] >= o.adxStrong) && (!o.ccryOn || ccry === 1);
      const xS = (!o.ksiOn || ksi <= o.ksiSell) && (!o.adxStrongOn || adx[i] >= o.adxStrong) && (!o.ccryOn || ccry === -1);
      const ready = a14 > 0 && i >= 30;
      const mandL = L1 && L2 && L3 && L4 && volPB && timeOk && slOkL && xL && ready;
      const mandS = S1 && S2 && S3 && S4 && volPB && timeOk && slOkS && xS && ready;
      const conf = !(liveLast && i === lastI);
      const gradeL = conf && mandL ? (L8 && (!o.htfOn || htfBias === 1) ? 2 : 1) : 0;
      const gradeS = conf && mandS ? (L8 && (!o.htfOn || htfBias === -1) ? 2 : 1) : 0;

      if (i === lastI) {
        check = {
          t: B.t[i], closed: conf, swing, price: C[i], vw, op: opPrice, mlp, htfVw, htfOpen, atr: a14, adx: adx[i], diP: diP[i], diM: diM[i],
          rvol: rv, ksi, cmf: S.cmf[i], ccry, bias, htfBias, timeOk, inAsia, inEu, inUs, rollWin, warmWin, outSess, hasVol, vwU2, vwL2, pHigh, pLow,
          zones: { L: { vw: tVwL, ml: tMlL, op: tOpL }, S: { vw: tVwS, ml: tMlS, op: tOpS } },
          long: { L1: bias === 1, L2: adxUp && diP[i] > diM[i], L3: zoneL && C[i] > O[i] && C[i] <= vwU2, L4: L4, L5: volPB, L8, htf: htfBias === 1, ksi: ksi >= o.ksiBuy, adxS: adx[i] >= o.adxStrong, ccry: ccry === 1, slOk: distL <= o.slMaxAtr * a14, time: timeOk, sl: slL, dist: distL, mand: mandL },
          short: { L1: bias === -1, L2: adxUp && diM[i] > diP[i], L3: zoneS && C[i] < O[i] && C[i] >= vwL2, L4: S4, L5: volPB, L8, htf: htfBias === -1, ksi: ksi <= o.ksiSell, adxS: adx[i] >= o.adxStrong, ccry: ccry === -1, slOk: distS <= o.slMaxAtr * a14, time: timeOk, sl: slS, dist: distS, mand: mandS },
        };
      }

      // 9. position engine
      if (newSess) { dayPct = 0; dayTrd = 0; }
      if (newWeek) weekPct = 0;
      // 9a. fill the pending order at this bar's open
      if (pDir !== 0) {
        posDir = pDir;
        const e = O[i];
        let sl = pSL, r = Math.abs(e - sl);
        if (r < o.slMinAtr * a14 * 0.5 || (posDir === 1 && sl >= e) || (posDir === -1 && sl <= e)) { r = o.slMinAtr * a14; sl = e - posDir * r; }
        const sb = pSig;
        pos = {
          dir: posDir, grade: pGrade, sigI: sb, sigT: B.t[sb], i, t: B.t[i], entry: e, sl0: sl, sl, r, tp1: e + posDir * o.tp1R * r, tp2: e + posDir * o.tp2R * r,
          risk: pRisk, tp1Done: false, realR: 0, remain: 1, mfe: 0, mae: 0, gap: Math.abs(e - C[sb]) / (atr[sb] || 1), costPx: e * o.costPct / 100,
          parts: [],
        };
        dayTrd += 1; pDir = 0;
      }
      // 9b. manage the open position
      let closed = false, exitWhy = "", exitPx = NaN;
      if (posDir !== 0 && pos && pos.r > 0) {
        const p = pos, r = p.r, frac = o.tp1Pct / 100;
        p.mfe = Math.max(p.mfe, posDir === 1 ? (H[i] - p.entry) / r : (p.entry - L[i]) / r);
        p.mae = Math.max(p.mae, posDir === 1 ? (p.entry - L[i]) / r : (H[i] - p.entry) / r);
        const hitSL = posDir === 1 ? L[i] <= p.sl : H[i] >= p.sl;
        if (hitSL) {
          const px = posDir === 1 ? Math.min(O[i], p.sl) : Math.max(O[i], p.sl);
          p.realR += p.remain * posDir * (px - p.entry) / r; p.parts.push([B.t[i], px, p.remain]); p.remain = 0;
          closed = true; exitPx = px; exitWhy = p.tp1Done ? "SL_AFTER_TP1" : p.sl !== p.sl0 ? "SL_MOVED" : "SL";
        } else {
          if (!p.tp1Done && (posDir === 1 ? H[i] >= p.tp1 : L[i] <= p.tp1)) {
            p.realR += frac * o.tp1R; p.remain -= frac; p.tp1Done = true; p.parts.push([B.t[i], p.tp1, frac]);
            if (o.beOn) p.sl = p.entry + posDir * o.beOffR * r;
            if (p.remain <= 0.0001) { closed = true; exitWhy = "TP1"; exitPx = p.tp1; }
          }
          if (!closed && p.tp1Done && (posDir === 1 ? H[i] >= p.tp2 : L[i] <= p.tp2)) {
            p.realR += p.remain * o.tp2R; p.parts.push([B.t[i], p.tp2, p.remain]); p.remain = 0; closed = true; exitWhy = "TP2"; exitPx = p.tp2;
          }
        }
        if (!closed) {
          const tStop = o.timeStopOn && !p.tp1Done && i - p.i >= o.timeStop && p.mfe < 1;
          const oppSig = o.oppExitOn && ((posDir === 1 && gradeS === 2) || (posDir === -1 && gradeL === 2));
          const opLost = o.opExitOn && !newSess && (posDir === 1 ? C[i] < opPrice && C[i] < vw : C[i] > opPrice && C[i] > vw);
          if (conf && (tStop || eodWin || oppSig || opLost)) {
            p.realR += p.remain * posDir * (C[i] - p.entry) / r; p.parts.push([B.t[i], C[i], p.remain]); p.remain = 0;
            closed = true; exitPx = C[i];
            exitWhy = tStop ? "TIME" : eodWin ? "EOD" : oppSig ? "OPP" : "OPVWAP";
          }
        }
        if (!closed && p.tp1Done && o.trailOn) p.sl = posDir === 1 ? Math.max(p.sl, vw - o.trailAtr * a14) : Math.min(p.sl, vw + o.trailAtr * a14);
      }
      // 9c. book the result
      if (closed) {
        const p = pos, costR = p.costPx / p.r, rr = p.realR - costR;
        dayPct += rr * p.risk; weekPct += rr * p.risk;
        consLoss = rr < 0 ? consLoss + 1 : 0;
        if (rr < 0) lastLoss = i;
        trades.push(Object.assign(p, { exitI: i, exitT: B.t[i], exitPx, exitWhy, grossR: p.realR, costR, R: rr, usd: rr * p.risk / 100 * o.bal, bars: i - p.i + 1 }));
        posDir = 0; pos = null;
      }
      // 9d. risk state
      const cool = o.locksOn && o.coolMin > 0 && (i - lastLoss) * tfMin < o.coolMin;
      const dayLocked = o.locksOn && dayPct <= -o.dayLoss, weekLocked = o.locksOn && weekPct <= -o.weekLoss;
      const trdLocked = o.locksOn && dayTrd >= o.maxTrades;
      const riskLocked = cool || dayLocked || weekLocked || trdLocked;
      const fRisk = (g) => { const rp = g === 2 ? o.riskD : o.riskA; return consLoss >= 3 ? Math.min(rp, o.riskRed) : rp; };
      // 9e. new signal -> pending order for the next bar
      const sigDir = gradeL > 0 ? 1 : gradeS > 0 ? -1 : 0;
      const sigGrade = sigDir === 1 ? gradeL : sigDir === -1 ? gradeS : 0;
      if (sigDir) {
        S.sig[i] = sigDir; S.grade[i] = sigGrade;
        const zone = sigDir === 1 ? [tVwL && "vw", tMlL && "ml", tOpL && "op"].filter(Boolean) : [tVwS && "vw", tMlS && "ml", tOpS && "op"].filter(Boolean);
        const blocked = !(sigGrade === 2 || o.tradeA) ? "GRADE" : posDir !== 0 ? "INPOS" : pDir !== 0 || closed ? "BUSY" :
          cool ? "COOL" : dayLocked ? "DAYLOSS" : weekLocked ? "WEEKLOSS" : trdLocked ? "MAXTRADES" : null;
        events.push({
          i, t: B.t[i], dir: sigDir, grade: sigGrade, price: C[i], sl: sigDir === 1 ? slL : slS, dist: sigDir === 1 ? distL : distS,
          adx: adx[i], adxUp, diP: diP[i], diM: diM[i], rvol: rv, ksi, cmf: S.cmf[i], ccry, htfBias, bias, zone, vw, op: opPrice, mlp, atr: a14,
          tgt: sigDir === 1 ? tgtL : tgtS, pbRv, taken: !blocked, blocked,
          sess: swing ? null : (inUs && inEu ? "EU-US" : inUs ? "US" : inEu && inAsia ? "AS-EU" : inEu ? "EU" : inAsia ? "AS" : "OUT"),
        });
        if (!blocked) { pDir = sigDir; pSL = sigDir === 1 ? slL : slS; pGrade = sigGrade; pRisk = fRisk(sigGrade); pSig = i; }
      }
    }
    trades.forEach((tr) => { tr.snap = events.find((e) => e.i === tr.sigI) || null; });
    return { opt: o, swing, n, series: S, trades, events, open: pos, pending: pDir ? { dir: pDir, sl: pSL, grade: pGrade, sigI: pSig } : null, check, stats: stats(trades, o) };
  }

  function stats(tr, o) {
    const n = tr.length, w = tr.filter((x) => x.R > 0);
    let cum = 0, peak = 0, dd = 0, gw = 0, gl = 0;
    const curve = [];
    for (const x of tr) {
      cum += x.R; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum);
      if (x.R > 0) gw += x.R; else gl -= x.R;
      curve.push([x.exitT, cum]);
    }
    const usd = tr.reduce((s, x) => s + x.usd, 0);
    let streak = 0, worst = 0;
    for (const x of tr) { streak = x.R < 0 ? streak + 1 : 0; worst = Math.max(worst, streak); }
    return {
      n, wins: w.length, win: n ? w.length / n : null, totalR: cum, avgR: n ? cum / n : null, pf: gl > 0 ? gw / gl : gw > 0 ? Infinity : null,
      maxDD: dd, usd, pct: o ? usd / o.bal * 100 : null, worstStreak: worst, curve,
      long: tr.filter((x) => x.dir === 1).length, short: tr.filter((x) => x.dir === -1).length,
      dia: tr.filter((x) => x.grade === 2).length, hollow: tr.filter((x) => x.grade === 1).length,
    };
  }

  // Factors seen at the signal candle, used to explain wins and losses and to rank the filters.
  const FACTORS = [
    ["htf", (e) => e.htfBias === e.dir],
    ["rvol", (e) => e.rvol >= 1.5],
    ["ksi", (e) => (e.dir === 1 ? e.ksi >= 50 : e.ksi <= 50)],
    ["adx", (e) => e.adx >= 25],
    ["cmf", (e) => (e.dir === 1 ? e.cmf > 0 : e.cmf < 0)],
    ["ccry", (e) => e.ccry === e.dir],
    ["zvw", (e) => e.zone.includes("vw")],
    ["zml", (e) => e.zone.includes("ml") || e.zone.includes("op")],
  ];
  function factorTable(trades) {
    return FACTORS.map(([k, f]) => {
      const yes = trades.filter((t) => t.snap && f(Object.assign({}, t.snap, { dir: t.dir })));
      const no = trades.filter((t) => t.snap && !f(Object.assign({}, t.snap, { dir: t.dir })));
      const s = (a) => ({ n: a.length, win: a.length ? a.filter((x) => x.R > 0).length / a.length : null, avgR: a.length ? a.reduce((x, y) => x + y.R, 0) / a.length : null });
      return { key: k, yes: s(yes), no: s(no) };
    });
  }

  // Why a losing trade lost: what was against it at entry and what happened after.
  function lossFactors(t, o) {
    const e = t.snap, out = [];
    if (!e) return out;
    if (e.htfBias !== t.dir) out.push(["htf", e.htfBias]);
    if (e.rvol < (o ? o.rvolStr : 1.5)) out.push(["rvol", e.rvol]);
    if (t.dir === 1 ? e.ksi < 50 : e.ksi > 50) out.push(["ksi", e.ksi]);
    if (e.adx < 25) out.push(["adx", e.adx]);
    if (t.dir === 1 ? e.cmf < 0 : e.cmf > 0) out.push(["cmf", e.cmf]);
    if (e.ccry !== t.dir) out.push(["ccry", e.ccry]);
    if (t.mfe >= 1 && !t.tp1Done) out.push(["gave", t.mfe]);
    else if (t.mfe < 0.3) out.push(["straight", t.mfe]);
    if (t.gap > 0.3) out.push(["gap", t.gap]);
    if (t.costR > 0.25) out.push(["cost", t.costR]);
    if (e.sess === "AS" || e.sess === "OUT") out.push(["thin", e.sess]);
    return out;
  }

  const api = { DEFAULTS, run, stats, factorTable, lossFactors, FACTORS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MIDOTI = api;
})(typeof self !== "undefined" ? self : this);
