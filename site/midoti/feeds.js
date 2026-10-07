// Data sources for the MIDOTI page. Every source returns the same columns {t,o,h,l,c,v} (t in seconds,
// oldest first) and a `closed` flag: false when the last bar is still forming. live() streams the forming bar.
(function (root) {
  "use strict";
  const TF = { "5m": 300, "15m": 900, "30m": 1800, "1H": 3600, "4H": 14400, "1D": 86400 };
  const HL_XYZ = { SP500: "SP500", NASDAQ100: "XYZ100", AAPL: "AAPL", MSFT: "MSFT", NVDA: "NVDA", GOOGL: "GOOGL", AMZN: "AMZN", META: "META", TSLA: "TSLA", GOLD: "GOLD", SILVER: "SILVER", PLATINUM: "PLATINUM", COPPER: "COPPER", WTI: "CL", BRENT: "BRENTOIL", NATGAS: "NATGAS", CORN: "CORN" };
  const HL_K = { PEPE: "kPEPE", SHIB: "kSHIB", BONK: "kBONK", FLOKI: "kFLOKI" };
  const KR_FX = { EURUSD: "EURUSD", GBPUSD: "GBPUSD", AUDUSD: "AUDUSD", USDJPY: "USDJPY", USDCAD: "USDCAD", USDCHF: "USDCHF" };
  const KR_IV = { "5m": 5, "15m": 15, "30m": 30, "1H": 60, "4H": 240, "1D": 1440 };
  const BN_IV = { "5m": "5m", "15m": "15m", "30m": "30m", "1H": "1h", "4H": "4h", "1D": "1d" };
  const OKX_IV = { "5m": "5m", "15m": "15m", "30m": "30m", "1H": "1H", "4H": "4Hutc", "1D": "1Dutc" };
  const BY_IV = { "5m": "5", "15m": "15", "30m": "30", "1H": "60", "4H": "240", "1D": "D" };
  const HL_IV = { "5m": "5m", "15m": "15m", "30m": "30m", "1H": "1h", "4H": "4h", "1D": "1d" };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function getJSON(url, init) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, Object.assign({ signal: ctl.signal, cache: "no-store" }, init || {}));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally { clearTimeout(to); }
  }
  const hlPost = (body) => getJSON("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  function cols(rows) {  // rows [[t,o,h,l,c,v]] any order, possibly duplicated -> sorted columns
    const m = new Map();
    for (const r of rows) if (isFinite(r[4])) m.set(r[0], r);
    const a = [...m.values()].sort((x, y) => x[0] - y[0]);
    return { t: a.map((r) => r[0]), o: a.map((r) => +r[1]), h: a.map((r) => +r[2]), l: a.map((r) => +r[3]), c: a.map((r) => +r[4]), v: a.map((r) => +r[5] || 0) };
  }
  const formingFrom = (B, tf) => { B.closed = !(B.t.length && B.t[B.t.length - 1] + TF[tf] > Date.now() / 1000); return B; };

  // ---------- sources ----------
  const binanceLike = (base, ws, per, label) => ({
    label,
    sym: (a) => `${a.symbol}USDT`,
    async bars(a, tf, max) {
      const rows = [];
      let end = null;
      while (rows.length < max) {
        const q = `symbol=${this.sym(a)}&interval=${BN_IV[tf]}&limit=${per}` + (end ? `&endTime=${end}` : "");
        const r = await getJSON(`${base}/klines?${q}`);
        if (!r.length) break;
        rows.unshift(...r.map((k) => [k[0] / 1000, k[1], k[2], k[3], k[4], k[5]]));
        end = r[0][0] - 1;
        if (r.length < per) break;
      }
      return formingFrom(cols(rows.slice(-max)), tf);
    },
    live(a, tf, onBar) {
      let sock, dead = false;
      const open = () => {
        try { sock = new WebSocket(`${ws}/${this.sym(a).toLowerCase()}@kline_${BN_IV[tf]}`); } catch (e) { return; }
        sock.onmessage = (ev) => {
          const k = JSON.parse(ev.data).k;
          if (k) onBar({ t: k.t / 1000, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v, x: k.x });
        };
        sock.onclose = () => { if (!dead) setTimeout(open, 3000); };
      };
      open();
      return () => { dead = true; if (sock) sock.close(); };
    },
  });

  function poller(fn, ms) {
    return (a, tf, onBar) => {
      let dead = false;
      (async () => {
        while (!dead) {
          if (!document.hidden) { try { (await fn(a, tf)).forEach(onBar); } catch (e) { /* next poll */ } }
          await sleep(ms);
        }
      })();
      return () => { dead = true; };
    };
  }

  const SRC = {
    binance: binanceLike("https://data-api.binance.vision/api/v3", "wss://data-stream.binance.vision/ws", 1000, "Binance Spot"),
    binancef: binanceLike("https://fapi.binance.com/fapi/v1", "wss://fstream.binance.com/ws", 1500, "Binance Futures"),
    okx: {
      label: "OKX Spot",
      sym: (a) => `${a.symbol}-USDT`,
      async bars(a, tf, max) {
        const first = await getJSON(`https://www.okx.com/api/v5/market/candles?instId=${this.sym(a)}&bar=${OKX_IV[tf]}&limit=300`);
        if (first.code !== "0") throw new Error(first.msg || "OKX");
        const rows = first.data.map((k) => [k[0] / 1000, k[1], k[2], k[3], k[4], k[5]]);
        let after = first.data.length ? first.data[first.data.length - 1][0] : null;
        while (after && rows.length < max) {
          await sleep(120);  // 20 requests per 2 seconds
          const r = await getJSON(`https://www.okx.com/api/v5/market/history-candles?instId=${this.sym(a)}&bar=${OKX_IV[tf]}&limit=100&after=${after}`);
          if (r.code !== "0" || !r.data.length) break;
          r.data.forEach((k) => rows.push([k[0] / 1000, k[1], k[2], k[3], k[4], k[5]]));
          after = r.data[r.data.length - 1][0];
        }
        return formingFrom(trim(cols(rows), max), tf);
      },
      live: poller(async (a, tf) => {
        const r = await getJSON(`https://www.okx.com/api/v5/market/candles?instId=${a.symbol}-USDT&bar=${OKX_IV[tf]}&limit=2`);
        return r.data.reverse().map((k) => ({ t: k[0] / 1000, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], x: k[8] === "1" }));
      }, 2000),
    },
    bybit: {
      label: "Bybit Spot",
      sym: (a) => `${a.symbol}USDT`,
      async bars(a, tf, max) {
        const rows = [];
        let end = null;
        while (rows.length < max) {
          const r = await getJSON(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${this.sym(a)}&interval=${BY_IV[tf]}&limit=1000` + (end ? `&end=${end}` : ""));
          if (r.retCode !== 0) throw new Error(r.retMsg || "Bybit");
          const l = r.result.list;
          if (!l.length) break;
          l.forEach((k) => rows.push([k[0] / 1000, k[1], k[2], k[3], k[4], k[5]]));
          end = +l[l.length - 1][0] - 1;
          if (l.length < 1000) break;
        }
        return formingFrom(trim(cols(rows), max), tf);
      },
      live: poller(async (a, tf) => {
        const r = await getJSON(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${a.symbol}USDT&interval=${BY_IV[tf]}&limit=2`);
        return r.result.list.reverse().map((k) => ({ t: k[0] / 1000, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
      }, 2000),
    },
    kraken: {
      label: "Kraken",
      sym: (a) => (a.cls === "forex" ? KR_FX[a.symbol] : `${a.symbol === "BTC" ? "XBT" : a.symbol}USD`),
      async bars(a, tf) {  // Kraken returns the last 720 bars only
        const r = await getJSON(`https://api.kraken.com/0/public/OHLC?pair=${this.sym(a)}&interval=${KR_IV[tf]}`);
        if (r.error && r.error.length) throw new Error(r.error[0]);
        const k = Object.keys(r.result).find((x) => x !== "last");
        return formingFrom(cols(r.result[k].map((x) => [x[0], x[1], x[2], x[3], x[4], x[6]])), tf);
      },
      live: poller(async (a, tf) => {
        const r = await getJSON(`https://api.kraken.com/0/public/OHLC?pair=${SRC.kraken.sym(a)}&interval=${KR_IV[tf]}&since=${Math.floor(Date.now() / 1000) - 3 * TF[tf]}`);
        const k = Object.keys(r.result).find((x) => x !== "last");
        return r.result[k].map((x) => ({ t: x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[6] }));
      }, 3000),
    },
    hl: {
      label: "Hyperliquid (perp)",
      sym: (a) => (a.cls === "crypto" ? HL_K[a.symbol] || a.symbol : `xyz:${HL_XYZ[a.symbol]}`),
      async bars(a, tf, max) {
        const now = Date.now();
        const r = await hlPost({ type: "candleSnapshot", req: { coin: this.sym(a), interval: HL_IV[tf], startTime: now - Math.min(max, 5000) * TF[tf] * 1000, endTime: now } });
        if (!Array.isArray(r) || !r.length) throw new Error("no data");
        return formingFrom(cols(r.map((k) => [k.t / 1000, k.o, k.h, k.l, k.c, k.v])), tf);
      },
      live: poller(async (a, tf) => {
        const now = Date.now();
        const r = await hlPost({ type: "candleSnapshot", req: { coin: SRC.hl.sym(a), interval: HL_IV[tf], startTime: now - 2 * TF[tf] * 1000, endTime: now } });
        return r.map((k) => ({ t: k.t / 1000, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v }));
      }, 2000),
    },
    server: {
      label: "Yahoo Finance (máy chủ Lai Long Desk)",
      async bars(a, tf, max) {
        const r = await getJSON(`../data/bars/${a.symbol}_${tf}.json?v=${Math.floor(Date.now() / 300000)}`);
        const B = trim({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v }, max);
        B.closed = true;  // the server keeps closed bars only
        return B;
      },
      live: null,
    },
  };
  function trim(B, max) {
    const k = Math.max(0, B.t.length - max);
    if (!k) return B;
    for (const f of ["t", "o", "h", "l", "c", "v"]) B[f] = B[f].slice(k);
    return B;
  }

  // which sources make sense for an asset and timeframe (first = default)
  function sourcesFor(a, tf) {
    let list;
    if (a.cls === "crypto") list = ["binance", "binancef", "okx", "bybit", "kraken", "hl", "server"];
    else if (a.cls === "forex") list = ["server"].concat(KR_FX[a.symbol] ? ["kraken"] : []);
    else list = ["server"].concat(HL_XYZ[a.symbol] ? ["hl"] : []);
    if (!["1H", "4H", "1D"].includes(tf)) list = list.filter((s) => s !== "server" || a.cls !== "crypto");
    return list;
  }

  const api = { TF, SRC, sourcesFor, getJSON };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FEEDS = api;
})(typeof self !== "undefined" ? self : this);
