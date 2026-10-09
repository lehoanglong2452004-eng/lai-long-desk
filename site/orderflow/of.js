"use strict";
// Order Flow page: live trades, order book, open interest and liquidations straight from the exchanges' public
// feeds, turned into a footprint chart and the order-flow tools by ofcore.js. Runs entirely in the browser.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const C = window.OFCORE;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const VN = 7 * 3600e3;
  const fHM = (t) => new Date(t + VN).toISOString().slice(11, 16);
  const fHMS = (t) => new Date(t + VN).toISOString().slice(11, 19);
  const fDM = (t) => new Date(t + VN).toISOString().slice(8, 10) + "/" + new Date(t + VN).toISOString().slice(5, 7);
  const fq = (q) => {
    if (q == null || !isFinite(q)) return "–";
    const a = Math.abs(q), s = q < 0 ? "-" : "";
    if (a >= 1e9) return s + (a / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    if (a >= 1e4) return s + (a / 1e3).toFixed(0) + "k";
    if (a >= 1e3) return s + (a / 1e3).toFixed(1) + "k";
    if (a >= 100) return s + a.toFixed(0);
    if (a >= 10) return s + a.toFixed(1);
    if (a >= 1) return s + a.toFixed(2);
    if (a === 0) return "0";
    if (a >= 0.01) return s + a.toFixed(3);
    return s + a.toPrecision(2);
  };
  const fUsd = (x) => (x == null || !isFinite(x) ? "–" : (x < 0 ? "-$" : "$") + fq(Math.abs(x)));
  const fP = (x) => { if (x == null || !isFinite(x)) return "–"; const a = Math.abs(x); return x.toFixed(a >= 10000 ? 1 : a >= 1000 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : 6); };
  const fPct = (x, d = 2) => (x == null || !isFinite(x) ? "–" : (x >= 0 ? "+" : "") + (x * 100).toFixed(d) + "%");
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  async function getJSON(url, init) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, Object.assign({ signal: ctl.signal, cache: "no-store" }, init || {}));
      if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; }
      return await r.json();
    } finally { clearTimeout(to); }
  }
  const hlPost = (body) => getJSON("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  // ---------- products ----------
  const HL_XYZ = { GOLD: "GOLD", SILVER: "SILVER", PLATINUM: "PLATINUM", COPPER: "COPPER", WTI: "CL", BRENT: "BRENTOIL", NATGAS: "NATGAS", SP500: "SP500", NASDAQ100: "XYZ100", AAPL: "AAPL", MSFT: "MSFT", NVDA: "NVDA", GOOGL: "GOOGL", AMZN: "AMZN", META: "META", TSLA: "TSLA" };
  const NAMES = { GOLD: "Vàng", SILVER: "Bạc", PLATINUM: "Bạch kim", COPPER: "Đồng", WTI: "Dầu WTI", BRENT: "Dầu Brent", NATGAS: "Khí tự nhiên", SP500: "S&P 500", NASDAQ100: "Nasdaq 100" };
  const CRYPTO0 = ["BTC", "ETH", "BNB", "XRP", "SOL", "TRX", "ZEC", "DOGE", "XMR", "LINK", "ADA", "XLM", "NEAR", "BCH", "LTC", "UNI", "AVAX", "SUI"];
  let CRYPTO = CRYPTO0.slice();
  const isCrypto = (s) => CRYPTO.includes(s);

  const TFS = [["1m", 6e4], ["3m", 18e4], ["5m", 3e5], ["15m", 9e5], ["30m", 18e5]];
  const TFN = Object.fromEntries(TFS);
  const NBARS = { "1m": 1000, "3m": 800, "5m": 600, "15m": 500, "30m": 400 };
  const ROWM = [[0.5, "½"], [1, "Tự động"], [2, "×2"], [5, "×5"], [10, "×10"]];
  const LAYERS = [
    ["KHỐI LƯỢNG & DÒNG LỆNH", [["fp", "Footprint"], ["vf", "Bar's Volume Filter"], ["cl", "Cluster Search"], ["big", "Big Trades"], ["spv", "Spread Volumes"], ["pat", "Tape Patterns"]]],
    ["ĐỘ SÂU THỊ TRƯỜNG", [["lvl", "DOM Levels"], ["ice", "Iceberg"], ["stop", "Stop Runs"], ["sw", "Sweeps"], ["liq", "Thanh lý thật"]]],
    ["ĐẤU GIÁ", [["vwap", "VWAP ±σ"], ["dva", "POC/VAH/VAL động"], ["prof", "Profile phiên"], ["imb", "Stacked Imbalances"], ["fvg", "Fair Value Gaps"], ["lz", "Vùng thanh lý ước tính"]]],
  ];
  const LNAME = Object.fromEntries(LAYERS.flatMap((g) => g[1]));
  const VNAME = { bf: "Binance Futures", bs: "Binance Spot", hl: "Hyperliquid" };

  // ---------- settings ----------
  const DEF = { sym: "BTC", venue: "auto", tf: "5m", rowm: 1, bigm: "a", bigu: 0, imb: 3, tpod: 0, evf: "all",
    L: { fp: 1, vf: 1, cl: 1, big: 1, spv: 0, pat: 1, lvl: 1, ice: 1, stop: 1, sw: 1, liq: 1, vwap: 1, dva: 1, prof: 1, imb: 1, fvg: 1, lz: 1 } };
  const S = Object.assign({}, DEF, (() => { try { return JSON.parse(localStorage.getItem("lld-of")) || {}; } catch (e) { return {}; } })());
  S.L = Object.assign({}, DEF.L, S.L || {});
  const save = () => { try { localStorage.setItem("lld-of", JSON.stringify(S)); } catch (e) { /* private mode */ } };

  // ---------- exchanges ----------
  const BIN = {
    bf: { rest: "https://fapi.binance.com/fapi/v1", perK: 1500, pages: 100, gap: 650 },
    bs: { rest: "https://data-api.binance.vision/api/v3", perK: 1000, pages: 200, gap: 160 },
  };
  const bsym = (s) => s + "USDT";
  const kRow = (k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], bv: +k[9] });
  async function binK(v, sym, tf, n, start) {
    const B = BIN[v], out = [];
    let st = start;
    for (let i = 0; i < 8; i++) {
      const lim = Math.min(B.perK, n - out.length);
      if (lim <= 0) break;
      const r = await getJSON(`${B.rest}/klines?symbol=${bsym(sym)}&interval=${tf}&limit=${lim}` + (st != null ? `&startTime=${st}` : ""));
      if (!r.length) break;
      out.push(...r.map(kRow));
      if (st == null || r.length < lim) break;
      st = +r[r.length - 1][0] + 1;
    }
    return out;
  }
  const hlCoin = (s) => (isCrypto(s) ? s : "xyz:" + HL_XYZ[s]);
  async function hlK(sym, tf, from) {
    const r = await hlPost({ type: "candleSnapshot", req: { coin: hlCoin(sym), interval: tf, startTime: from, endTime: Date.now() + 6e4 } });
    return r.map((k) => ({ t: +k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v, bv: NaN }));
  }

  // ---------- state ----------
  let E = null, gen = 0, VENUE = null, socks = [], timers = [], lastMsg = 0, SESS = null, LZ = null, ZON = null, FV = null, CLU = null;
  let bf = { pages: 0, done: false, from: NaN, err: "" }, funding = null, loadErr = "", oiSrc = "";
  const V = { bw: innerWidth < 720 ? 62 : 110, off: 0, vz: 1, vy: 0 };
  let dirty = true;

  function stop() {
    gen++;
    for (const w of socks) { try { w.onclose = null; w.onerror = null; w.close(); } catch (e) { /* closed */ } }
    socks = []; timers.forEach(clearInterval); timers = [];
  }
  function every(ms, f) { timers.push(setInterval(f, ms)); }

  function venueFor(sym) { return S.venue !== "auto" ? (isCrypto(sym) ? S.venue : "hl") : isCrypto(sym) ? "bf" : "hl"; }

  async function load() {
    stop();
    const g = gen, sym = S.sym, tf = S.tf, tfMs = TFN[tf];
    E = null; SESS = LZ = ZON = FV = CLU = null; funding = null; loadErr = ""; oiSrc = "";
    bf = { pages: 0, done: false, from: NaN, err: "" };
    V.off = 0; V.vz = 1; V.vy = 0; dirty = true;
    setBusy(`Đang tải ${sym}…`);
    let order = [venueFor(sym)];
    if (isCrypto(sym)) for (const v of ["bf", "bs", "hl"]) if (!order.includes(v)) order.push(v);
    let kb = null;
    for (const v of order) {
      try {
        kb = v === "hl" ? await hlK(sym, tf, Date.now() - NBARS[tf] * tfMs) : await binK(v, sym, tf, NBARS[tf]);
        if (kb.length > 20) { VENUE = v; break; }
      } catch (e) { loadErr = `${VNAME[v]}: ${e.message}`; }
      if (g !== gen) return;
    }
    if (g !== gen) return;
    if (!kb || kb.length <= 20) { setBusy(`Không tải được ${sym}. ${loadErr}`); return; }
    loadErr = "";
    let rng = 0; const tail = kb.slice(-100); for (const b of tail) rng += b.h - b.l;
    const rs0 = C.niceStep(rng / tail.length / 8);
    E = new C.Engine({ tf: tfMs, rs: C.niceStep(rs0 * S.rowm), imbRatio: +S.imb, userBig: S.bigm === "f" ? +S.bigu || 0 : 0 });
    E.rs0 = rs0;
    E.loadBars(kb);
    calc(); dirty = true; setBusy("");
    renderAll();
    // 1-minute candles for VWAP, profile and TPO: today and the two days before (UTC)
    const d0 = Math.floor(Date.now() / C.DAY) * C.DAY - 2 * C.DAY;
    try {
      const m1 = VENUE === "hl" ? await hlK(sym, "1m", d0) : await binK(VENUE, sym, "1m", 4400, d0);
      if (g !== gen) return;
      E.loadM1(m1);
    } catch (e) { /* the session tools stay empty */ }
    // open interest: Binance Futures history for crypto (also when trades come from spot), Hyperliquid live
    if (VENUE !== "hl") {
      try {
        const per = tfMs >= 18e5 ? "30m" : tfMs >= 9e5 ? "15m" : "5m";
        const r = await getJSON(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${bsym(sym)}&period=${per}&limit=500`);
        if (g !== gen) return;
        E.setOI(r.map((x) => [+x.timestamp, +x.sumOpenInterest])); oiSrc = "Binance Futures";
      } catch (e) { /* live polling below still fills it */ }
    }
    if (g !== gen) return;
    open(g, sym);
    calc(); renderAll();
    if (VENUE !== "hl") backfill(g, sym);
    else { E.setBackfill([]); bf.done = true; bf.from = E.from; }
  }

  // trades from up to 4 hours ago, paged backwards; paced so the exchange's rate limit is never hit
  async function backfill(g, sym) {
    const B = BIN[VENUE], pages = [], goal = Date.now() - 4 * 3600e3;
    let fromId = null;
    for (let i = 0; i < B.pages; i++) {
      let r;
      try { r = await getJSON(`${B.rest}/aggTrades?symbol=${bsym(sym)}&limit=1000` + (fromId != null ? `&fromId=${fromId}` : "")); }
      catch (e) { bf.err = e.status === 429 || e.status === 418 ? "sàn giới hạn tốc độ, dừng tải thêm" : e.message; break; }
      if (g !== gen) return;
      if (!r.length) break;
      pages.unshift(r.map((x) => [+x.T, +x.p, +x.q, !x.m, +x.a]));
      bf.pages = i + 1; bf.from = +r[0].T;
      if (+r[0].T <= goal || +r[0].a === 0) break;
      fromId = Math.max(0, +r[0].a - 1000);
      if ((i + 1) % 25 === 0) { E.setBackfill([].concat(...pages)); calc(); dirty = true; }
      await sleep(B.gap);
      if (g !== gen) return;
    }
    if (g !== gen) return;
    E.setBackfill([].concat(...pages));
    bf.done = true; bf.from = E.from;
    calc(); dirty = true; renderAll();
  }

  function onTrade(t, p, q, b, id) { lastMsg = Date.now(); if (E && E.addTrade(t, p, q, b, id)) dirty = true; }
  function onBook(bids, asks) { lastMsg = Date.now(); if (!E) return; const P = (a) => a.slice(0, 20).map((x) => [+x[0], +x[1]]); E.setBook(P(bids), P(asks), Date.now()); dirty = true; }

  function ws(url, g, onMsg, onOpen) {
    let w;
    const go = () => {
      if (g !== gen) return;
      try { w = new WebSocket(url); } catch (e) { return; }
      socks.push(w);
      w.onopen = () => { if (onOpen) onOpen(w); };
      w.onmessage = (e) => { w.got = true; try { onMsg(JSON.parse(e.data)); } catch (err) { /* bad frame */ } };
      w.onclose = () => { const k = socks.indexOf(w); if (k >= 0) socks.splice(k, 1); if (g === gen) setTimeout(go, 3000); };
      w.onerror = () => { try { w.close(); } catch (e) { /* closed */ } };
    };
    go();
    return () => w;
  }

  function binMsg(x) {
    const d = x.data || x, st = x.stream || "";
    if (d.e === "aggTrade") onTrade(+d.T, +d.p, +d.q, !d.m, +d.a);
    else if (d.e === "forceOrder") { const o = d.o; lastMsg = Date.now(); if (E) { const k = `${o.T}|${o.ap}|${o.z}`; if (k !== binMsg.lk) { binMsg.lk = k; E.addLiq(+o.T, +o.ap || +o.p, +o.z || +o.q, o.S === "SELL"); dirty = true; } } }
    else if (st.includes("@depth") || d.lastUpdateId != null) onBook(d.bids || d.b || [], d.asks || d.a || []);
  }

  function open(g, sym) {
    const s = bsym(sym).toLowerCase();
    if (VENUE === "bs") ws(`wss://data-stream.binance.vision/stream?streams=${s}@aggTrade/${s}@depth20@100ms`, g, binMsg);
    else if (VENUE === "bf") {
      const a = ws(`wss://fstream.binance.com/market/stream?streams=${s}@aggTrade/${s}@forceOrder`, g, binMsg);
      const b = ws(`wss://fstream.binance.com/public/stream?streams=${s}@depth20@100ms`, g, binMsg);
      // older endpoint as a fallback if the split streams stay silent
      setTimeout(() => {
        if (g !== gen) return;
        const okA = a() && a().got, okB = b() && b().got;
        if (!okA || !okB) ws(`wss://fstream.binance.com/stream?streams=${[!okA && `${s}@aggTrade/${s}@forceOrder`, !okB && `${s}@depth20@100ms`].filter(Boolean).join("/")}`, g, binMsg);
      }, 10000);
    } else {
      const coin = hlCoin(sym), seen = new Set();
      ws("wss://api.hyperliquid.xyz/ws", g, (x) => {
        if (x.channel === "trades") {
          const arr = x.data.slice().sort((a, b) => a.time - b.time);
          for (const t of arr) { const id = t.tid ?? t.hash; if (seen.has(id)) continue; seen.add(id); onTrade(+t.time, +t.px, +t.sz, t.side === "B", null); }
          if (seen.size > 20000) seen.clear();
        } else if (x.channel === "l2Book") {
          const L = x.data.levels; onBook(L[0].map((l) => [l.px, l.sz]), L[1].map((l) => [l.px, l.sz]));
        }
      }, (w) => {
        w.send(JSON.stringify({ method: "subscribe", subscription: { type: "trades", coin } }));
        w.send(JSON.stringify({ method: "subscribe", subscription: { type: "l2Book", coin } }));
      });
      every(45000, () => { for (const w of socks) try { w.send(JSON.stringify({ method: "ping" })); } catch (e) { /* reconnects */ } });
    }
    // open interest and funding
    const pollOI = async () => {
      try {
        if (VENUE === "hl") {
          const coin = hlCoin(sym), r = await hlPost(isCrypto(sym) ? { type: "metaAndAssetCtxs" } : { type: "metaAndAssetCtxs", dex: "xyz" });
          const k = r[0].universe.findIndex((u) => u.name === coin || "xyz:" + u.name === coin);
          if (k >= 0 && g === gen && E) { const c = r[1][k]; E.addOI(Date.now(), +c.openInterest); funding = { rate: +c.funding, per: "1 giờ" }; oiSrc = "Hyperliquid (từ lúc mở trang)"; }
        } else {
          const [o, f] = await Promise.all([getJSON(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${bsym(sym)}`), getJSON(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${bsym(sym)}`)]);
          if (g === gen && E) { E.addOI(+o.time || Date.now(), +o.openInterest); funding = { rate: +f.lastFundingRate, per: "8 giờ", next: +f.nextFundingTime }; if (!oiSrc) oiSrc = "Binance Futures (từ lúc mở trang)"; }
        }
        dirty = true;
      } catch (e) { /* try again next round */ }
    };
    pollOI(); every(15000, pollOI);
    // deeper book every 15 s for DOM levels further from the price
    if (VENUE !== "hl") {
      const deep = async () => {
        try {
          const r = await getJSON(`${BIN[VENUE].rest}/depth?symbol=${bsym(sym)}&limit=500`);
          if (g === gen && E) { const P = (a) => a.map((x) => [+x[0], +x[1]]); E.setDeep(P(r.bids), P(r.asks), Date.now()); dirty = true; }
        } catch (e) { /* walls come from the top 20 levels */ }
      };
      deep(); every(15000, deep);
    }
  }

  // ---------- derived (recomputed every few seconds) ----------
  function calc() {
    if (!E) return;
    if (E.m1.length) {
      const rngs = new Map();
      for (const m of E.m1) { const d = Math.floor(m.t / C.DAY), r = rngs.get(d) || [Infinity, -Infinity]; r[0] = Math.min(r[0], m.l); r[1] = Math.max(r[1], m.h); rngs.set(d, r); }
      const dr = [...rngs.values()].map((r) => r[1] - r[0]).filter((x) => x > 0);
      const pr = C.niceStep((C.pctl(dr, 0.5) || E.bars[E.bars.length - 1].c * 0.02) / 70);
      SESS = E.session(pr);
    }
    LZ = E.oi.length ? E.liqZones() : null;
    ZON = E.stacked(3); FV = E.fvg(); CLU = E.clusters("vol", 0.985);
    const vs = E.bars.slice(-300).map((b) => b.v);
    E.vp90 = C.pctl(vs, 0.9); E.vp30 = C.pctl(vs, 0.3); E.vp80 = C.pctl(vs, 0.8);
    let cvd = 0; E.cvd = E.bars.map((B) => (cvd += E.delta(B).d));
  }

  // ---------- chart ----------
  const cv = $("cv"), ctx = cv.getContext("2d");
  let G = null, hover = null;
  const COL = { bg: "#05070a", grid: "#10161e", axis: "#6b7785", text: "#d6dde6", buy: "#22c55e", sell: "#f0524f", amber: "#ffb000", vw: "#c77dff", sw: "#22e3ff", stop: "#e879f9", ice: "#4aa8ff", ln: "#22c55e", sn: "#f0524f", sc: "#4aa8ff", lc: "#ffb000" };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  function draw() {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono, monospace";
    if (!E || !E.bars.length) { ctx.fillStyle = COL.axis; ctx.fillText(loadErr || "Đang tải dữ liệu…", 14, 24); return; }
    const bars = E.bars, n = bars.length, tf = E.tf, rs = E.rs, bw = V.bw;
    const axisW = W < 500 ? 58 : 66, profW = S.L.prof && SESS && SESS.prof && W >= 500 ? Math.min(110, Math.round(W * 0.14)) : 0, xR = W - axisW - profW;
    const tH = 18, ph = W < 600 ? 46 : 58, hasOI = E.oi.length > 1;
    const panes = ["delta", "cvd"].concat(hasOI ? ["oi"] : []);
    const mainH = H - tH - panes.length * ph, top = 6;
    V.off = clamp(V.off, 0, Math.max(0, n - 3));
    const xc = (i) => xR - bw * 0.9 - (n - 1 - i - V.off) * bw;
    const i0 = Math.max(0, Math.floor(n - 1 - V.off - (xR + bw) / bw)), i1 = Math.min(n - 1, Math.ceil(n - 1 - V.off + 1));
    const xt = (t) => { const i = E.idx.get(Math.floor(t / tf) * tf); if (i === undefined) return NaN; return xc(i) - bw / 2 + ((t - bars[i].t) / tf) * bw; };
    let hi = -Infinity, lo = Infinity;
    for (let i = i0; i <= i1; i++) { if (bars[i].h > hi) hi = bars[i].h; if (bars[i].l < lo) lo = bars[i].l; }
    if (!(hi > lo)) { hi = bars[n - 1].c * 1.001; lo = bars[n - 1].c * 0.999; }
    const pad = (hi - lo) * 0.06; hi += pad; lo -= pad;
    if (V.vz !== 1 || V.vy) {   // vertical zoom around the last price (or the middle of the view when looking back)
      const ctr = (V.off < 1 ? bars[n - 1].c : (hi + lo) / 2) + V.vy, half = (hi - lo) / 2 / V.vz;
      hi = ctr + half; lo = ctr - half;
    }
    const y = (p) => top + (hi - p) / (hi - lo) * (mainH - top);
    const pAt = (yy) => hi - (yy - top) / (mainH - top) * (hi - lo);
    G = { xc, xt, y, pAt, i0, i1, xR, mainH, top, ph, panes, tH, W, H, bw, hi, lo, axisW, profW };

    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, xR, mainH); ctx.clip();
    // grid
    const step = C.niceStep((hi - lo) / 7);
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
    for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) { ctx.beginPath(); ctx.moveTo(0, Math.round(y(p)) + 0.5); ctx.lineTo(xR, Math.round(y(p)) + 0.5); ctx.stroke(); }
    // estimated liquidation zones: one hue, darker = more positions would be liquidated there
    if (S.L.lz && LZ && isFinite(LZ.zr)) {
      let mx = 0; for (const v of LZ.long.values()) mx = Math.max(mx, v); for (const v of LZ.short.values()) mx = Math.max(mx, v);
      for (const [M] of [[LZ.long], [LZ.short]]) for (const [k, v] of M) {
        const p0 = k * LZ.zr, p1 = p0 + LZ.zr; if (p1 < lo || p0 > hi || v < mx * 0.04) continue;
        const sw = Math.min(170, xR * 0.25); ctx.fillStyle = rgba(COL.amber, 0.06 + 0.5 * v / mx); ctx.fillRect(xR - sw, y(p1), sw, Math.max(1, y(p0) - y(p1)));
      }
    }
    // fair value gaps
    if (S.L.fvg && FV) for (const g of FV) {
      if (g.end != null && g.end < i0) continue; if (g.i > i1) continue;
      const x0 = xc(g.i) - bw / 2, x1 = g.end != null ? xc(g.end) : xR;
      ctx.fillStyle = g.dir === 1 ? "rgba(74,168,255,.12)" : "rgba(199,125,255,.12)";
      ctx.fillRect(x0, y(g.hi), x1 - x0, Math.max(1, y(g.lo) - y(g.hi)));
    }
    // stacked imbalance zones
    if (S.L.imb && ZON) for (const z of ZON) {
      if (z.end != null && z.end < i0) continue; if (z.i > i1) continue;
      const x0 = xc(z.i) - bw / 2, x1 = z.end != null ? xc(z.end) : xR;
      ctx.fillStyle = z.dir === 1 ? "rgba(34,197,94,.16)" : "rgba(240,82,79,.16)";
      ctx.fillRect(x0, y(z.hi), x1 - x0, Math.max(1, y(z.lo) - y(z.hi)));
      ctx.strokeStyle = z.dir === 1 ? "rgba(34,197,94,.6)" : "rgba(240,82,79,.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y(z.hi) + 0.5, x1 - x0, Math.max(1, y(z.lo) - y(z.hi)));
    }
    // session lines: VWAP with bands, developing POC/VAH/VAL
    if (SESS && (S.L.vwap || S.L.dva)) {
      const line = (get, color, w, dash) => {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath();
        let pen = false, pd = -1;
        for (let i = i0; i <= i1; i++) {
          const B = bars[i], te = Math.min(B.t + tf, Math.floor(Date.now() / 6e4) * 6e4 + 6e4);
          const mi = E.m1At(te) ?? (i === n - 1 ? E.m1.length - 1 : undefined);
          const v = mi === undefined ? NaN : get(mi), d = Math.floor(B.t / C.DAY);
          if (!isFinite(v) || d !== pd) pen = false;
          pd = d;
          if (!isFinite(v)) continue;
          const x0 = xc(i) - bw / 2, x1 = xc(i) + bw / 2, yy = y(v);
          if (!pen) { ctx.moveTo(x0, yy); pen = true; } else ctx.lineTo(x0, yy);
          ctx.lineTo(x1, yy);
        }
        ctx.stroke(); ctx.setLineDash([]);
      };
      if (S.L.vwap) {
        for (const [k, a] of [[3, 0.25], [2, 0.4], [1, 0.55]]) { line((m) => SESS.vw[m] + k * SESS.sd[m], rgba(COL.vw, a), 1, [4, 4]); line((m) => SESS.vw[m] - k * SESS.sd[m], rgba(COL.vw, a), 1, [4, 4]); }
        line((m) => SESS.vw[m], COL.vw, 2);
      }
      if (S.L.dva) {
        const vaOf = (m) => { for (let j = m; j >= Math.max(0, m - 30); j--) { const v = SESS.va.get(j); if (v) return v; } return null; };
        line((m) => (vaOf(m) || {}).vah, "rgba(214,221,230,.55)", 1, [2, 3]);
        line((m) => (vaOf(m) || {}).val, "rgba(214,221,230,.55)", 1, [2, 3]);
        line((m) => (vaOf(m) || {}).poc, COL.amber, 1.5);
      }
    }
    // bars
    const fpMode = S.L.fp && bw >= 56;
    for (let i = i0; i <= i1; i++) {
      const B = bars[i], x = xc(i);
      const vfHi = S.L.vf && B.v >= E.vp90, vfLo = S.L.vf && B.v <= E.vp30;
      if (fpMode && B.fp && B.fp.size && drawFoot(B, x, bw, y, rs)) { if (vfHi) { ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.5; ctx.strokeRect(x - bw / 2 + 2, y(B.h + rs), bw - 4, y(B.l) - y(B.h + rs)); } continue; }
      const up = B.c >= B.o, col = up ? COL.buy : COL.sell;
      ctx.globalAlpha = vfLo ? 0.4 : 1;
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, y(B.h)); ctx.lineTo(Math.round(x) + 0.5, y(B.l)); ctx.stroke();
      const bwid = Math.max(1, Math.min(bw * 0.62, 26)), yt = y(Math.max(B.o, B.c)), yb = y(Math.min(B.o, B.c));
      ctx.fillStyle = col; ctx.fillRect(x - bwid / 2, yt, bwid, Math.max(1, yb - yt));
      if (vfHi) { ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.5; ctx.strokeRect(x - bwid / 2 - 2, yt - 2, bwid + 4, Math.max(1, yb - yt) + 4); }
      ctx.globalAlpha = 1;
    }
    // cluster search
    if (S.L.cl && CLU) {
      ctx.strokeStyle = COL.amber; ctx.lineWidth = 1.5;
      for (const c of CLU) { if (c.i < i0 || c.i > i1) continue; const r = fpMode ? Math.min(bw / 2 - 4, 14) : clamp(bw * 0.4, 3, 7); ctx.beginPath(); ctx.arc(xc(c.i), y(c.p), r, 0, 7); ctx.stroke(); }
    }
    const tmin = bars[i0].t, tmax = bars[i1].t + tf;
    const vis = (arr) => arr.filter((e) => e.t >= tmin && e.t < tmax);
    // big trades
    if (S.L.big) {
      const thr = S.bigm === "f" ? E.thrF : E.thrA;
      const L = vis(E.big).filter((e) => (S.bigm === "f" ? e.f : e.a)).slice(-500);
      for (const e of L) {
        const x = xt(e.t); if (!isFinite(x)) continue;
        const r = clamp(2.5 + 3 * Math.sqrt(e.n / (isFinite(thr) ? thr : e.n)), 3, 18);
        ctx.beginPath(); ctx.arc(x, y(e.p), r, 0, 7);
        ctx.fillStyle = rgba(e.b ? COL.buy : COL.sell, 0.55); ctx.fill();
        ctx.strokeStyle = COL.bg; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    if (S.L.sw) for (const e of vis(E.sweeps).slice(-300)) {
      const x = xt(e.t); if (!isFinite(x)) continue;
      ctx.strokeStyle = COL.sw; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y(e.p0)); ctx.lineTo(x, y(e.p1)); ctx.stroke();
      const yy = y(e.p1), d = e.b ? -1 : 1;
      ctx.fillStyle = COL.sw; ctx.beginPath(); ctx.moveTo(x - 4, yy - 4 * d); ctx.lineTo(x + 4, yy - 4 * d); ctx.lineTo(x, yy + 2 * d); ctx.fill();
    }
    if (S.L.spv) for (const e of vis(E.steps).slice(-300)) {
      const x = xt(e.t); if (!isFinite(x)) continue;
      ctx.fillStyle = rgba(e.dir > 0 ? COL.buy : COL.sell, 0.9); ctx.fillRect(x - 2, y(e.p) - 2, 4, 4);
      if (bw >= 40) { ctx.fillStyle = COL.text; ctx.font = "9px JetBrains Mono, monospace"; ctx.fillText(fq(e.q), x + 4, y(e.p) + 3); }
    }
    if (S.L.pat) for (const e of vis(E.patts)) {
      const x = xt(e.t); if (!isFinite(x)) continue;
      ctx.fillStyle = "#c77dff"; ctx.beginPath(); ctx.arc(x, y(e.p), 6, 0, 7); ctx.fill();
      ctx.fillStyle = "#000"; ctx.font = "bold 9px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.fillText("A", x, y(e.p) + 3); ctx.textAlign = "left";
    }
    if (S.L.ice) for (const e of vis(E.ices)) {
      const x = xt(e.t); if (!isFinite(x)) continue;
      ctx.strokeStyle = COL.ice; ctx.lineWidth = 2; ctx.strokeRect(x - 5, y(e.p) - 5, 10, 10);
      ctx.fillStyle = COL.ice; ctx.font = "bold 9px JetBrains Mono, monospace"; ctx.fillText("I", x - 2.5, y(e.p) + 3);
    }
    if (S.L.stop) for (const e of vis(E.stops)) {
      const x = xt(e.t); if (!isFinite(x)) continue;
      const yy = y(e.p);
      ctx.fillStyle = COL.stop; ctx.beginPath(); ctx.moveTo(x, yy - 7); ctx.lineTo(x + 7, yy); ctx.lineTo(x, yy + 7); ctx.lineTo(x - 7, yy); ctx.fill();
      ctx.strokeStyle = rgba(COL.stop, 0.6); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x - bw * 3, y(e.lvl)); ctx.lineTo(x, y(e.lvl)); ctx.stroke(); ctx.setLineDash([]);
      if (bw >= 24) { ctx.fillStyle = COL.stop; ctx.font = "bold 9px JetBrains Mono, monospace"; ctx.fillText("STOP RUN", x + 9, yy + (e.b ? -6 : 12)); }
    }
    if (S.L.liq && E.liqs.length) {
      const big = C.pctl(E.liqs.map((l) => l.n), 0.8) || 1;
      for (const e of vis(E.liqs)) {
        const x = xt(e.t); if (!isFinite(x)) continue;
        const r = clamp(3 + 4 * Math.sqrt(e.n / big), 3, 12), yy = y(e.p);
        ctx.strokeStyle = e.long ? "#ff8a3d" : "#7dd3fc"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - r, yy - r); ctx.lineTo(x + r, yy + r); ctx.moveTo(x + r, yy - r); ctx.lineTo(x - r, yy + r); ctx.stroke();
      }
    }
    // DOM levels: big resting orders, drawn from when they appeared
    if (S.L.lvl && E.walls.size && V.off < 1) {
      const W2 = [...E.walls.values()].filter((w) => Date.now() - w.since > 4000 && w.p > lo && w.p < hi);
      const top6 = (b) => W2.filter((w) => w.b === b).sort((a, c) => c.q - a.q).slice(0, 6);
      const L = top6(true).concat(top6(false)), mq = Math.max(1, ...L.map((w) => w.q));
      for (const w of L) {
        const x0 = Math.max(0, isFinite(xt(w.since)) ? xt(w.since) : 0), yy = Math.round(y(w.p)) + 0.5;
        ctx.strokeStyle = rgba(w.b ? COL.buy : COL.sell, 0.85); ctx.lineWidth = 1 + 3 * w.q / mq; ctx.setLineDash([6, 3]);
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(xR, yy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = COL.text; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "right"; ctx.fillText(fq(w.q), xR - 4, yy - 3); ctx.textAlign = "left";
      }
    }
    // last price
    const last = bars[n - 1].c, yl = Math.round(y(last)) + 0.5;
    ctx.strokeStyle = rgba(COL.amber, 0.7); ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, yl); ctx.lineTo(xR, yl); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    // session volume profile
    if (profW && SESS && SESS.prof) {
      const x0 = xR + 2, pr = SESS.pr;
      let mx = 0; for (const v of SESS.prof.values()) mx = Math.max(mx, v);
      const va = SESS.va.get(E.m1.length - 1) || null;
      for (const [k, v] of SESS.prof) {
        const p0 = k * pr, p1 = p0 + pr; if (p1 < lo || p0 > hi) continue;
        const inVA = va && p0 >= va.val - 1e-9 && p1 <= va.vah + 1e-9, isP = va && Math.abs((k + 0.5) * pr - va.poc) < pr / 2;
        ctx.fillStyle = isP ? COL.amber : inVA ? "rgba(74,168,255,.55)" : "rgba(107,119,133,.45)";
        const yy = y(p1), hh = Math.max(1, y(p0) - y(p1) - 1);
        ctx.fillRect(x0, yy, (profW - 6) * v / mx, hh);
      }
      ctx.fillStyle = COL.axis; ctx.font = "10px JetBrains Mono, monospace"; ctx.fillText("Profile hôm nay", x0, mainH - 4);
    }
    // price axis
    ctx.fillStyle = "#000"; ctx.fillRect(W - axisW, 0, axisW, mainH);
    ctx.fillStyle = COL.axis; ctx.font = "10.5px JetBrains Mono, monospace";
    for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) ctx.fillText(fP(p), W - axisW + 4, y(p) + 4);
    ctx.fillStyle = COL.amber; ctx.fillRect(W - axisW, yl - 8, axisW, 16); ctx.fillStyle = "#000"; ctx.font = "bold 10.5px JetBrains Mono, monospace"; ctx.fillText(fP(last), W - axisW + 4, yl + 4);

    // panes
    let py = mainH;
    for (const pn of panes) {
      ctx.strokeStyle = "#1c232d"; ctx.beginPath(); ctx.moveTo(0, py + 0.5); ctx.lineTo(W, py + 0.5); ctx.stroke();
      const vals = [];
      for (let i = i0; i <= i1; i++) vals.push(pn === "delta" ? E.delta(bars[i]).d : pn === "cvd" ? (E.cvd ? E.cvd[i] : NaN) : E.dOI(i));
      const fin = vals.filter(isFinite);
      if (pn === "cvd") {
        const a = Math.min(...fin), b = Math.max(...fin), yy = (v) => py + 4 + (b - v) / ((b - a) || 1) * (ph - 8);
        ctx.strokeStyle = COL.text; ctx.lineWidth = 1.5; ctx.beginPath();
        let pen = false;
        for (let i = i0; i <= i1; i++) { const v = vals[i - i0]; if (!isFinite(v)) continue; const x = xc(i); if (!pen) { ctx.moveTo(x, yy(v)); pen = true; } else ctx.lineTo(x, yy(v)); }
        ctx.stroke();
      } else {
        const m = Math.max(1e-12, ...fin.map(Math.abs)), z = py + ph / 2;
        ctx.strokeStyle = "#1c232d"; ctx.beginPath(); ctx.moveTo(0, z + 0.5); ctx.lineTo(xR, z + 0.5); ctx.stroke();
        for (let i = i0; i <= i1; i++) {
          const v = vals[i - i0]; if (!isFinite(v)) continue;
          const hh = (v / m) * (ph / 2 - 4), x = xc(i), wd = Math.max(1, bw * 0.62);
          let col;
          if (pn === "delta") { col = v >= 0 ? COL.buy : COL.sell; ctx.globalAlpha = E.delta(bars[i]).est ? 0.4 : 1; }
          else col = COL[(E.regime(i) || "ln").toLowerCase()] || COL.axis;
          ctx.fillStyle = col; ctx.fillRect(x - wd / 2, hh >= 0 ? z - hh : z, wd, Math.max(1, Math.abs(hh))); ctx.globalAlpha = 1;
          if (pn === "delta" && bw >= 56) { ctx.fillStyle = COL.text; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.fillText(fq(v), x, v >= 0 ? z + 12 : z - 4); ctx.textAlign = "left"; }
        }
      }
      ctx.fillStyle = COL.axis; ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(pn === "delta" ? "DELTA (mua − bán chủ động)" : pn === "cvd" ? "CVD (delta cộng dồn)" : "ΔOI theo nến", 6, py + 12);
      if (pn !== "cvd") { ctx.fillText(fq(Math.max(...fin.map(Math.abs))), W - axisW + 4, py + 12); }
      py += ph;
    }
    // time axis
    ctx.fillStyle = COL.axis; ctx.font = "10px JetBrains Mono, monospace";
    const every_ = Math.max(1, Math.ceil(90 / bw));
    for (let i = i0; i <= i1; i++) {
      if ((bars[i].t / tf) % every_ !== 0) continue;
      const x = xc(i); if (x < 20 || x > xR - 20) continue;
      const nd = i > 0 && Math.floor((bars[i].t + VN) / C.DAY) !== Math.floor((bars[i - 1].t + VN) / C.DAY);
      ctx.textAlign = "center"; ctx.fillText(nd ? fDM(bars[i].t) : fHM(bars[i].t), x, H - 5); ctx.textAlign = "left";
    }
    // crosshair
    if (hover && hover.x < xR) {
      ctx.strokeStyle = "rgba(214,221,230,.35)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hover.x + 0.5, 0); ctx.lineTo(hover.x + 0.5, H - tH); ctx.stroke();
      if (hover.y < mainH) { ctx.beginPath(); ctx.moveTo(0, hover.y + 0.5); ctx.lineTo(xR, hover.y + 0.5); ctx.stroke(); ctx.fillStyle = "#39424f"; ctx.fillRect(W - axisW, hover.y - 8, axisW, 16); ctx.fillStyle = COL.text; ctx.fillText(fP(pAt(hover.y)), W - axisW + 4, hover.y + 4); }
      ctx.setLineDash([]);
    }
  }

  function drawFoot(B, x, bw, y, rs) {
    const k0 = Math.floor(B.l / rs + 1e-9), k1 = Math.floor(B.h / rs + 1e-9);
    const hh = y(k0 * rs) - y((k0 + 1) * rs);
    if (hh < 2.5 || k1 - k0 > 400) return false;
    let mv = 0; for (const c of B.fp.values()) mv = Math.max(mv, c[0] + c[1]);
    const im = E.imbalances(B), poc = E.barPOC(B);
    const xl = x - bw / 2 + 6, wd = bw - 9;
    const fs = Math.min(11, Math.floor(hh - 1));
    // candle strip on the left edge
    const up = B.c >= B.o;
    ctx.fillStyle = up ? COL.buy : COL.sell;
    ctx.fillRect(x - bw / 2 + 2, y(Math.max(B.o, B.c)), 2.5, Math.max(1, y(Math.min(B.o, B.c)) - y(Math.max(B.o, B.c))));
    ctx.fillRect(x - bw / 2 + 2.75, y(B.h), 1, y(B.l) - y(B.h));
    for (let k = k0; k <= k1; k++) {
      const c = B.fp.get(k) || [0, 0], v = c[0] + c[1], y1 = y((k + 1) * rs), y0 = y(k * rs);
      const a = v ? 0.07 + 0.5 * v / mv : 0.03;
      ctx.fillStyle = c[1] >= c[0] ? `rgba(34,197,94,${a})` : `rgba(240,82,79,${a})`;
      ctx.fillRect(xl, y1 + 0.5, wd, Math.max(1, y0 - y1 - 1));
      if (k === poc) { ctx.strokeStyle = COL.amber; ctx.lineWidth = 1; ctx.strokeRect(xl + 0.5, y1 + 0.5, wd - 1, Math.max(1, y0 - y1 - 1)); }
      if (fs >= 8) {
        const ym = (y0 + y1) / 2 + fs * 0.35;
        ctx.font = `${fs}px JetBrains Mono, monospace`;
        const si = im && im.sell.has(k), bi = im && im.buy.has(k);
        ctx.textAlign = "right"; ctx.fillStyle = si ? "#ff7b78" : "rgba(214,221,230,.85)"; if (si) ctx.font = `bold ${fs}px JetBrains Mono, monospace`;
        ctx.fillText(fq(c[0]), x - 3, ym);
        ctx.font = `${fs}px JetBrains Mono, monospace`; ctx.textAlign = "center"; ctx.fillStyle = "#4a5563"; ctx.fillText("×", x + 1, ym);
        ctx.textAlign = "left"; ctx.fillStyle = bi ? "#5ee38c" : "rgba(214,221,230,.85)"; if (bi) ctx.font = `bold ${fs}px JetBrains Mono, monospace`;
        ctx.fillText(fq(c[1]), x + 5, ym);
        ctx.textAlign = "left";
      }
    }
    return true;
  }

  // ---------- tooltip & interaction ----------
  const tip = $("tip");
  function showTip(cx, cy) {
    if (!G || !E) return;
    const r = cv.getBoundingClientRect(), x = cx - r.left, yy = cy - r.top;
    hover = { x, y: yy }; dirty = true;
    const n = E.bars.length, i = Math.round(n - 1 - V.off - (G.xR - G.bw * 0.9 - x) / G.bw);
    if (i < 0 || i >= n || x > G.xR) { tip.style.display = "none"; return; }
    const B = E.bars[i], d = E.delta(B), doi = E.dOI(i), rg = E.regime(i);
    const RG = { LN: "long mới vào", SN: "short mới vào", SC: "short đóng lệnh", LC: "long đóng lệnh" };
    let cell = "";
    if (B.fp && yy < G.mainH) { const k = Math.floor(G.pAt(yy) / E.rs + 1e-9), c = B.fp.get(k); if (c) cell = `<br>Ô ${fP(k * E.rs)}: bán <b>${fq(c[0])}</b> × mua <b>${fq(c[1])}</b>`; }
    tip.innerHTML = `<b>${fDM(B.t)} ${fHM(B.t)}</b> · ${S.tf}<br>O ${fP(B.o)} H ${fP(B.h)} L ${fP(B.l)} C ${fP(B.c)}<br>KL <b>${fq(B.v)}</b> · mua ${fq(isFinite(B.bv) ? B.bv : NaN)} · bán ${fq(isFinite(B.sv) ? B.sv : NaN)}<br>Delta <b>${fq(d.d)}</b>${d.est ? " (ước tính)" : ""}` +
      (B.cov ? ` · max ${fq(B.dmax)} · min ${fq(B.dmin)}<br>${B.n} lệnh · nhanh nhất ${B.spd} lệnh/giây` : "") +
      (isFinite(doi) ? `<br>ΔOI <b>${fq(doi)}</b>${rg ? " · " + RG[rg] : ""}` : "") + cell;
    tip.style.display = "block";
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.min(innerWidth - tw - 8, cx + 14) + "px";
    tip.style.top = Math.max(8, Math.min(innerHeight - th - 8, cy + 14)) + "px";
  }
  let drag = null;
  cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, off: V.off, vy: V.vy, moved: false, id: e.pointerId }; });
  cv.addEventListener("pointermove", (e) => {
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) > 4 || (e.pointerType === "mouse" && Math.abs(dy) > 4)) { drag.moved = true; V.off = Math.max(0, drag.off + dx / V.bw); if (e.pointerType === "mouse" && G) V.vy = drag.vy + dy * (G.hi - G.lo) / G.mainH; dirty = true; tip.style.display = "none"; hover = null; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } return; }
    }
    if (e.pointerType === "mouse") showTip(e.clientX, e.clientY);
  });
  const up = (e) => { if (drag && !drag.moved && e.type === "pointerup") showTip(e.clientX, e.clientY); drag = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hover = null; tip.style.display = "none"; dirty = true; } });
  cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  function zoom(f) { V.bw = clamp(V.bw * f, 3, 220); dirty = true; tip.style.display = "none"; }
  $("zin").onclick = () => zoom(1.3); $("zout").onclick = () => zoom(1 / 1.3);
  // full screen: the browser's own when it allows it (desktop, Android), otherwise the panel fills the window (iPhone)
  const fsBtn = $("fs"), cp = $("chartp");
  const fsOn = () => document.fullscreenElement === cp || cp.classList.contains("fs");
  const fsLabel = () => { fsBtn.textContent = fsOn() ? "✕ Thoát toàn màn hình" : "⛶ Toàn màn hình"; dirty = true; };
  fsBtn.onclick = async () => {
    if (fsOn()) { if (document.fullscreenElement) await document.exitFullscreen().catch(() => {}); cp.classList.remove("fs"); document.body.style.overflow = ""; }
    else {
      let ok = false;
      if (cp.requestFullscreen) { try { await cp.requestFullscreen(); ok = true; } catch (e) { /* not allowed here */ } }
      if (!ok) { cp.classList.add("fs"); document.body.style.overflow = "hidden"; }
    }
    fsLabel();
  };
  document.addEventListener("fullscreenchange", fsLabel);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && cp.classList.contains("fs")) { cp.classList.remove("fs"); document.body.style.overflow = ""; fsLabel(); } });
  $("znow").onclick = () => { V.off = 0; V.vz = 1; V.vy = 0; dirty = true; };
  $("vin").onclick = () => { V.vz = clamp(V.vz * 1.4, 0.3, 30); dirty = true; };
  $("vout").onclick = () => { V.vz = clamp(V.vz / 1.4, 0.3, 30); dirty = true; };

  // ---------- panels ----------
  function setBusy(t) { $("stat").innerHTML = t ? `<span class="busy">${esc(t)}</span>` : ""; if (!t) renderStat(); }
  function renderStat() {
    if (!E) return;
    const age = Date.now() - lastMsg, live = lastMsg && age < 10000;
    const cover = isFinite(E.from) && E.from < Infinity ? `footprint từ ${fHM(E.from)}` : "footprint đang tải";
    const prog = !bf.done && VENUE !== "hl" ? ` · đang nạp lệnh khớp cũ: ${bf.pages} trang${isFinite(bf.from) ? ", tới " + fHM(bf.from) : ""}` : "";
    $("stat").innerHTML = `<span class="ld ${live ? "ok" : "bad"}"></span><span>${live ? "Trực tiếp" : lastMsg ? "Mất kết nối, đang nối lại" : "Đang kết nối"}</span>` +
      `<span>Nguồn <b>${VNAME[VENUE] || "–"}</b></span><span>${cover}${prog}</span><span><b>${E.T.length.toLocaleString("en-US")}</b> lệnh khớp trong bộ nhớ</span>` +
      (bf.err ? `<span class="amber">${esc(bf.err)}</span>` : "") + (oiSrc ? `<span>OI: ${esc(oiSrc)}</span>` : "");
  }
  function renderConfirm() {
    const on = Object.keys(S.L).filter((k) => S.L[k]).map((k) => LNAME[k]);
    $("confirm").innerHTML = `<b>✓ Đang xem:</b> ${esc(S.sym)} trên ${VNAME[VENUE] || VNAME[venueFor(S.sym)]} · khung ${S.tf} · mỗi ô ${E ? fP(E.rs).replace(/\.?0+$/, "") : "…"} giá · Big trades ${S.bigm === "f" ? "cố định" + (+S.bigu ? " " + fUsd(+S.bigu) : " (tự động)") : "thích ứng"} · imbalance ×${S.imb} · <b>${on.length}</b> lớp đang bật: ${esc(on.join(", "))}`;
    $("h-chart").textContent = `FOOTPRINT ${S.sym} · ${S.tf}`;
  }
  let toastT = 0;
  function confirmMsg(msg) {
    const t = $("toast");
    t.innerHTML = `<b>✓ Đã áp dụng:</b> ${msg}`; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 3000);
    renderConfirm(); save();
  }

  function renderLegend() {
    const it = [];
    if (S.L.fp) it.push(`<span>Ô footprint: <b>bán × mua</b> chủ động, nền xanh/đỏ = bên thắng, khung vàng = POC của nến, số đậm = imbalance</span>`);
    if (S.L.vf) it.push(`<span><i style="border:2px solid var(--amber);background:none"></i>Volume Filter: 10% nến khối lượng lớn nhất</span>`);
    if (S.L.cl) it.push(`<span><i style="border:2px solid var(--amber);border-radius:50%;background:none"></i>Cluster Search: ô khớp nhiều bất thường</span>`);
    if (S.L.big) it.push(`<span><i style="background:var(--buy);border-radius:50%"></i><i style="background:var(--sell);border-radius:50%"></i>Big Trades mua / bán</span>`);
    if (S.L.sw) it.push(`<span><i class="ln" style="background:var(--sw)"></i>Sweep (ăn ≥3 mức giá)</span>`);
    if (S.L.stop) it.push(`<span><i style="background:var(--stop);transform:rotate(45deg)"></i>Stop run</span>`);
    if (S.L.ice) it.push(`<span><i style="border:2px solid var(--ice);background:none"></i>Iceberg</span>`);
    if (S.L.pat) it.push(`<span><i style="background:var(--pat);border-radius:50%"></i>Tape pattern (thuật toán)</span>`);
    if (S.L.liq) it.push(`<span><b style="color:#ff8a3d">✕</b> long bị thanh lý · <b style="color:#7dd3fc">✕</b> short bị thanh lý</span>`);
    if (S.L.spv) it.push(`<span><i style="background:var(--buy)"></i>Spread volume</span>`);
    if (S.L.lvl) it.push(`<span><i class="ln" style="background:var(--buy)"></i><i class="ln" style="background:var(--sell)"></i>DOM Level đặt mua / bán</span>`);
    if (S.L.vwap) it.push(`<span><i class="ln" style="background:#c77dff"></i>VWAP, nét đứt ±1σ ±2σ ±3σ</span>`);
    if (S.L.dva) it.push(`<span><i class="ln" style="background:var(--amber)"></i>POC động · <i class="ln" style="background:#9aa3ad"></i>VAH/VAL động</span>`);
    if (S.L.imb) it.push(`<span><i style="background:rgba(34,197,94,.4)"></i><i style="background:rgba(240,82,79,.4)"></i>Stacked imbalance hỗ trợ / kháng cự</span>`);
    if (S.L.fvg) it.push(`<span><i style="background:rgba(74,168,255,.35)"></i><i style="background:rgba(199,125,255,.35)"></i>FVG tăng / giảm</span>`);
    if (S.L.lz) it.push(`<span><i style="background:rgba(255,176,0,.35)"></i>Vùng thanh lý ước tính, dải bên phải (đậm = dày)</span>`);
    $("legend").innerHTML = it.join("");
  }

  function renderLadder() {
    const bk = E && E.book;
    if (!bk) { $("lad").innerHTML = `<tr><td class="dim" style="text-align:left">Đang chờ sổ lệnh…</td></tr>`; $("pw").innerHTML = ""; return; }
    const now = Date.now(), tv = new Map();
    for (let i = E.T.length - 1; i >= 0 && E.T[i] > now - 3e5; i--) { const c = tv.get(E.P[i]) || [0, 0]; c[E.Bu[i]] += E.Q[i]; tv.set(E.P[i], c); }
    const walls = new Set([...E.walls.values()].map((w) => w.p));
    const ices = new Set(E.ices.filter((e) => now - (e.tl || e.t) < 12e4).map((e) => e.p));
    const asks = bk.a.slice(0, 12).reverse(), bids = bk.b.slice(0, 12);
    const mq = Math.max(...asks.map((x) => x[1]), ...bids.map((x) => x[1]), 1e-12);
    const row = (p, q, side, mid) => {
      const t = tv.get(p), w = (100 * q / mq).toFixed(0);
      const cls = [walls.has(p) ? "wall" : "", ices.has(p) ? "ice" : "", mid ? "mid" : ""].join(" ");
      return `<tr class="${cls}"><td class="tv">${t ? fq(t[0]) : ""}</td><td class="bq">${side ? `<div class="bar" style="width:${w}%"></div><span>${fq(q)}</span>` : ""}</td><td class="px">${fP(p)}</td><td class="aq">${side ? "" : `<div class="bar" style="width:${w}%"></div><span>${fq(q)}</span>`}</td><td class="tv" style="text-align:left">${t ? fq(t[1]) : ""}</td></tr>`;
    };
    $("lad").innerHTML = `<tr><td class="tv">đã bán</td><td class="dim" style="font-size:10px">chờ mua</td><td class="px dim" style="font-size:10px">giá</td><td class="dim" style="font-size:10px;text-align:left">chờ bán</td><td class="tv" style="text-align:left">đã mua</td></tr>` +
      asks.map((x) => row(x[0], x[1], 0, false)).join("") + bids.map((x, k) => row(x[0], x[1], 1, k === 0)).join("");
    const P = E.pow[E.pow.length - 1];
    if (P) {
      const b = (P[1] + 1) / 2;
      $("pw").innerHTML = `<div style="flex:${b};background:var(--buy)">Mua ${(b * 100).toFixed(0)}%</div><div style="flex:${1 - b};background:var(--sell)">Bán ${((1 - b) * 100).toFixed(0)}%</div>`;
      $("pw-l").textContent = `DOM Power: tiền đặt mua so với đặt bán trong 20 mức giá gần nhất` + (E.deep && now - E.deep.t < 30000 ? ` · trong ±1% giá: mua ${(50 + 50 * E.deep.pw).toFixed(0)}%` : "");
    }
    // DOM power over the last 10 minutes
    const c = $("pwc"), g = c.getContext("2d"), dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    const L = E.pow.filter((p) => p[0] > now - 6e5);
    g.strokeStyle = "#1c232d"; g.beginPath(); g.moveTo(0, H / 2 + 0.5); g.lineTo(W, H / 2 + 0.5); g.stroke();
    for (const p of L) { const x = (p[0] - (now - 6e5)) / 6e5 * W, h = p[1] * (H / 2 - 2); g.fillStyle = p[1] >= 0 ? COL.buy : COL.sell; g.fillRect(x, h >= 0 ? H / 2 - h : H / 2, Math.max(1, W / 600), Math.abs(h)); }
    g.fillStyle = COL.axis; g.font = "10px JetBrains Mono, monospace"; g.fillText("DOM Power 10 phút qua", 4, 11);
  }

  function renderTape() {
    if (!E) return;
    const now = Date.now(), ns = Math.floor(now / 1000);
    let n10 = 0, v10 = 0, vb60 = 0, v60 = 0;
    for (let s = ns - 10; s < ns; s++) { const x = E.secs.get(s); if (x) { n10 += x.nb + x.ns; v10 += x.vb + x.vs; } }
    for (let s = ns - 60; s < ns; s++) { const x = E.secs.get(s); if (x) { vb60 += x.vb; v60 += x.vb + x.vs; } }
    const win = [];
    for (let s = ns - 1800; s < ns - 10; s += 10) { let c = 0; for (let j = s; j < s + 10; j++) { const x = E.secs.get(j); if (x) c += x.nb + x.ns; } win.push(c); }
    const rank = win.length ? win.filter((c) => c < n10).length / win.length : NaN;
    $("spd").innerHTML = `<div>Speed of Tape<b>${(n10 / 10).toFixed(1)} lệnh/giây</b></div><div>Khối lượng/giây<b>${fq(v10 / 10)}</b></div><div>So với 30 phút qua<b>${isFinite(rank) && win.length > 20 ? "nhanh hơn " + Math.round(rank * 100) + "%" : "đang đo"}</b></div><div>Mua chủ động 1 phút<b class="${vb60 / v60 >= 0.5 ? "up" : "down"}">${v60 ? Math.round(100 * vb60 / v60) + "%" : "–"}</b></div>`;
    const c = $("tape"), g = c.getContext("2d"), dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    const span = 12e4, t0 = now - span, top = H * 0.64;
    const L = []; for (let i = E.recent.length - 1; i >= 0 && E.recent[i].t > t0; i--) L.push(E.recent[i]);
    if (L.length) {
      let a = Infinity, b = -Infinity, mn = 0;
      for (const e of L) { a = Math.min(a, e.p); b = Math.max(b, e.p); mn = Math.max(mn, e.n); }
      if (b - a < a * 1e-5) { a -= a * 5e-5; b += b * 5e-5; }
      const yy = (p) => 6 + (b - p) / (b - a) * (top - 12);
      for (let k = L.length - 1; k >= 0; k--) {
        const e = L[k], x = (e.t - t0) / span * W, r = 1.2 + 11 * Math.sqrt(e.n / mn);
        g.beginPath(); g.arc(x, yy(e.p), r, 0, 7); g.fillStyle = rgba(e.b ? COL.buy : COL.sell, 0.5); g.fill();
        if (r > 4) { g.strokeStyle = COL.bg; g.lineWidth = 1.5; g.stroke(); }
      }
      g.fillStyle = COL.axis; g.font = "10px JetBrains Mono, monospace"; g.fillText(fP(b), 4, 12); g.fillText(fP(a), 4, top - 4);
    }
    g.strokeStyle = "#1c232d"; g.beginPath(); g.moveTo(0, top + 0.5); g.lineTo(W, top + 0.5); g.stroke();
    const mid = top + (H - top) / 2; let mc = 1;
    for (let s = ns - 120; s <= ns; s++) { const x = E.secs.get(s); if (x) mc = Math.max(mc, x.nb, x.ns); }
    const bwid = W / 121;
    for (let s = ns - 120; s <= ns; s++) {
      const x = E.secs.get(s); if (!x) continue;
      const px = (s * 1000 - t0) / span * W, hb = x.nb / mc * ((H - top) / 2 - 3), hs = x.ns / mc * ((H - top) / 2 - 3);
      g.fillStyle = COL.buy; g.fillRect(px, mid - hb, Math.max(1, bwid - 1), hb);
      g.fillStyle = COL.sell; g.fillRect(px, mid, Math.max(1, bwid - 1), hs);
    }
    g.fillStyle = COL.axis; g.font = "10px JetBrains Mono, monospace"; g.fillText("Rhythm: lệnh mua ↑ / bán ↓ mỗi giây", 4, top + 12); g.textAlign = "right"; g.fillText("2 phút qua → bây giờ", W - 4, H - 3); g.textAlign = "left";
  }

  const EVT = [["all", "Tất cả"], ["big", "Big"], ["sw", "Sweep"], ["stop", "Stop run"], ["ice", "Iceberg"], ["pat", "Mẫu băng"], ["liq", "Thanh lý"]];
  function events() {
    if (!E) return [];
    const L = [];
    const big = E.big.filter((e) => (S.bigm === "f" ? e.f : e.a));
    for (const e of big.slice(-200)) L.push({ k: "big", t: e.t, b: e.b, p: e.p, q: e.q, n: e.n, txt: "Big trade" });
    for (const e of E.sweeps.slice(-200)) L.push({ k: "sw", t: e.t, b: e.b, p: e.p1, q: e.q, n: e.n, txt: `Sweep ${e.lv} mức (${fP(e.p0)} → ${fP(e.p1)})` });
    for (const e of E.stops.slice(-100)) L.push({ k: "stop", t: e.t, b: e.b, p: e.p, q: e.q, n: e.q * e.p, txt: `Stop run qua ${e.b ? "đỉnh" : "đáy"} ${fP(e.lvl)}` });
    for (const e of E.ices.slice(-100)) L.push({ k: "ice", t: e.t, b: e.b, p: e.p, q: e.exec, n: e.exec * e.p, txt: `Iceberg ${e.b ? "mua" : "bán"}: khớp ${fq(e.exec)}, chỉ hiện ${fq(e.shown)}` });
    for (const e of E.patts.slice(-100)) L.push({ k: "pat", t: e.t, b: e.b, p: e.p, q: e.q, n: e.q * e.p, txt: `Thuật toán lặp ${e.c} lần khối lượng ${fq(e.q)}` });
    for (const e of E.liqs.slice(-200)) L.push({ k: "liq", t: e.t, b: !e.long, p: e.p, q: e.q, n: e.n, txt: e.long ? "Long bị thanh lý" : "Short bị thanh lý" });
    return L.sort((a, b) => b.t - a.t);
  }
  function renderEvents() {
    const L = events().filter((e) => S.evf === "all" || e.k === S.evf).slice(0, 80);
    $("ev").innerHTML = L.length ? L.map((e) => `<tr data-t="${e.t}"><td class="dim">${fHMS(e.t)}</td><td>${esc(e.txt)}</td><td class="${e.b ? "up" : "down"}">${e.b ? "MUA" : "BÁN"}</td><td>${fP(e.p)}</td><td>${fUsd(e.n)}</td></tr>`).join("")
      : `<tr><td class="dim">Chưa có sự kiện. ${E && !bf.done ? "Đang nạp lịch sử lệnh khớp." : "Iceberg và DOM chỉ có từ lúc mở trang."}</td></tr>`;
  }
  $("ev").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-t]"); if (!tr || !E) return;
    const t = +tr.dataset.t, i = E.idx.get(Math.floor(t / E.tf) * E.tf); if (i === undefined) return;
    V.off = Math.max(0, E.bars.length - 1 - i - 3); dirty = true;
    $("cv").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  function renderOI() {
    if (!E) return;
    const n = E.bars.length, oi = E.oi, last = oi.length ? oi[oi.length - 1][1] : NaN, px = E.bars[n - 1].c, now = Date.now();
    const ch = (ms) => { const v = E.oiAt(now - ms); return isFinite(v) && v > 0 ? last / v - 1 : NaN; };
    $("oi-src").textContent = oiSrc || "chưa có";
    $("oikv").innerHTML = `<div>OI hiện tại<b>${fq(last)} ${esc(S.sym)}</b>${fUsd(last * px)}</div><div>Thay đổi 1 giờ<b class="${ch(36e5) >= 0 ? "up" : "down"}">${fPct(ch(36e5))}</b></div><div>Thay đổi 4 giờ<b class="${ch(144e5) >= 0 ? "up" : "down"}">${fPct(ch(144e5))}</b></div>` +
      `<div>Funding<b class="${funding && funding.rate >= 0 ? "up" : "down"}">${funding ? fPct(funding.rate, 4) : "–"}</b>${funding ? "mỗi " + funding.per : ""}</div>`;
    const c = $("oic"), g = c.getContext("2d"), dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    const k = Math.min(n, Math.floor(W / 5)), z = H / 2, vals = [];
    for (let i = n - k; i < n; i++) vals.push([i, E.dOI(i)]);
    const m = Math.max(1e-12, ...vals.filter((v) => isFinite(v[1])).map((v) => Math.abs(v[1])));
    const bw = W / k;
    g.strokeStyle = "#1c232d"; g.beginPath(); g.moveTo(0, z + 0.5); g.lineTo(W, z + 0.5); g.stroke();
    for (const [i, v] of vals) {
      if (!isFinite(v)) continue;
      const h = v / m * (z - 6), x = (i - (n - k)) * bw, r = E.regime(i);
      g.fillStyle = COL[(r || "ln").toLowerCase()]; g.fillRect(x + 0.5, h >= 0 ? z - h : z, Math.max(1, bw - 1.5), Math.abs(h) || 1);
    }
    g.fillStyle = COL.axis; g.font = "10px JetBrains Mono, monospace"; g.fillText(`ΔOI mỗi nến ${S.tf}, ${k} nến gần nhất`, 4, 11);
    // what the last 12 bars say
    const cnt = { LN: 0, SN: 0, SC: 0, LC: 0 };
    for (let i = Math.max(0, n - 13); i < n - 1; i++) { const r = E.regime(i); if (r) cnt[r]++; }
    const tot = cnt.LN + cnt.SN + cnt.SC + cnt.LC, top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    const RG = { LN: "long mới đang vào, xu hướng tăng có tiền mới đỡ", SN: "short mới đang vào, áp lực bán có tiền mới", SC: "short đang đóng lệnh, giá tăng nhờ mua lại chứ chưa có tiền mới", LC: "long đang đóng lệnh, giá giảm vì xả hàng chứ chưa có short mới" };
    $("oi-read").textContent = tot ? `12 nến gần nhất: long mới ${cnt.LN}, short mới ${cnt.SN}, short đóng ${cnt.SC}, long đóng ${cnt.LC}. Nhiều nhất là ${RG[top[0]]}.` : "Chưa đủ dữ liệu OI cho các nến gần đây (Hyperliquid chỉ có từ lúc mở trang).";
  }

  function renderLZ() {
    if (!E || !LZ || !isFinite(LZ.zr)) { $("lz").innerHTML = `<p class="dim">Cần dữ liệu OI. ${VENUE === "hl" ? "Hyperliquid chỉ có OI từ lúc mở trang, vùng sẽ hiện dần." : ""}</p>`; return; }
    const px = E.bars[E.bars.length - 1].c;
    const top = (M, above) => [...M].map(([k, v]) => ({ p: (k + 0.5) * LZ.zr, v })).filter((z) => (above ? z.p > px : z.p < px)).sort((a, b) => b.v - a.v).slice(0, 5).sort((a, b) => (above ? a.p - b.p : b.p - a.p));
    const rows = (L, cls, lab) => L.map((z) => `<tr><td class="${cls}">${lab}</td><td>${fP(z.p)}</td><td>${fPct(z.p / px - 1)}</td><td>${fq(z.v)} ${esc(S.sym)}</td><td>${fUsd(z.v * z.p)}</td></tr>`).join("");
    const sw = LZ.swept.slice(-3).reverse().map((s) => `${s.long ? "long" : "short"} ở ${fP(s.p)} (${fq(s.q)})`).join(", ");
    $("lz").innerHTML = `<div class="scroll"><table><tr><th></th><th>Giá</th><th>Cách</th><th>Ước tính</th><th>$</th></tr>${rows(top(LZ.short, true), "down", "Short")}<tr><td colspan="5" class="amber">Giá hiện tại ${fP(px)}</td></tr>${rows(top(LZ.long, false), "up", "Long")}</table></div>` +
      (sw ? `<p class="hint">Vừa bị giá quét: ${esc(sw)}.</p>` : "");
  }

  function renderTPO() {
    if (!E) return;
    const d0 = Math.floor(Date.now() / C.DAY) * C.DAY - (+S.tpod) * C.DAY, T = E.tpo(d0);
    const c = $("tpo"), g = c.getContext("2d"), dpr = devicePixelRatio || 1;
    if (!T) { $("tpo-sum").textContent = "chưa đủ dữ liệu"; c.style.width = "100%"; c.width = c.clientWidth * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = COL.bg; g.fillRect(0, 0, c.clientWidth, c.clientHeight); return; }
    const rows = T.rows, rh = clamp(Math.floor(500 / rows.length), 7, 14), cw = 9, lw = 76;
    const W = Math.max(c.parentElement.clientWidth, lw + 48 * cw + 20), H = rows.length * rh + 24;
    c.style.width = W + "px"; c.style.height = H + "px"; c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    g.font = `${Math.min(11, rh)}px JetBrains Mono, monospace`;
    const last = E.bars[E.bars.length - 1].c;
    rows.forEach((r, j) => {
      const yy = 12 + j * rh, inVA = r.p >= T.val - 1e-9 && r.p < T.vah - 1e-9, poc = Math.abs(r.p + T.tr / 2 - T.poc) < T.tr / 2;
      if (inVA) { g.fillStyle = "rgba(74,168,255,.10)"; g.fillRect(lw, yy, W - lw, rh); }
      if (poc) { g.fillStyle = "rgba(255,176,0,.22)"; g.fillRect(lw, yy, W - lw, rh); }
      g.fillStyle = r.p <= last && last < r.p + T.tr ? COL.amber : COL.axis; g.fillText(fP(r.p), 4, yy + rh - 2);
      for (const pi of r.per) { g.fillStyle = poc ? COL.amber : r.n === 1 ? "#9aa3ad" : COL.text; g.fillText("ABCDEFGHIJKLMNOPQRSTUVWXabcdefghijklmnopqrstuvwx"[pi], lw + pi * cw, yy + rh - 2); }
    });
    // initial balance bracket
    const yOf = (p) => { const j = rows.findIndex((r) => r.p <= p); return 12 + (j < 0 ? rows.length : j) * rh; };
    g.strokeStyle = "#4aa8ff"; g.lineWidth = 2; g.strokeRect(lw - 6, yOf(T.ibH), 3, Math.max(2, yOf(T.ibL) - yOf(T.ibH) + rh));
    $("tpo-sum").textContent = `POC ${fP(T.poc)} · VAH ${fP(T.vah)} · VAL ${fP(T.val)} · IB ${fP(T.ibL)}–${fP(T.ibH)} · ${T.singles} hàng single print · ${T.periods} khung 30 phút`;
  }

  function renderCS() {
    if (!E) return;
    const wrap = $("csw"), atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 20;
    const n = E.bars.length, k = Math.min(n, 48), I = []; for (let i = n - k; i < n; i++) I.push(i);
    const spec = [
      ["Giờ", (B) => null, (B) => fHM(B.t)],
      ["Khối lượng", (B) => B.v, null, "m"],
      ["Mua chủ động", (B) => (isFinite(B.bv) ? B.bv : NaN), null, "m"],
      ["Bán chủ động", (B) => (isFinite(B.sv) ? B.sv : NaN), null, "m"],
      ["Delta", (B) => E.delta(B).d, null, "s"],
      ["Delta %", (B) => (B.v ? E.delta(B).d / B.v : NaN), (B, v) => (isFinite(v) ? (v * 100).toFixed(0) + "%" : "–"), "s"],
      ["Delta max", (B) => (B.cov ? B.dmax : NaN), null, "s"],
      ["Delta min", (B) => (B.cov ? B.dmin : NaN), null, "s"],
      ["CVD", (B, i) => (E.cvd ? E.cvd[i] : NaN), null, "s"],
      ["Số lệnh", (B) => (B.cov ? B.n : NaN), null, "m"],
      ["Lệnh/giây max", (B) => (B.cov ? B.spd : NaN), null, "m"],
      ["Trung bình mỗi lệnh", (B) => (B.cov && B.n ? B.v / B.n : NaN), null, "m"],
      ["ΔOI", (B, i) => E.dOI(i), null, "s"],
    ];
    const html = spec.map(([lab, f, fmt, kind]) => {
      const vals = I.map((i) => f(E.bars[i], i)), m = Math.max(1e-12, ...vals.filter((v) => v != null && isFinite(v)).map(Math.abs));
      return `<tr><th>${lab}</th>` + I.map((i, j) => {
        const v = vals[j], txt = fmt ? fmt(E.bars[i], v) : fq(v);
        let bg = "";
        if (v != null && isFinite(v) && kind) { const a = (0.08 + 0.5 * Math.abs(v) / m).toFixed(2); bg = kind === "s" ? (v >= 0 ? `rgba(34,197,94,${a})` : `rgba(240,82,79,${a})`) : `rgba(255,176,0,${(a * 0.7).toFixed(2)})`; }
        return `<td style="${bg ? "background:" + bg : ""}">${esc(txt)}</td>`;
      }).join("") + "</tr>";
    }).join("");
    $("cs").innerHTML = html;
    if (atEnd) wrap.scrollLeft = wrap.scrollWidth;
  }

  // quick read: what the tools say together, as plain sentences
  function renderRead() {
    if (!E || E.bars.length < 30) { $("read").innerHTML = `<p class="dim">Đang tải…</p>`; return; }
    const bars = E.bars, n = bars.length, i = n - 2, B = bars[i], px = bars[n - 1].c, out = [];
    let sc = 0;
    const add = (s, txt) => { sc += s; out.push(`<li>${s > 0 ? '<b class="up">▲</b>' : s < 0 ? '<b class="down">▼</b>' : '<b class="dim">•</b>'} ${txt}</li>`); };
    // CVD divergence over 12 closed bars
    const a = i - 11; let dsum = 0; for (let j = a; j <= i; j++) dsum += E.delta(bars[j]).d;
    const dp = bars[i].c - bars[a].c;
    if (dp > 0 && dsum < 0) add(-1, `Phân kỳ CVD: 12 nến qua giá tăng ${fPct(dp / bars[a].c)} nhưng delta ròng âm ${fq(dsum)}. Giá lên mà người mua chủ động không theo, dễ hụt hơi.`);
    else if (dp < 0 && dsum > 0) add(1, `Phân kỳ CVD: 12 nến qua giá giảm ${fPct(dp / bars[a].c)} nhưng delta ròng dương ${fq(dsum)}. Có người mua chủ động đỡ giá.`);
    else add(Math.sign(dsum) * 0.5, `12 nến qua delta ròng ${fq(dsum)}, cùng chiều với giá (${fPct(dp / bars[a].c)}): dòng lệnh xác nhận xu hướng.`);
    // absorption on the last 3 closed bars
    for (let j = i; j > i - 3; j--) {
      const X = bars[j], r = X.h - X.l, d = E.delta(X);
      if (!(r > 0) || d.est || X.v < E.vp80) continue;
      const body = Math.abs(X.c - X.o) / r, pos = (X.c - X.l) / r, dr = d.d / X.v;
      if (body <= 0.35 && dr <= -0.2 && pos >= 0.5) { add(1, `Hấp thụ bán lúc ${fHM(X.t)}: khối lượng lớn, bán chủ động áp đảo (${(dr * 100).toFixed(0)}%) mà giá không giảm. Có lệnh chờ mua lớn đang đỡ.`); break; }
      if (body <= 0.35 && dr >= 0.2 && pos <= 0.5) { add(-1, `Hấp thụ mua lúc ${fHM(X.t)}: khối lượng lớn, mua chủ động áp đảo (+${(dr * 100).toFixed(0)}%) mà giá không tăng. Có lệnh chờ bán lớn đang chặn.`); break; }
    }
    // open interest
    const cnt = { LN: 0, SN: 0, SC: 0, LC: 0 }; for (let j = i - 5; j <= i; j++) { const r = E.regime(j); if (r) cnt[r]++; }
    if (cnt.LN >= 3) add(1, `OI: ${cnt.LN}/6 nến gần nhất là long mới vào khi giá tăng.`);
    if (cnt.SN >= 3) add(-1, `OI: ${cnt.SN}/6 nến gần nhất là short mới vào khi giá giảm.`);
    if (cnt.SC >= 3) add(0, `OI: giá tăng chủ yếu nhờ short đóng lệnh (${cnt.SC}/6 nến), chưa có tiền mới vào.`);
    if (cnt.LC >= 3) add(0, `OI: giá giảm chủ yếu do long đóng lệnh (${cnt.LC}/6 nến), chưa có short mới.`);
    // DOM power
    const P = E.pow[E.pow.length - 1];
    if (P && Date.now() - P[0] < 15000) { if (P[1] > 0.3) add(0.5, `Sổ lệnh: bên đặt mua dày hơn rõ (${Math.round(50 + 50 * P[1])}% tiền chờ ở phía mua).`); else if (P[1] < -0.3) add(-0.5, `Sổ lệnh: bên đặt bán dày hơn rõ (${Math.round(50 - 50 * P[1])}% tiền chờ ở phía bán).`); }
    // VWAP and value area
    if (SESS && E.m1.length) {
      const m = E.m1.length - 1, vw = SESS.vw[m], sd = SESS.sd[m];
      if (isFinite(vw) && sd > 0) {
        const z = (px - vw) / sd;
        if (z >= 2) add(-0.5, `Giá cao hơn VWAP ${z.toFixed(1)}σ: đang bị kéo căng, hay quay về VWAP ${fP(vw)}.`);
        else if (z <= -2) add(0.5, `Giá thấp hơn VWAP ${(-z).toFixed(1)}σ: đang bị ép quá đà, hay hồi về VWAP ${fP(vw)}.`);
        else add(z >= 0 ? 0.5 : -0.5, `Giá ${z >= 0 ? "trên" : "dưới"} VWAP phiên ${fP(vw)} (${z >= 0 ? "+" : ""}${z.toFixed(1)}σ): ${z >= 0 ? "bên mua" : "bên bán"} đang kiểm soát phiên.`);
      }
      let va = null; for (let j = m; j >= Math.max(0, m - 60) && !va; j--) va = SESS.va.get(j);
      if (va) add(0, px > va.vah ? `Giá trên vùng giá trị (VAH ${fP(va.vah)}): đang tìm giá mới phía trên, giữ được thì xu hướng tiếp diễn.` : px < va.val ? `Giá dưới vùng giá trị (VAL ${fP(va.val)}): đang tìm giá mới phía dưới.` : `Giá trong vùng giá trị ${fP(va.val)}–${fP(va.vah)}, POC ${fP(va.poc)}: thị trường cân bằng, hay đi lại giữa hai mép.`);
    }
    // nearest live stacked imbalance zones
    if (ZON) {
      const live = ZON.filter((z) => z.end == null);
      const sup = live.filter((z) => z.dir === 1 && z.hi <= px).sort((x, y) => y.hi - x.hi)[0], res = live.filter((z) => z.dir === -1 && z.lo >= px).sort((x, y) => x.lo - y.lo)[0];
      if (sup) out.push(`<li><b class="dim">•</b> Hỗ trợ stacked imbalance gần nhất ${fP(sup.lo)}–${fP(sup.hi)} (${fPct(sup.hi / px - 1)}).</li>`);
      if (res) out.push(`<li><b class="dim">•</b> Kháng cự stacked imbalance gần nhất ${fP(res.lo)}–${fP(res.hi)} (${fPct(res.lo / px - 1)}).</li>`);
    }
    // the last 15 minutes of events
    const t15 = Date.now() - 9e5;
    const bigs = E.big.filter((e) => e.t > t15 && (S.bigm === "f" ? e.f : e.a));
    const nb = bigs.reduce((s, e) => s + (e.b ? e.n : -e.n), 0);
    if (bigs.length >= 3) add(Math.sign(nb) * 0.5, `15 phút qua: ${bigs.length} big trade, ròng ${nb >= 0 ? "mua" : "bán"} ${fUsd(Math.abs(nb))}.`);
    const st = E.stops.filter((e) => e.t > t15);
    for (const e of st.slice(-2)) out.push(`<li><b style="color:var(--stop)">◆</b> Stop run ${e.b ? "lên qua đỉnh" : "xuống qua đáy"} ${fP(e.lvl)} lúc ${fHM(e.t)}. Nếu giá quay lại trong vùng cũ thì đó là cú quét để đảo chiều.</li>`);
    const ic = E.ices.filter((e) => (e.tl || e.t) > t15);
    for (const e of ic.slice(-2)) add(e.b ? 0.5 : -0.5, `Iceberg ${e.b ? "mua" : "bán"} ở ${fP(e.p)}: đã khớp ${fq(e.exec)} dù chỉ hiện ${fq(e.shown)}.`);
    const lq = E.liqs.filter((e) => e.t > t15);
    if (lq.length) { const ll = lq.filter((e) => e.long).reduce((s, e) => s + e.n, 0), ss = lq.filter((e) => !e.long).reduce((s, e) => s + e.n, 0); out.push(`<li><b class="dim">•</b> Thanh lý 15 phút qua: long ${fUsd(ll)}, short ${fUsd(ss)}.</li>`); }
    if (funding && Math.abs(funding.rate) >= (funding.per === "8 giờ" ? 0.0003 : 0.00004)) add(funding.rate > 0 ? -0.5 : 0.5, `Funding ${fPct(funding.rate, 4)} mỗi ${funding.per}: phe ${funding.rate > 0 ? "long" : "short"} đang đông và trả phí, dễ bị quét ngược.`);
    const bias = sc >= 1.5 ? ['up', "NGHIÊNG MUA"] : sc <= -1.5 ? ['down', "NGHIÊNG BÁN"] : ['amber', "TRUNG TÍNH / CHƯA RÕ"];
    $("read").innerHTML = `<div class="bias ${bias[0]}">${bias[1]} <span class="dim small">(điểm ${sc >= 0 ? "+" : ""}${sc.toFixed(1)} · nến ${S.tf} đóng lúc ${fHM(B.t + E.tf)})</span></div><ul>${out.join("")}</ul>`;
  }

  function renderAll() { renderConfirm(); renderLegend(); renderStat(); renderLadder(); renderTape(); renderEvents(); renderOI(); renderLZ(); renderTPO(); renderCS(); renderRead(); }

  // ---------- controls ----------
  function fillControls() {
    const sel = $("sym"), others = Object.keys(HL_XYZ);
    sel.innerHTML = `<optgroup label="Crypto top 20 (Binance)">${CRYPTO.map((s) => `<option>${s}</option>`).join("")}</optgroup>` +
      `<optgroup label="Hyperliquid: hàng hóa, chỉ số, cổ phiếu">${others.map((s) => `<option value="${s}">${NAMES[s] || s}</option>`).join("")}</optgroup>`;
    sel.value = S.sym; if (sel.value !== S.sym) { S.sym = "BTC"; sel.value = "BTC"; }
    $("venue").value = S.venue;
    $("tfs").innerHTML = TFS.map(([k]) => `<button data-v="${k}" class="${k === S.tf ? "on" : ""}">${k}</button>`).join("");
    $("rows").innerHTML = ROWM.map(([m, l]) => `<button data-v="${m}" class="${m === +S.rowm ? "on" : ""}">${l}</button>`).join("");
    for (const b of $("bigm").children) b.classList.toggle("on", b.dataset.v === S.bigm);
    $("bigu").value = +S.bigu || ""; $("imb").value = String(S.imb);
    $("layers").innerHTML = LAYERS.map(([g, L]) => `<div class="lgrp"><span class="gl">${g}</span>${L.map(([k, l]) => `<button class="chip ${S.L[k] ? "on" : ""}" data-k="${k}">${l}</button>`).join("")}</div>`).join("");
    $("evf").innerHTML = EVT.map(([k, l]) => `<button data-v="${k}" class="${k === S.evf ? "on" : ""}">${l}</button>`).join("");
    for (const b of $("tpod").children) b.classList.toggle("on", b.dataset.v === String(S.tpod));
  }
  const segPick = (id, f) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; for (const x of $(id).children) x.classList.toggle("on", x === b); f(b.dataset.v, b.textContent); });
  $("sym").onchange = () => { S.sym = $("sym").value; confirmMsg(`đổi sang ${S.sym}, đang tải dữ liệu`); load(); };
  $("venue").onchange = () => { S.venue = $("venue").value; confirmMsg(`nguồn ${$("venue").selectedOptions[0].textContent}${isCrypto(S.sym) ? "" : " (hàng hóa, chỉ số, cổ phiếu luôn lấy từ Hyperliquid)"}`); load(); };
  segPick("tfs", (v) => { S.tf = v; confirmMsg(`khung ${v}`); load(); });
  segPick("rows", (v, l) => { S.rowm = +v; if (E) { E.setRows(C.niceStep(E.rs0 * S.rowm)); calc(); dirty = true; } confirmMsg(`bước giá mỗi ô ${l}${E ? " = " + fP(E.rs).replace(/\.?0+$/, "") : ""}`); renderAll(); });
  segPick("bigm", (v) => { S.bigm = v; if (E) { E.userBig = v === "f" ? +S.bigu || 0 : 0; E.rebuild(); calc(); dirty = true; } confirmMsg(v === "f" ? "Big Trades cố định" : "Adaptive Big Trades (ngưỡng tự co giãn)"); renderAll(); });
  $("bigu").onchange = () => { S.bigu = Math.max(0, +$("bigu").value || 0); if (S.bigm === "f" && E) { E.userBig = S.bigu; E.rebuild(); calc(); dirty = true; } confirmMsg(S.bigu ? `ngưỡng Big Trades cố định ${fUsd(S.bigu)}` : "ngưỡng Big Trades cố định tự động (99,95%)"); renderAll(); };
  $("imb").onchange = () => { S.imb = +$("imb").value; if (E) { E.imbRatio = S.imb; calc(); dirty = true; } confirmMsg(`imbalance khi một bên gấp ${S.imb} lần bên kia`); renderAll(); };
  $("layers").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    const k = b.dataset.k; S.L[k] = S.L[k] ? 0 : 1; b.classList.toggle("on", !!S.L[k]); dirty = true;
    confirmMsg(`${S.L[k] ? "bật" : "tắt"} ${LNAME[k]}`); renderLegend();
  });
  segPick("evf", (v) => { S.evf = v; save(); renderEvents(); });
  segPick("tpod", (v) => { S.tpod = +v; confirmMsg(`TPO ${+v ? "hôm qua" : "hôm nay"}`); renderTPO(); });

  // ---------- loops ----------
  let lastDraw = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden || !dirty || ts - lastDraw < 120) return;
    lastDraw = ts; dirty = false;
    try { draw(); } catch (e) { console.error(e); }
  }
  requestAnimationFrame(frame);
  setInterval(() => { if (!document.hidden && E) { renderLadder(); renderTape(); } }, 500);
  setInterval(() => { if (!document.hidden && E) { calc(); renderStat(); renderEvents(); renderOI(); renderLZ(); renderRead(); renderCS(); dirty = true; } }, 3000);
  setInterval(() => { if (!document.hidden && E) renderTPO(); }, 30000);
  addEventListener("resize", () => { dirty = true; renderTPO(); });

  // crypto list follows the server's top 20 (only coins tradable on Binance)
  fetch("../data/trad/index.json?v=" + Math.floor(Date.now() / 3e5), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    const L = d && d.assets ? d.assets.filter((a) => a.cls === "crypto").map((a) => a.symbol) : [];
    if (L.length >= 5) { CRYPTO = L; fillControls(); }
  }).catch(() => { /* keep the built-in list */ });
  fillControls();
  load();
})();
