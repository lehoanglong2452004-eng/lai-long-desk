/* Lai Long Desk MACRO terminal: reads site/data/macro/*.json (built hourly by pipeline/macro_desk.py)
   and data/global.json (bond curves of 5 countries, central-bank rates), draws Bloomberg-style screens.
   Every indicator: long chart, where it sits in its own history, and a two-sided reading (kb.js). */
(function () {
  "use strict";
  const $ = (s, el) => (el || document).querySelector(s);
  const KB = window.KB || {}, KB_AGRI = window.KB_AGRI || {}, KB_PHASE = window.KB_PHASE || {};
  const GROUPS = ["rates", "infl", "grow", "liq", "energy", "agri", "assets", "cycle"];
  const G = {};          // group -> json
  let GLOBAL = null;     // data/global.json
  const DAY = 86400;
  const C = { amber: "#ffa028", yellow: "#f5c400", blue: "#4aa8ff", cyan: "#3dd6d0", green: "#2fd36b", red: "#ff4d4d", violet: "#b48cff", dim: "#8a8a8a", grid: "#1c1c1c" };
  const PALETTE = [C.amber, C.blue, C.green, C.violet, C.cyan, C.red, "#e6e6e6"];

  const FN = [
    ["HOME", "TỔNG QUAN", "F1"], ["DECI", "QUYẾT ĐỊNH", "F2"], ["CAL", "LỊCH CÔNG BỐ", "F3"], ["CURV", "ĐƯỜNG CONG", "F4"],
    ["RATE", "LÃI SUẤT", "F5"], ["INFL", "LẠM PHÁT", "F6"], ["GROW", "TĂNG TRƯỞNG", "F7"], ["LIQ", "THANH KHOẢN", "F8"],
    ["ENGY", "NĂNG LƯỢNG", "F9"], ["AGRI", "NÔNG SẢN", "F10"], ["ASST", "TÀI SẢN", "F11"], ["CYCL", "CHU KỲ", "F12"], ["DATA", "ĐỘ TRỄ DỮ LIỆU", ""],
  ];

  // ------------------------------------------------------------------ formatting
  const nf = (v, d) => v == null || isNaN(v) ? "–" : Number(v).toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
  const digits = (v, unit) => { const a = Math.abs(v); return unit === "%" || unit === "điểm %" || unit === "% ròng" ? 2 : a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 2 : 3; };
  const fmt = (v, unit) => v == null ? "–" : nf(v, digits(v, unit));
  const isPrice = (s) => !s.unit || s.unit.startsWith("$") || s.unit === "lần";
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const date = (days) => days == null ? "–" : new Date(days * DAY * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");
  const ago = (ms) => { const h = (Date.now() - ms) / 3.6e6; return h < 1 ? Math.round(h * 60) + " phút trước" : h < 48 ? Math.round(h) + " giờ trước" : Math.round(h / 24) + " ngày trước"; };
  const fold = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

  function change(s, back) {
    const st = s.st, b = st[back];
    if (b == null) return null;
    if (isPrice(s)) return b ? { v: (st.v / b - 1) * 100, txt: (st.v >= b ? "+" : "") + nf((st.v / b - 1) * 100, 1) + "%" } : null;
    const d = st.v - b;
    // basis points only for rates and spreads, not for ratios like the Buffett indicator
    if (s.unit === "%" && Math.abs(st.max) < 30 && Math.abs(st.min) < 30) return { v: d, txt: (d >= 0 ? "+" : "") + nf(d * 100, 0) + " bp" };
    return { v: d, txt: (d >= 0 ? "+" : "") + fmt(d, s.unit) };
  }
  const chgSpan = (s, back, label) => { const c = change(s, back); return c ? `<span>${label} <b class="${c.v > 0 ? "up" : c.v < 0 ? "down" : ""}">${c.txt}</b></span>` : ""; };

  function level(st) {
    const p = st.pct10 != null ? st.pct10 : st.pct;
    return p == null ? "mid" : p >= 80 ? "hi" : p <= 20 ? "lo" : "mid";
  }
  const LEVEL_TXT = { hi: "CAO", lo: "THẤP", mid: "TRUNG BÌNH" };

  // ------------------------------------------------------------------ freshness
  /* Nothing in the macro files is realtime. Market numbers are the last daily close; economic numbers
     come out on an official schedule, weeks after the period they describe. Each value carries:
     its kind (CUỐI NGÀY / TUẦN / THÁNG / QUÝ), the period it belongs to, its age in days, and TRỄ LỊCH
     when the source has not published on time (age beyond what its normal schedule allows). */
  const RELEASE = {
    fedfunds: "NY Fed, sáng ngày làm việc kế tiếp", us3m: "Bộ Tài chính Mỹ, cuối mỗi ngày giao dịch", us2y: "Bộ Tài chính Mỹ, cuối mỗi ngày giao dịch", us10y: "Bộ Tài chính Mỹ, cuối mỗi ngày giao dịch", us30y: "Bộ Tài chính Mỹ, cuối mỗi ngày giao dịch",
    s10y2y: "Tính từ lợi suất cuối ngày", s10y3m: "Tính từ lợi suất cuối ngày", real10y: "Bộ Tài chính Mỹ (TIPS), cuối ngày", termprem: "NY Fed (mô hình ACM), đăng chậm 1-2 tuần", mortgage: "Freddie Mac, thứ Năm hằng tuần", dollar: "Fed H.10, cuối ngày, đăng mỗi thứ Hai",
    cpi: "BLS, khoảng ngày 10-15 tháng sau", corecpi: "BLS, khoảng ngày 10-15 tháng sau", corepce: "BEA, cuối tháng sau", ppi: "BLS, giữa tháng sau", wages: "BLS, thứ Sáu đầu tháng sau (cùng báo cáo việc làm)",
    be5y: "Thị trường trái phiếu, cuối ngày", fwd5y5y: "Thị trường trái phiếu, cuối ngày", mich: "ĐH Michigan, sơ bộ giữa tháng, chính thức cuối tháng",
    gdp: "BEA, bản sơ bộ khoảng 4 tuần sau quý, sửa lại 2 lần", gdpq: "BEA, bản sơ bộ khoảng 4 tuần sau quý, sửa lại 2 lần", unrate: "BLS, thứ Sáu đầu tháng sau", payrolls: "BLS, thứ Sáu đầu tháng sau (hay bị sửa lại)", claims: "Bộ Lao động Mỹ, thứ Năm hằng tuần",
    indpro: "Fed, giữa tháng sau", retail: "Census, giữa tháng sau", sentiment: "ĐH Michigan, sơ bộ giữa tháng, chính thức cuối tháng", housing: "Census, khoảng ngày 17 tháng sau", cfnai: "Chicago Fed, cuối tháng sau", sahm: "Tính từ thất nghiệp (BLS)", usrec: "NBER, xác định trễ nhiều tháng",
    fedbs: "Fed H.4.1, thứ Năm hằng tuần", tga: "Fed H.4.1, thứ Năm hằng tuần", netliq: "Fed H.4.1, thứ Năm hằng tuần", m2: "Fed H.6, khoảng 4 tuần sau tháng", m2lvl: "Fed H.6, khoảng 4 tuần sau tháng", rrp: "NY Fed, chiều mỗi ngày",
    nfci: "Chicago Fed, thứ Tư hằng tuần", hyoas: "ICE BofA qua FRED, cuối ngày", igoas: "ICE BofA qua FRED, cuối ngày", lending: "Khảo sát SLOOS của Fed, mỗi quý",
    mmf: "Fed Z.1, khoảng 10 tuần sau quý", equities: "Fed Z.1, khoảng 10 tuần sau quý", gdpnom: "BEA, khoảng 4 tuần sau quý", buffett: "Fed Z.1, khoảng 10 tuần sau quý", cash_ratio: "Fed Z.1, khoảng 10 tuần sau quý",
    crude: "EIA, thứ Tư cho tuần kết thúc thứ Sáu trước", spr: "EIA, thứ Tư hằng tuần", gasoline: "EIA, thứ Tư hằng tuần", distillate: "EIA, thứ Tư hằng tuần", cushing: "EIA, thứ Tư hằng tuần", production: "EIA, thứ Tư hằng tuần (ước tính)", refutil: "EIA, thứ Tư hằng tuần",
    natgas: "EIA, thứ Năm cho tuần kết thúc thứ Sáu trước", wti: "EIA qua FRED, cuối ngày, đăng chậm vài ngày", brent: "EIA qua FRED, cuối ngày, đăng chậm vài ngày", henryhub: "EIA qua FRED, cuối ngày, đăng chậm vài ngày",
  };
  // the most days a value can normally be old before its next release is due (dates are period start for months and quarters)
  const MAX_AGE = { d: 6, w: 15, m: 95, q: 260 };
  const MAX_AGE_KEY = { termprem: 25, gdp: 225, gdpq: 225, gdpnom: 225, wti: 10, brent: 10, henryhub: 10, dollar: 10, usrec: 400 };
  const KIND = { d: "CUỐI NGÀY", w: "TUẦN", m: "THÁNG", q: "QUÝ" };
  const todayDays = () => Math.floor(Date.now() / 1000 / DAY);

  function freshness(s, key) {
    const eod = s.freq === "d" || /^Yahoo/.test(s.src || "");
    const f = eod ? "d" : s.freq;
    const age = todayDays() - s.st.t;
    const lim = MAX_AGE_KEY[key] || MAX_AGE[f] || 95;
    const d = new Date(s.st.t * DAY * 1000);
    const period = f === "m" ? `T${d.getUTCMonth() + 1}/${d.getUTCFullYear()}` : f === "q" ? `Q${Math.floor(d.getUTCMonth() / 3) + 1}/${d.getUTCFullYear()}` : f === "w" ? `tuần đến ${date(s.st.t).slice(0, 5)}` : date(s.st.t);
    return { kind: KIND[f] || "?", period, age, late: age > lim, release: RELEASE[key] || (eod ? "Yahoo Finance, giá đóng cửa phiên gần nhất (nguồn không chính thức)" : "") };
  }
  function freshBadge(s, key) {
    const f = freshness(s, key);
    const tip = `Số liệu kỳ ${f.period}, cũ ${f.age} ngày. ${f.release}${f.late ? ". Nguồn chưa cập nhật đúng lịch." : ""}`;
    return `<span class="fr${f.late ? " late" : ""}" title="${esc(tip)}">${f.kind}</span><span class="dim">${f.period}${f.late ? ` · <b class="down">TRỄ LỊCH ${f.age}N</b>` : ""}</span>`;
  }

  // ------------------------------------------------------------------ data
  const bust = "?v=" + Math.floor(Date.now() / 300000);
  const getJSON = (u) => fetch(u + bust, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  function ser(ref) {
    const [g, k] = ref.split(".");
    const grp = G[g];
    if (!grp) return null;
    if (g === "agri") return (grp.prices || {})[k] || null;
    return (grp.series || {})[k] || null;
  }

  function allSeries() {
    const out = [];
    for (const g of GROUPS) {
      const grp = G[g];
      if (!grp) continue;
      const src = g === "agri" ? grp.prices : grp.series;
      for (const k in src || {}) if (src[k]) out.push({ ref: g + "." + k, key: k, s: src[k] });
    }
    return out;
  }

  // ------------------------------------------------------------------ small charts
  function spark(s, years) {
    const cut = s.st.t - (years || 5) * 365;
    const d = s.d.filter((p) => p[0] >= cut);
    if (d.length < 2) return "";
    let lo = Infinity, hi = -Infinity;
    for (const p of d) { if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; }
    const W = 240, H = 44, x0 = d[0][0], xs = (d[d.length - 1][0] - x0) || 1, ys = (hi - lo) || 1;
    const pts = d.map((p) => ((p[0] - x0) / xs * W).toFixed(1) + "," + (H - 3 - (p[1] - lo) / ys * (H - 6)).toFixed(1)).join(" ");
    const zero = lo < 0 && hi > 0 ? `<line x1="0" x2="${W}" y1="${(H - 3 - (0 - lo) / ys * (H - 6)).toFixed(1)}" y2="${(H - 3 - (0 - lo) / ys * (H - 6)).toFixed(1)}" stroke="#333" stroke-dasharray="2 3"/>` : "";
    const up = d[d.length - 1][1] >= d[0][1];
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${zero}<polyline fill="none" stroke="${up ? C.amber : C.blue}" stroke-width="1.4" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`;
  }

  function pbar(st) {
    if (st.pct == null) return "";
    const p10 = st.pct10 != null ? st.pct10 : st.pct;
    return `<div class="pbar" title="Vạch vàng: phân vị 10 năm (${p10}%). Vạch xám: phân vị toàn lịch sử (${st.pct}%)"><i class="full" style="left:calc(${st.pct}% - 1px)"></i><i style="left:calc(${p10}% - 1px)"></i></div>
      <div class="plab"><span>thấp</span><span>phân vị 10 năm ${p10}% · toàn bộ ${st.pct}%</span><span>cao</span></div>`;
  }

  function reading(key, st) {
    const kb = KB[key];
    if (!kb) return "";
    const lv = level(st);
    if (lv === "mid") return "Vùng giữa của lịch sử: " + kb.what;
    const side = kb[lv] || ["", ""];
    return side[1] || side[0] || kb.what;
  }

  function tile(ref, opt) {
    const s = ser(ref);
    if (!s) return `<div class="tile"><div class="tn">${esc((opt && opt.name) || ref)}</div><div class="dim small">chưa có dữ liệu (nguồn lỗi lần quét này)</div></div>`;
    const key = ref.split(".")[1], st = s.st, lv = level(st);
    const short = s.freq === "d" || s.freq === "w";
    return `<div class="tile" data-ref="${ref}">
      <div class="tn" title="${esc(s.name)}">${esc(s.name)}</div>
      <div class="tv">${fmt(st.v, s.unit)} <small>${esc(s.unit)}</small> <span class="tag ${lv}">${LEVEL_TXT[lv]}</span></div>
      <div class="tc">${short ? chgSpan(s, "w", "1T") + chgSpan(s, "m", "1Th") : chgSpan(s, "prev", "kỳ trước")}${chgSpan(s, "y", "1N")}</div>
      <div class="tc">${freshBadge(s, key)}</div>
      ${spark(s, opt && opt.years)}
      ${pbar(st)}
      <div class="tr">${esc(reading(key, st))}</div>
    </div>`;
  }

  const tiles = (refs) => `<div class="tiles">${refs.map((r) => tile(r)).join("")}</div>`;

  // ------------------------------------------------------------------ uPlot helpers
  const charts = [];
  function killCharts() { while (charts.length) { try { charts.pop().destroy(); } catch (e) { /* already gone */ } } }

  function recessions() {
    const r = G.grow && G.grow.series && G.grow.series.usrec;
    if (!r) return [];
    const out = [];
    let start = null;
    for (const [t, v] of r.d) {
      if (v >= 1 && start == null) start = t;
      if (v < 1 && start != null) { out.push([start * DAY, t * DAY]); start = null; }
    }
    if (start != null) out.push([start * DAY, r.st.t * DAY]);
    return out;
  }

  function shadePlugin() {
    const rec = recessions();
    return { hooks: { drawClear: [(u) => {
      const { ctx } = u, { left, top, width, height } = u.bbox;
      ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.055)";
      for (const [a, b] of rec) {
        const x0 = u.valToPos(a, "x", true), x1 = u.valToPos(b, "x", true);
        if (x1 < left || x0 > left + width) continue;
        ctx.fillRect(Math.max(x0, left), top, Math.min(x1, left + width) - Math.max(x0, left), height);
      }
      ctx.restore();
    }] } };
  }

  function hlinePlugin(lines) {
    return { hooks: { draw: [(u) => {
      const { ctx } = u, { left, width } = u.bbox;
      for (const ln of lines) {
        if (ln.v == null) continue;
        const y = u.valToPos(ln.v, "y", true);
        if (y < u.bbox.top || y > u.bbox.top + u.bbox.height) continue;
        ctx.save(); ctx.strokeStyle = ln.color || "#555"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + width, y); ctx.stroke();
        if (ln.label) { ctx.fillStyle = ln.color || "#777"; ctx.font = "11px JetBrains Mono, monospace"; ctx.fillText(ln.label, left + 6, y - 4); }
        ctx.restore();
      }
    }] } };
  }

  const axis = (extra) => Object.assign({ stroke: C.dim, grid: { stroke: C.grid, width: 1 }, ticks: { stroke: C.grid, width: 1 }, font: "11px JetBrains Mono, monospace" }, extra || {});

  function width(el) { return Math.max(280, el.clientWidth - 4); }

  /* time-series chart; list = [{label, d:[[days,v]], color, scale}] */
  function tsChart(el, list, o) {
    o = o || {};
    list = list.filter((x) => x && x.d && x.d.length);
    if (!list.length) { el.innerHTML = '<p class="dim">Chưa có dữ liệu.</p>'; return null; }
    const tables = list.map((x) => [x.d.map((p) => p[0] * DAY), x.d.map((p) => p[1])]);
    const data = tables.length === 1 ? tables[0] : uPlot.join(tables);
    const scales = { x: { time: true } };
    if (o.log) scales.y = { distr: 3 };
    const series = [{}].concat(list.map((x, i) => ({
      label: x.label, stroke: x.color || PALETTE[i % PALETTE.length], width: x.width || 1.5, spanGaps: true, scale: x.scale || "y",
      value: (u, v) => v == null ? "–" : fmt(v, x.unit),
    })));
    const axes = [axis(), axis({ size: 60, values: (u, vals) => vals.map((v) => v == null ? "" : fmt(v, list[0].unit)) })];
    if (list.some((x) => x.scale === "y2")) { axes.push(axis({ side: 1, scale: "y2", grid: { show: false }, size: 60 })); scales.y2 = {}; }
    const plugins = [];
    if (o.shade !== false) plugins.push(shadePlugin());
    if (o.lines) plugins.push(hlinePlugin(o.lines));
    const u = new uPlot({ width: width(el), height: o.height || 320, scales, series, axes, plugins, legend: { show: list.length > 1 || !!o.legend },
      cursor: { drag: { x: true, y: false } } }, data, el);
    charts.push(u);
    if (o.years) setRange(u, o.years);
    return u;
  }

  function setRange(u, years) {
    const xs = u.data[0];
    const max = xs[xs.length - 1];
    const min = years === "MAX" ? xs[0] : Math.max(xs[0], max - years * 365.25 * DAY);
    u.setScale("x", { min, max });
  }

  function rangeButtons(def) {
    return ["1", "5", "10", "20", "MAX"].map((y) => `<button class="rb${String(def) === y ? " on" : ""}" data-y="${y}">${y === "MAX" ? "MAX" : y + "N"}</button>`).join("");
  }
  function wireRange(box, u) {
    if (!u) return;
    box.querySelectorAll(".rb[data-y]").forEach((b) => b.addEventListener("click", () => {
      box.querySelectorAll(".rb[data-y]").forEach((x) => x.classList.toggle("on", x === b));
      setRange(u, b.dataset.y === "MAX" ? "MAX" : +b.dataset.y);
    }));
  }

  /* panel with a time-series chart and range buttons */
  function chartPanel(cls, code, title, list, o) {
    const id = "c" + Math.random().toString(36).slice(2, 8);
    return { html: `<section class="panel ${cls}"><div class="ph"><span class="code">${code}</span><h2>${esc(title)}</h2><div class="right">${rangeButtons((o && o.years) || 10)}</div></div><div class="pb">${o && o.intro ? `<p class="intro">${o.intro}</p>` : ""}<div class="chart" id="${id}"></div></div></section>`,
      after: () => { const el = document.getElementById(id); const u = tsChart(el, list, Object.assign({ years: 10 }, o)); wireRange(el.closest(".panel"), u); } };
  }

  // ------------------------------------------------------------------ two-sided box
  function twoSided(key, st, kbo) {
    const kb = kbo || KB[key];
    if (!kb) return "";
    const lv = st ? level(st) : "mid";
    const side = (lvl, title) => {
      const [risk, opp] = kb[lvl] || ["", ""];
      if (!risk && !opp) return "";
      return `<div class="two">${risk ? `<div class="side risk"><h4>▼ MẶT RỦI RO ${title}</h4><p>${esc(risk)}</p></div>` : ""}${opp ? `<div class="side opp"><h4>▲ MẶT CƠ HỘI ${title}</h4><p>${esc(opp)}</p></div>` : ""}</div>`;
    };
    let body = `<p class="what">${esc(kb.what)}</p>`;
    if (lv === "mid") {
      body += `<p class="dim small">Hiện đang ở vùng giữa của 10 năm qua. Hai kịch bản ở hai đầu:</p>` + side("hi", "KHI CAO") + "<div style=\"height:8px\"></div>" + side("lo", "KHI THẤP");
    } else {
      const other = lv === "hi" ? "lo" : "hi";
      body += `<p class="small"><span class="tag ${lv}">HIỆN TẠI ${LEVEL_TXT[lv]}</span> <span class="dim">so với 10 năm qua</span></p>` + side(lv, "") +
        (kb[other] && (kb[other][0] || kb[other][1]) ? `<details class="other"><summary>Khi ${LEVEL_TXT[other].toLowerCase()} thì sao?</summary>${side(other, "")}</details>` : "");
    }
    if (kb.who) body += `<p class="who">⇄ ${esc(kb.who)}</p>`;
    return body;
  }

  // ------------------------------------------------------------------ screens
  const SCREENS = {};
  let after = [];

  SCREENS.HOME = () => {
    const cyc = G.cycle;
    const ph = cyc && cyc.phase && KB_PHASE[cyc.phase];
    const opps = opportunityMap();
    const keyRefs = ["rates.fedfunds", "rates.us10y", "rates.s10y2y", "rates.real10y", "infl.corepce", "grow.unrate", "liq.hyoas", "liq.netliq", "liq.buffett", "energy.crude", "assets.gold", "assets.spx"];
    const soon = upcoming(10).filter((e) => e.r.imp >= 2);
    return `<h1 class="title">TỔNG QUAN <small>bức tranh vĩ mô trung và dài hạn, cập nhật tự động</small></h1>
      <section class="panel"><div class="ph"><span class="code">DECI</span><h2>Gió xuôi, gió ngược theo tài sản (6-18 tháng)</h2><a href="#DECI" class="amber small" style="margin-left:auto">Chi tiết từng yếu tố ›</a></div><div class="pb">${board()}</div></section>
      <section class="panel s8"><div class="ph"><span class="code">OPPS</span><h2>Bản đồ cơ hội: chỉ báo đang ở cực trị 10 năm</h2></div>
        <p class="intro pb" style="padding-bottom:0">Những con số đang ở top 15% cao nhất hoặc thấp nhất của 10 năm qua. Cực trị là nơi cơ hội trung và dài hạn hình thành, và mỗi cực trị đều có hai mặt.</p>
        ${opps.length ? `<ul class="opps">${opps.slice(0, 14).map((o) => `<li data-ref="${o.ref}"><span class="tag ${o.lv}">${LEVEL_TXT[o.lv]}</span><span class="nm">${esc(o.s.name)}: ${fmt(o.s.st.v, o.s.unit)} ${esc(o.s.unit)} <span class="dim small">(phân vị 10 năm ${o.p}%)</span> <span class="small">${freshBadge(o.s, o.ref.split(".")[1])}</span></span><div class="sides">${o.risk ? `<span class="r">${esc(o.risk)}</span>` : "<i></i>"}${o.opp ? `<span class="o">${esc(o.opp)}</span>` : ""}</div></li>`).join("")}</ul>` : '<p class="dim pb">Không có chỉ báo nào ở cực trị lúc này.</p>'}
      </section>
      <section class="panel s4"><div class="ph"><span class="code">CYCL</span><h2>Chu kỳ kinh tế</h2></div><div class="pb">
        ${ph ? `<div class="phase">${ph.name}</div><div class="dim small">${ph.sub} · tài sản thường dẫn đầu: <b class="amber">${ph.best}</b></div><div class="clock" id="mini-clock"></div><p class="small">${esc(ph.txt)}</p>` : '<p class="dim">Chưa có dữ liệu chu kỳ.</p>'}
        ${cyc && cyc.checks ? `<h4 class="amber small" style="margin:10px 0 4px">TÍN HIỆU SUY THOÁI: ${cyc.checks.filter((c) => c.on).length}/${cyc.checks.length} đang bật</h4>` : ""}
        <p><a href="#CYCL" class="amber small">Xem chi tiết ›</a></p></div></section>
      <section class="panel"><div class="ph"><span class="code">CAL</span><h2>Sắp công bố (10 ngày)</h2></div><div class="pb scroll">
        ${soon.length ? `<table class="cal">${soon.map((e) => calRow(e, false)).join("")}</table>` : '<p class="dim small">Không có số liệu lớn nào trong 10 ngày tới.</p>'}
        <p><a href="#CAL" class="amber small">Lịch đầy đủ ›</a></p></div></section>
      ${tiles(keyRefs)}`;
  };
  SCREENS.HOME.after = () => { const el = $("#mini-clock"); if (el) drawClock(el, true); };

  function opportunityMap() {
    const out = [];
    for (const { ref, key, s } of allSeries()) {
      const kb = KB[key];
      if (!kb || key === "usrec" || !s.st) continue;
      const p = s.st.pct10 != null ? s.st.pct10 : s.st.pct;
      if (p == null || (p > 15 && p < 85)) continue;
      // stale series (no new point for ~1.5 years) are not an opportunity signal
      if (Date.now() / 1000 / DAY - s.st.t > 550) continue;
      const lv = p >= 85 ? "hi" : "lo", side = kb[lv] || ["", ""];
      if (!side[0] && !side[1]) continue;
      out.push({ ref, s, p, lv, risk: side[0], opp: side[1], ext: Math.max(p, 100 - p) });
    }
    return out.sort((a, b) => b.ext - a.ext);
  }

  SCREENS.CURV = () => {
    const cv = G.rates && G.rates.curve;
    const r = (k) => ser("rates." + k);
    const cp = chartPanel("s12", "SPRD", "Chênh lệch 10 năm - 2 năm và 10 năm - 3 tháng (vùng xám là suy thoái Mỹ)", [
      r("s10y2y") && { label: "10Y-2Y", d: r("s10y2y").d, unit: "%" }, r("s10y3m") && { label: "10Y-3M", d: r("s10y3m").d, unit: "%", color: C.blue }], { years: 20, lines: [{ v: 0, color: C.red, label: "0: đảo ngược" }], legend: true,
      intro: "Dưới 0 là đường cong đảo ngược: lãi ngắn hạn cao hơn dài hạn. Lịch sử Mỹ: hầu hết các lần đảo ngược kéo dài đều đi trước một cuộc suy thoái; thời điểm nguy hiểm nhất thường là lúc đường cong dốc lên trở lại." });
    after.push(cp.after);
    return `<h1 class="title">ĐƯỜNG CONG LỢI SUẤT <small>US Treasury, hằng ngày</small></h1>
      <section class="panel s7"><div class="ph"><span class="code">CURV</span><h2>Đường cong lợi suất Mỹ</h2><div class="right" id="snap-btns"></div></div><div class="pb"><div class="chart" id="curve-chart"></div></div></section>
      <section class="panel s5"><div class="ph"><span class="code">TBL</span><h2>Lợi suất theo kỳ hạn</h2></div><div class="pb scroll">${cv ? curveTable(cv) : '<p class="dim">Chưa có dữ liệu.</p>'}</div>
        <div class="pb">${twoSided("s10y2y", r("s10y2y") && r("s10y2y").st)}</div></section>
      ${cp.html}
      ${tiles(["rates.s10y2y", "rates.s10y3m", "rates.termprem", "rates.us2y", "rates.us10y", "rates.us30y"])}
      ${intlCurves()}`;
  };
  SCREENS.CURV.after = () => {
    const cv = G.rates && G.rates.curve, el = $("#curve-chart");
    if (!cv || !el) return;
    const xs = cv.tenors.map((_, i) => i);
    const shown = [0, 2, 4];
    const draw = () => {
      el.innerHTML = "";
      const data = [xs].concat(cv.snaps.map((s) => s.y));
      const u = new uPlot({ width: width(el), height: 300, scales: { x: { time: false } },
        series: [{ label: "Kỳ hạn", value: (u, v) => cv.tenors[v] || "" }].concat(cv.snaps.map((s, i) => ({ label: s.label + " (" + s.date.split("-").reverse().join("/") + ")", stroke: PALETTE[i % PALETTE.length], width: i === 0 ? 2.5 : 1.3, dash: i === 0 ? undefined : [5, 4], show: shown.includes(i), points: { show: true, size: 5 }, spanGaps: true, value: (u, v) => v == null ? "–" : nf(v, 2) + "%" }))),
        axes: [axis({ values: (u, vals) => vals.map((v) => cv.tenors[v] || ""), splits: () => xs }), axis({ size: 50, values: (u, vals) => vals.map((v) => nf(v, 2) + "%") })] }, data, el);
      charts.push(u);
    };
    draw();
  };

  function curveTable(cv) {
    const now = cv.snaps[0], find = (l) => cv.snaps.find((s) => s.label === l);
    const m1 = find("1 tháng trước"), y1 = find("1 năm trước");
    const bp = (a, b) => a == null || b == null ? "–" : `<span class="${a - b > 0 ? "up" : a - b < 0 ? "down" : ""}">${a - b >= 0 ? "+" : ""}${nf((a - b) * 100, 0)}</span>`;
    return `<table><tr><th>Kỳ hạn</th><th>Lợi suất</th><th>Δ 1 tháng (bp)</th><th>Δ 1 năm (bp)</th></tr>${cv.tenors.map((t, i) => `<tr><td>${t}</td><td>${now.y[i] == null ? "–" : nf(now.y[i], 2) + "%"}</td><td>${bp(now.y[i], m1 && m1.y[i])}</td><td>${bp(now.y[i], y1 && y1.y[i])}</td></tr>`).join("")}</table>
      <p class="dim small">Ngày ${now.date.split("-").reverse().join("/")}. 1 bp = 0,01%.</p>`;
  }

  const CURVE_STATE = { bull_steepener: "Dốc lên kiểu tăng giá: lãi ngắn giảm nhanh hơn (thị trường đón Fed cắt lãi)", bear_steepener: "Dốc lên kiểu giảm giá: lãi dài tăng nhanh hơn (lo lạm phát, nợ công)", bull_flattener: "Phẳng đi kiểu tăng giá: lãi dài giảm nhanh hơn (lo tăng trưởng)", bear_flattener: "Phẳng đi kiểu giảm giá: lãi ngắn tăng nhanh hơn (ngân hàng trung ương siết)", parallel_up: "Cả đường cong tăng song song", parallel_down: "Cả đường cong giảm song song", stable: "Gần như đứng yên trong 1 tháng" };
  function intlCurves() {
    const b = GLOBAL && GLOBAL.bonds && GLOBAL.bonds.curves;
    if (!b) return "";
    const rows = Object.entries(b).map(([k, c]) => {
      const cell = (t) => { const x = c.curve[t]; return x ? nf(x.value, 2) + "%" : "–"; };
      const st = c.state;
      return `<tr><td>${esc(c.name)}</td><td>${cell("2Y")}</td><td>${cell("5Y")}</td><td>${cell("10Y")}</td><td>${cell("30Y") !== "–" ? cell("30Y") : cell("20Y")}</td><td>${st ? nf(st.slope_bp, 0) : "–"}</td><td class="wrap">${st ? esc(CURVE_STATE[st.kind] || st.kind) : ""}</td><td class="dim small">${esc(c.source)}</td></tr>`;
    }).join("");
    return `<section class="panel"><div class="ph"><span class="code">WCRV</span><h2>Đường cong lợi suất các nước lớn</h2></div><div class="pb scroll"><table><tr><th>Nước</th><th>2Y</th><th>5Y</th><th>10Y</th><th>30Y</th><th>Độ dốc (bp)</th><th>Diễn biến 1 tháng</th><th>Nguồn</th></tr>${rows}</table></div></section>`;
  }

  SCREENS.RATE = () => {
    const r = (k) => ser("rates." + k);
    const cp = chartPanel("s12", "RATE", "Lãi suất Fed, lợi suất 2 năm, 10 năm và lợi suất thực", [
      r("fedfunds") && { label: "Lãi Fed", d: r("fedfunds").d, unit: "%" }, r("us2y") && { label: "2 năm", d: r("us2y").d, unit: "%", color: C.blue },
      r("us10y") && { label: "10 năm", d: r("us10y").d, unit: "%", color: C.green }, r("real10y") && { label: "Thực 10 năm", d: r("real10y").d, unit: "%", color: C.violet }],
      { years: 20, legend: true, lines: [{ v: 0, color: "#444" }], intro: "Khi lợi suất 2 năm nằm dưới lãi Fed, thị trường đang đặt cược Fed sẽ cắt lãi. Lợi suất thực (màu tím) là giá thật của tiền: càng cao càng thưởng cho người giữ tiền mặt và trái phiếu, càng gây áp lực lên vàng và cổ phiếu tăng trưởng." });
    after.push(cp.after);
    return `<h1 class="title">LÃI SUẤT VÀ CHÍNH SÁCH TIỀN TỆ</h1>
      ${tiles(["rates.fedfunds", "rates.us3m", "rates.us2y", "rates.us10y", "rates.real10y", "rates.termprem", "rates.mortgage", "rates.dollar"])}
      ${cp.html}
      ${policyTable()}
      <section class="panel"><div class="ph"><span class="code">2SID</span><h2>Lãi suất cao: hai mặt của cùng một đồng tiền</h2></div><div class="pb">${twoSided("fedfunds", r("fedfunds") && r("fedfunds").st)}</div></section>`;
  };

  function policyTable() {
    const pr = GLOBAL && GLOBAL.policy_rates;
    if (!pr || !pr.length) return "";
    const cpi = ser("infl.cpi");
    const rows = pr.map((x) => {
      const lc = x.lastChange;
      const real = x.area === "US" && cpi && x.rate != null ? nf(x.rate - cpi.st.v, 2) + "%" : "";
      return `<tr><td>${esc(x.bank)} <span class="dim">${esc(x.currency)}</span></td><td>${x.rate == null ? "–" : nf(x.rate, 2) + "%"}</td><td>${lc ? `<span class="${lc.bp > 0 ? "up" : "down"}">${lc.bp > 0 ? "+" : ""}${lc.bp} bp</span> <span class="dim">${lc.date.split("-").reverse().join("/")}</span>` : "–"}</td><td>${x.change12m_bp == null ? "–" : (x.change12m_bp > 0 ? "+" : "") + x.change12m_bp + " bp"}</td><td>${real}</td></tr>`;
    }).join("");
    return `<section class="panel"><div class="ph"><span class="code">WIRP</span><h2>Lãi suất điều hành 10 ngân hàng trung ương lớn</h2><span class="dim small right">BIS</span></div><div class="pb scroll"><table><tr><th>Ngân hàng</th><th>Lãi suất</th><th>Lần đổi gần nhất</th><th>12 tháng</th><th>Lãi thực (trừ CPI)</th></tr>${rows}</table>
      <p class="dim small">Chênh lệch lãi suất giữa các nước quyết định dòng tiền carry trade: vay đồng tiền lãi thấp (JPY, CHF) để gửi đồng tiền lãi cao. Khi chênh lệch thu hẹp đột ngột, carry trade bị đóng hàng loạt và thị trường biến động mạnh.</p></div></section>`;
  }

  SCREENS.INFL = () => {
    const i = (k) => ser("infl." + k);
    const cp = chartPanel("s12", "INFL", "CPI, CPI lõi và PCE lõi so với mục tiêu 2% của Fed", [
      i("cpi") && { label: "CPI", d: i("cpi").d, unit: "%" }, i("corecpi") && { label: "CPI lõi", d: i("corecpi").d, unit: "%", color: C.blue }, i("corepce") && { label: "PCE lõi", d: i("corepce").d, unit: "%", color: C.green }],
      { years: 20, legend: true, lines: [{ v: 2, color: C.yellow, label: "mục tiêu 2%" }, { v: 0, color: "#444" }], intro: "Lạm phát cao làm mất giá tiền mặt và trái phiếu, nhưng giảm giá trị thực của nợ: người vay nợ cố định và người sở hữu tài sản thực được lợi. Lạm phát dưới mục tiêu mở đường cho ngân hàng trung ương nới lỏng." });
    after.push(cp.after);
    return `<h1 class="title">LẠM PHÁT</h1>${tiles(["infl.cpi", "infl.corecpi", "infl.corepce", "infl.ppi", "infl.wages", "infl.be5y", "infl.fwd5y5y", "infl.mich"])}${cp.html}`;
  };

  SCREENS.GROW = () => {
    const g = (k) => ser("grow." + k);
    const cp = chartPanel("s12", "GROW", "Thất nghiệp và quy tắc Sahm", [g("unrate") && { label: "Thất nghiệp", d: g("unrate").d, unit: "%" }, g("sahm") && { label: "Sahm", d: g("sahm").d, unit: "%", color: C.red }],
      { years: 50, legend: true, lines: [{ v: 0.5, color: C.red, label: "Sahm 0,5" }], intro: "Thất nghiệp thấp nhất thường xuất hiện gần đỉnh chu kỳ, cao nhất thường gần đáy thị trường. Vùng xám là các cuộc suy thoái do NBER xác định." });
    after.push(cp.after);
    return `<h1 class="title">TĂNG TRƯỞNG VÀ VIỆC LÀM</h1>${tiles(["grow.gdp", "grow.gdpq", "grow.unrate", "grow.payrolls", "grow.claims", "grow.indpro", "grow.retail", "grow.sentiment", "grow.housing", "grow.cfnai", "grow.sahm"])}${cp.html}`;
  };

  SCREENS.LIQ = () => {
    const l = (k) => ser("liq." + k), a = ser("assets.spx");
    const cp = chartPanel("s12", "NLIQ", "Thanh khoản ròng (Fed - TGA - RRP) và S&P 500", [l("netliq") && { label: "Thanh khoản ròng (tỷ $)", d: l("netliq").d, unit: "tỷ $" }, a && { label: "S&P 500 (trục phải)", d: a.d, unit: "", color: C.blue, scale: "y2" }],
      { years: 10, legend: true, shade: false, intro: "Lượng tiền thật sự trôi nổi trong hệ thống tài chính. Khi nó tăng, tài sản rủi ro có gió xuôi; khi nó rút, chỉ những tài sản có dòng tiền thật mới đứng vững." });
    const vp = chartPanel("s12", "BUFF", "Chỉ báo Buffett và tỷ lệ tiền mặt đứng ngoài", [l("buffett") && { label: "Vốn hóa / GDP (%)", d: l("buffett").d, unit: "%" }, l("cash_ratio") && { label: "Tiền quỹ tiền tệ / vốn hóa (%, trục phải)", d: l("cash_ratio").d, unit: "%", color: C.green, scale: "y2" }],
      { years: "MAX", legend: true, intro: "Khi thị trường đắt so với nền kinh tế, Buffett tích tiền mặt (Berkshire giữ lượng tiền mặt kỷ lục) và chờ. Tiền mặt sinh lãi cao lúc lãi suất cao chính là chi phí cơ hội thấp để kiên nhẫn. Đường xanh cao nghĩa là nhiều tiền đứng ngoài, là nhiên liệu cho đợt tăng sau." });
    after.push(cp.after, vp.after);
    return `<h1 class="title">THANH KHOẢN, TÍN DỤNG, ĐỊNH GIÁ</h1>${tiles(["liq.netliq", "liq.fedbs", "liq.m2", "liq.rrp", "liq.tga", "liq.nfci", "liq.hyoas", "liq.igoas", "liq.lending"])}${cp.html}
      <h1 class="title">TIỀN MẶT VÀ ĐỊNH GIÁ <small>câu chuyện tiền mặt khổng lồ của Buffett</small></h1>${tiles(["liq.buffett", "liq.cash_ratio", "liq.mmf"])}${vp.html}`;
  };

  SCREENS.ENGY = () => {
    const keys = ["crude", "gasoline", "distillate", "cushing", "natgas"];
    const seasonals = keys.map((k) => {
      const s = ser("energy." + k);
      if (!s || !s.season) return "";
      const vs = s.season.vs5y_pct;
      return `<section class="panel s6"><div class="ph"><span class="code">${k.slice(0, 4).toUpperCase()}</span><h2>${esc(s.name)}</h2><span class="right small">${fmt(s.st.v, s.unit)} ${esc(s.unit)} · tuần ${s.st.chg_w >= 0 ? "+" : ""}${fmt(s.st.chg_w, s.unit)} · <b class="${vs > 0 ? "blue" : "amber"}">${vs > 0 ? "+" : ""}${nf(vs, 1)}% so với TB 5 năm</b></span></div>
        <div class="pb"><div class="chart" data-season="${k}"></div><p class="dim small">Dải xám: thấp nhất đến cao nhất ${s.season.range}, nét đứt: trung bình 5 năm. Ngày ${date(s.st.t)}. Bấm tiêu đề để xem lịch sử dài.</p></div></section>`;
    }).join("");
    const w = ser("energy.wti");
    const cp = chartPanel("s12", "OIL", "Giá dầu WTI, Brent và khí Henry Hub", [w && { label: "WTI", d: w.d, unit: "$/thùng" }, ser("energy.brent") && { label: "Brent", d: ser("energy.brent").d, unit: "$/thùng", color: C.blue }, ser("energy.henryhub") && { label: "Henry Hub (trục phải)", d: ser("energy.henryhub").d, unit: "$/MMBtu", color: C.green, scale: "y2" }], { years: 20, legend: true });
    after.push(cp.after);
    return `<h1 class="title">NĂNG LƯỢNG <small>tồn kho EIA hằng tuần so với mùa vụ 5 năm</small></h1>
      <p class="intro" style="grid-column:span 12">Tồn kho thấp hơn trung bình 5 năm cùng tuần là thị trường thiếu hàng (giá dễ tăng, nhà sản xuất có lợi); cao hơn là dư thừa (giá bị ép, người tiêu dùng có lợi, và là lúc cổ phiếu năng lượng thường rẻ). Số liệu sản lượng OPEC không có nguồn tự động miễn phí ổn định nên chưa đưa vào.</p>
      ${seasonals}${tiles(["energy.production", "energy.refutil", "energy.spr", "energy.wti", "energy.brent", "energy.henryhub"])}${cp.html}
      <section class="panel"><div class="ph"><span class="code">2SID</span><h2>Đọc tồn kho dầu thô hai mặt</h2></div><div class="pb">${twoSided("crude", ser("energy.crude") && seasonLevel(ser("energy.crude")))}</div></section>`;
  };
  // for inventories the meaningful comparison is the seasonal 5-year average, not the raw history
  const seasonLevel = (s) => s.season && s.season.vs5y_pct != null ? { pct10: s.season.vs5y_pct > 4 ? 90 : s.season.vs5y_pct < -4 ? 10 : 50 } : s.st;

  SCREENS.ENGY.after = () => {
    document.querySelectorAll("[data-season]").forEach((el) => {
      const s = ser("energy." + el.dataset.season), se = s.season, years = Object.keys(se.years).sort();
      const wk = se.band.map((b) => b[0]);
      const yv = (y) => { const m = Object.fromEntries(se.years[y] || []); return wk.map((w) => m[w] == null ? null : m[w]); };
      const data = [wk, se.band.map((b) => b[1]), se.band.map((b) => b[2]), se.band.map((b) => b[3]), yv(years[0]), yv(years[1])];
      const u = new uPlot({ width: width(el), height: 240, scales: { x: { time: false } },
        series: [{ label: "Tuần", value: (u, v) => v }, { label: "Thấp nhất 5N", stroke: "#444", width: 1 }, { label: "TB 5 năm", stroke: C.dim, dash: [5, 4], width: 1.2 }, { label: "Cao nhất 5N", stroke: "#444", width: 1 },
          { label: years[0], stroke: C.blue, width: 1.3 }, { label: years[1], stroke: C.amber, width: 2.2 }].map((x, i) => i ? Object.assign(x, { points: { show: false }, value: (u, v) => v == null ? "–" : fmt(v, s.unit) }) : x),
        bands: [{ series: [3, 1], fill: "rgba(255,255,255,0.07)" }],
        axes: [axis({ values: (u, vals) => vals.map((v) => "T" + v) }), axis({ size: 55 })] }, data, el);
      charts.push(u);
      el.closest(".panel").querySelector("h2").style.cursor = "pointer";
      el.closest(".panel").querySelector("h2").addEventListener("click", () => go("S/energy/" + el.dataset.season));
    });
  };

  SCREENS.AGRI = () => {
    const a = G.agri;
    if (!a || !a.crops || !Object.keys(a.crops).length) return '<h1 class="title">NÔNG SẢN</h1><p class="dim">Chưa có dữ liệu USDA lần quét này.</p>';
    const cards = Object.entries(a.crops).map(([k, c]) => {
      const w = c.world, us = c.us, lw = w && w.rows[w.rows.length - 1], lu = us && us.rows[us.rows.length - 1];
      const lvl = (p) => p == null ? "mid" : p >= 80 ? "hi" : p <= 20 ? "lo" : "mid";
      const price = a.prices && a.prices[k];
      return `<section class="panel s6 crop"><div class="ph"><span class="code">${k.slice(0, 4).toUpperCase()}</span><h2>${esc(c.name)}</h2><span class="right dim small">USDA ${esc(c.updated || "")} · ${esc(c.unit)}</span></div><div class="pb">
        <div class="two">
          <div>${lw ? `<div class="dim small">THẾ GIỚI vụ ${lw.y}/${String(lw.y + 1).slice(2)}</div><div class="big">${lw.stu == null ? "–" : nf(lw.stu, 1) + "%"} <span class="tag ${lvl(w.stu_pct)}">${LEVEL_TXT[lvl(w.stu_pct)]}</span></div><div class="small dim">tồn kho/sử dụng · phân vị ${w.stu_pct}% (${w.rows.length} vụ)</div><div class="small">Sản lượng ${nf(lw.prod, 0)} · Tồn cuối ${nf(lw.end, 0)}</div>` : ""}</div>
          <div>${lu ? `<div class="dim small">MỸ vụ ${lu.y}/${String(lu.y + 1).slice(2)}</div><div class="big">${lu.stu == null || lu.stu > 500 ? "–" : nf(lu.stu, 1) + "%"} <span class="tag ${lvl(us.stu_pct)}">${LEVEL_TXT[lvl(us.stu_pct)]}</span></div><div class="small dim">tồn kho/(tiêu thụ + xuất khẩu) · phân vị ${us.stu_pct}%</div><div class="small">Sản lượng ${nf(lu.prod, 0)} · Tồn cuối ${nf(lu.end, 0)}</div>` : ""}</div>
        </div>
        <div class="chart" data-crop="${k}"></div>
        ${price ? `<div class="small" style="margin-top:6px">Giá tương lai: <b>${fmt(price.st.v, "")}</b> ${chgSpan(price, "y", "· 1 năm")} · phân vị 10 năm ${price.st.pct10}%</div>` : ""}
      </div></section>`;
    }).join("");
    return `<h1 class="title">NÔNG SẢN <small>bảng cân đối cung cầu WASDE (USDA), cập nhật hằng tháng</small></h1>
      <section class="panel"><div class="ph"><span class="code">WASD</span><h2>Cách đọc</h2></div><div class="pb">${twoSided(null, null, KB_AGRI)}</div></section>${cards}`;
  };
  SCREENS.AGRI.after = () => {
    document.querySelectorAll("[data-crop]").forEach((el) => {
      const c = G.agri.crops[el.dataset.crop];
      const years = [...new Set([...(c.world ? c.world.rows : []), ...(c.us ? c.us.rows : [])].map((r) => r.y))].sort((a, b) => a - b);
      const m = (sc) => { const x = Object.fromEntries((c[sc] ? c[sc].rows : []).map((r) => [r.y, r.stu != null && r.stu < 500 ? r.stu : null])); return years.map((y) => x[y] == null ? null : x[y]); };
      const bars = uPlot.paths.bars({ size: [0.7, 40] });
      const u = new uPlot({ width: width(el), height: 190, scales: { x: { time: false } },
        series: [{ label: "Vụ", value: (u, v) => v }, { label: "Thế giới %", stroke: C.amber, fill: "rgba(255,160,40,.35)", paths: bars, points: { show: false } }, { label: "Mỹ %", stroke: C.blue, width: 1.5, points: { show: false }, spanGaps: true }],
        axes: [axis({ values: (u, vals) => vals.map((v) => String(v)) }), axis({ size: 45, values: (u, vals) => vals.map((v) => v + "%") })] }, [years, m("world"), m("us")], el);
      charts.push(u);
    });
  };

  SCREENS.ASST = () => {
    const sp = ser("assets.spx"), real = ser("assets.spx_real");
    const cp = chartPanel("s12", "SPX", "S&P 500 danh nghĩa và sau lạm phát (thang log)", [sp && { label: "S&P 500", d: sp.d, unit: "" }, real && { label: "Sau lạm phát (giá hôm nay)", d: real.d, unit: "", color: C.blue }],
      { years: "MAX", log: true, legend: true, intro: "Thang log để thấy rõ tỷ lệ tăng giảm qua nhiều thập kỷ. Đường xanh cho thấy có những giai đoạn hơn 10 năm thị trường không tăng thực (1966-1982, 2000-2013): mua đắt thì phải chờ rất lâu." });
    const gp = chartPanel("s12", "RATIO", "Vàng / S&P 500 và Đồng / Vàng", [ser("assets.gold_spx") && { label: "Vàng / S&P", d: ser("assets.gold_spx").d, unit: "lần" }, ser("assets.copper_gold") && { label: "Đồng / Vàng ×1000 (trục phải)", d: ser("assets.copper_gold").d, unit: "", color: C.green, scale: "y2" }], { years: 20, legend: true });
    after.push(cp.after, gp.after);
    return `<h1 class="title">TÀI SẢN DÀI HẠN <small>giá tuần, toàn bộ lịch sử Yahoo Finance</small></h1>${tiles(["assets.spx", "assets.spx_real", "assets.ndx", "assets.gold", "assets.silver", "assets.copper", "assets.oil", "assets.dxy", "assets.btc", "assets.em", "assets.nikkei", "assets.tlt", "assets.gold_spx", "assets.copper_gold"].map((r) => r))}${cp.html}${gp.html}`;
  };

  SCREENS.DATA = () => {
    const rows = allSeries().filter((x) => x.key !== "usrec").map((x) => ({ ...x, f: freshness(x.s, x.key) }));
    const late = rows.filter((r) => r.f.late);
    const GN = { rates: "Lãi suất", infl: "Lạm phát", grow: "Tăng trưởng", liq: "Thanh khoản", energy: "Năng lượng", agri: "Nông sản", assets: "Tài sản" };
    const built = GROUPS.filter((g) => G[g]).map((g) => `${GN[g] || g}: ${ago(G[g].generated)}`).join(" · ");
    const crops = G.agri && G.agri.crops ? Object.values(G.agri.crops).map((c) => c.updated).filter(Boolean) : [];
    return `<h1 class="title">ĐỘ TRỄ VÀ ĐỘ TIN CẬY CỦA DỮ LIỆU <small>${rows.length} chuỗi · ${late.length ? `<b class="down">${late.length} trễ lịch</b>` : '<b class="up">tất cả đúng lịch</b>'}</small></h1>
      <section class="panel"><div class="ph"><span class="code">KEY</span><h2>Cách đọc nhãn</h2></div><div class="pb"><div class="stats">
        <div><span><span class="fr live">LIVE</span></span>Cập nhật vài giây một lần ngay trên trình duyệt (dải LIVE trên cùng). Giá hợp đồng perp trên Hyperliquid, bám sát giá thật nhưng có thể lệch nhẹ khi thị trường gốc đóng cửa.</div>
        <div><span><span class="fr">CUỐI NGÀY</span></span>Giá hoặc lợi suất đóng cửa phiên gần nhất. Trễ 1 đến vài ngày (nguồn đăng chậm, cuối tuần, ngày lễ).</div>
        <div><span><span class="fr">TUẦN</span></span>Công bố một lần mỗi tuần theo lịch (tồn kho EIA, trợ cấp thất nghiệp, bảng cân đối Fed).</div>
        <div><span><span class="fr">THÁNG</span></span>Công bố 2 đến 4 tuần sau khi tháng kết thúc (CPI, việc làm, PCE). Số hiển thị luôn là tháng trước hoặc tháng trước nữa.</div>
        <div><span><span class="fr">QUÝ</span></span>Công bố 4 đến 10 tuần sau khi quý kết thúc (GDP, chỉ báo Buffett). Có thể cũ tới 6-8 tháng.</div>
        <div><span><span class="fr late">TRỄ LỊCH</span></span>Đã quá hạn công bố bình thường mà chưa có số mới: nguồn lỗi, hoặc cơ quan chưa công bố (ví dụ chính phủ Mỹ đóng cửa).</div>
      </div><p class="dim small">Hệ thống quét mỗi giờ, nhưng mỗi nhóm chỉ tải lại khi đã cũ vài giờ, vì nguồn gốc không đổi nhanh hơn. Lần dựng gần nhất: ${built}.${crops.length ? ` WASDE mới nhất: ${esc(crops.sort().pop())}.` : ""}</p>
      <p class="dim small">Độ tin cậy: FRED, Bộ Tài chính Mỹ, BLS, BEA, EIA, USDA, BIS, ECB là số liệu chính thức. GDP, việc làm, doanh số bán lẻ thường bị sửa lại ở các tháng sau. Yahoo Finance là nguồn không chính thức: giá đúng nhưng có thể ngưng hoạt động bất cứ lúc nào.</p></div></section>
      <section class="panel"><div class="ph"><span class="code">AUDIT</span><h2>Từng chuỗi dữ liệu</h2></div><div class="pb scroll"><table>
        <tr><th>Chỉ báo</th><th>Nhóm</th><th>Loại</th><th>Kỳ số liệu</th><th>Cũ (ngày)</th><th>Trạng thái</th><th>Lịch công bố</th><th>Nguồn</th></tr>
        ${rows.sort((a, b) => (b.f.late - a.f.late) || (a.f.age - b.f.age)).map((r) => `<tr class="click" data-ref="${r.ref}"><td>${esc(r.s.name)}</td><td class="dim">${GN[r.ref.split(".")[0]] || ""}</td><td><span class="fr">${r.f.kind}</span></td><td>${r.f.period}</td><td>${r.f.age}</td><td>${r.f.late ? '<b class="down">TRỄ LỊCH</b>' : '<span class="up">đúng lịch</span>'}</td><td class="wrap">${esc(r.f.release)}</td><td class="dim small">${esc(r.s.src)}</td></tr>`).join("")}
      </table></div></section>`;
  };

  SCREENS.CYCL = () => {
    const cyc = G.cycle;
    if (!cyc || !cyc.trail || !cyc.trail.length) return '<h1 class="title">CHU KỲ</h1><p class="dim">Chưa có dữ liệu.</p>';
    const ph = KB_PHASE[cyc.phase] || {};
    const phases = Object.entries(KB_PHASE).map(([k, p]) => `<div class="side ${k === cyc.phase ? "opp" : ""}" style="${k === cyc.phase ? "border-color:#f5c400" : ""}"><h4 style="color:${k === cyc.phase ? C.yellow : C.amber}">${p.name} <span class="dim">· ${p.sub}</span></h4><p class="small">Thường dẫn đầu: <b>${p.best}</b>. ${esc(p.txt)}</p></div>`).join("");
    return `<h1 class="title">CHU KỲ KINH TẾ <small>đồng hồ đầu tư: động lượng tăng trưởng × động lượng lạm phát</small></h1>
      <section class="panel s7"><div class="ph"><span class="code">CLCK</span><h2>Đồng hồ chu kỳ, 36 tháng gần nhất</h2></div><div class="pb clock" id="clock-big"></div>
        <p class="dim small pb">Trục ngang: CFNAI trung bình 3 tháng (trên 0 là tăng trưởng trên xu hướng). Trục dọc: CPI cùng kỳ hôm nay trừ 6 tháng trước (trên 0 là lạm phát đang tăng tốc). Chấm sáng là tháng gần nhất. Đây là khung tham khảo, không phải quy luật: mỗi chu kỳ khác nhau.</p></section>
      <section class="panel s5"><div class="ph"><span class="code">NOW</span><h2>Đang ở pha</h2></div><div class="pb"><div class="phase">${ph.name || "–"}</div><div class="dim small">${ph.sub || ""}</div><p>${esc(ph.txt || "")}</p>
        <h4 class="amber small" style="margin:14px 0 4px">BẢNG KIỂM TRA SUY THOÁI</h4>
        <ul class="checks">${cyc.checks.map((c) => `<li><span class="dot ${c.on ? "on" : ""}"></span><span>${esc(c.txt)} <b class="${c.on ? "down" : "dim"}">${c.on ? "BẬT" : "tắt"}</b> <span class="dim small">(${nf(c.v, 2)})</span></span></li>`).join("")}</ul>
        <p class="dim small">Nhiều đèn cùng bật là lúc rủi ro suy thoái cao, và cũng là lúc người có tiền mặt, không nợ, chuẩn bị danh sách tài sản muốn mua.</p></div></section>
      <section class="panel"><div class="ph"><span class="code">PHSE</span><h2>Bốn pha và tài sản thường thắng</h2></div><div class="pb"><div class="two">${phases}</div></div></section>
      ${tiles(["grow.cfnai", "infl.cpi", "rates.s10y3m", "grow.sahm", "grow.claims", "liq.hyoas", "liq.lending", "grow.sentiment"])}`;
  };
  SCREENS.CYCL.after = () => { const el = $("#clock-big"); if (el) drawClock(el, false); };

  // ------------------------------------------------------------------ decision board (6-18 months)
  /* Each asset class gets a list of drivers. Every driver scores -2..+2 from what it is doing now, mostly
     its change over the last 6 months (the horizon cares about direction more than level), and says why
     in one line. The total is the sum over the drivers that have data, scaled to -100..+100. Nothing here
     is a forecast: it is a checklist of the macro winds behind or against each asset, with both sides. */
  const H6 = 182;
  function valAt(s, back) { const t = s.st.t - back; let v = null; for (const p of s.d) { if (p[0] <= t) v = p[1]; else break; } return v; }
  const d6 = (s) => { const b = valAt(s, H6); return b == null ? null : s.st.v - b; };
  const p6 = (s) => { const b = valAt(s, H6); return b ? (s.st.v / b - 1) * 100 : null; };
  function vsAvg40w(s) {
    const pts = s.d.filter((p) => p[0] > s.st.t - 280);
    if (pts.length < 8) return null;
    return (s.st.v / (pts.reduce((a, p) => a + p[1], 0) / pts.length) - 1) * 100;
  }
  const sg = (v, d) => (v >= 0 ? "+" : "") + nf(v, d);
  const bp = (v) => sg(v * 100, 0) + " bp";
  const step = (x, a, b) => x == null ? 0 : x >= b ? 2 : x >= a ? 1 : x <= -b ? -2 : x <= -a ? -1 : 0;

  const DRV = {
    real: (dir) => ({ ref: "rates.real10y", name: "Lợi suất thực 10 năm", f: (s) => { const d = d6(s); const sc = -dir * step(d == null ? null : d * 100, 25, 60);
      return [sc, `${nf(s.st.v, 2)}%, 6 tháng ${d == null ? "–" : bp(d)}. ${d > 0 ? "Tiền mặt và trái phiếu ngày càng hấp dẫn hơn, tài sản rủi ro bị so sánh gắt hơn." : "Chi phí cơ hội của việc cầm tài sản không trả lãi đang giảm."}`]; } }),
    us10y: () => ({ ref: "rates.us10y", name: "Lợi suất Mỹ 10 năm", f: (s) => { const d = d6(s); const sc = -step(d == null ? null : d * 100, 25, 60);
      return [sc, `${nf(s.st.v, 2)}%, 6 tháng ${d == null ? "–" : bp(d)}. Lãi Mỹ tăng hút vốn khỏi thị trường mới nổi, giảm thì ngược lại.`]; } }),
    dollar: (dir) => ({ ref: "rates.dollar", name: "Đồng USD (chỉ số rộng)", f: (s) => { const p = p6(s); const sc = -dir * step(p, 2, 5);
      return [sc, `6 tháng ${p == null ? "–" : sg(p, 1) + "%"}. ${p > 0 ? "USD mạnh làm tài sản tính bằng USD đắt hơn với phần còn lại của thế giới và rút vốn khỏi nước mới nổi." : "USD yếu đi thường đẩy giá hàng hóa, vàng, nước mới nổi lên."}`]; } }),
    fed: () => ({ ref: "rates.fedfunds", name: "Hướng lãi suất Fed", f: (s) => { const d = d6(s); const sc = d == null ? 0 : d <= -0.75 ? 2 : d <= -0.2 ? 1 : d >= 0.75 ? -2 : d >= 0.2 ? -1 : 0;
      return [sc, `${nf(s.st.v, 2)}%, 6 tháng ${d == null ? "–" : bp(d)}. ${sc > 0 ? "Fed đang cắt: tiền rẻ dần, có độ trễ 6-12 tháng mới thấm." : sc < 0 ? "Fed đang tăng: tiền đắt dần." : "Fed đứng yên."}`]; } }),
    netliq: () => ({ ref: "liq.netliq", name: "Thanh khoản ròng của Fed", f: (s) => { const p = p6(s); const sc = step(p, 2, 5);
      return [sc, `${nf(s.st.v / 1000, 2)} nghìn tỷ $, 6 tháng ${p == null ? "–" : sg(p, 1) + "%"}. ${p > 0 ? "Tiền trong hệ thống đang tăng, nâng đỡ tài sản rủi ro." : "Tiền đang bị rút khỏi hệ thống."}`]; } }),
    m2: () => ({ ref: "liq.m2", name: "Cung tiền M2 (cùng kỳ)", f: (s) => { const d = d6(s); let sc = s.st.v > 6 ? 1 : s.st.v < 2 ? -1 : 0; if (d != null) sc += d > 1 ? 1 : d < -1 ? -1 : 0; sc = Math.max(-2, Math.min(2, sc));
      return [sc, `${nf(s.st.v, 1)}%/năm, 6 tháng ${d == null ? "–" : sg(d, 1) + " điểm %"}. Tiền in thêm cần chỗ để đi.`]; } }),
    hy: () => ({ ref: "liq.hyoas", name: "Chênh lệch trái phiếu rác", f: (s) => { const d = d6(s);
      if (s.st.v >= 6.5) return [2, `${nf(s.st.v, 2)}%: thị trường tín dụng đang sợ hãi. Lịch sử: mua khi chênh lệch trên 6-7% cho lợi nhuận 12-18 tháng rất tốt, với người chịu được biến động.`];
      let sc = d == null ? 0 : d >= 1 ? -2 : d >= 0.4 ? -1 : d <= -0.3 ? 1 : 0;
      if (s.st.v < 3 && sc > 0) sc = 0;
      return [sc, `${nf(s.st.v, 2)}%, 6 tháng ${d == null ? "–" : bp(d)}. ${d > 0.4 ? "Đang nới rộng: rủi ro tín dụng tăng, thường đi trước cổ phiếu." : s.st.v < 3.2 ? "Rất hẹp: thị trường chủ quan, ít đệm an toàn nếu có cú sốc." : "Tín dụng bình ổn."}`]; } }),
    nfci: () => ({ ref: "liq.nfci", name: "Điều kiện tài chính (NFCI)", f: (s) => { const d = d6(s); let sc = d == null ? 0 : d > 0.15 ? -1 : d < -0.15 ? 1 : 0; if (s.st.v > 0) sc -= 1; sc = Math.max(-2, Math.min(2, sc));
      return [sc, `${nf(s.st.v, 2)} (dưới 0 là dễ hơn trung bình), 6 tháng ${d == null ? "–" : sg(d, 2)}.`]; } }),
    curve: () => ({ ref: "rates.s10y3m", name: "Đường cong 10 năm - 3 tháng", f: (s) => { const min18 = Math.min(...s.d.filter((p) => p[0] > s.st.t - 548).map((p) => p[1]));
      if (s.st.v < 0) return [-1, `${nf(s.st.v, 2)}%: đang đảo ngược, tín hiệu suy thoái cổ điển (độ trễ 6-18 tháng).`];
      if (min18 < 0) return [-1, `${nf(s.st.v, 2)}%: vừa thoát đảo ngược trong 18 tháng qua. Lịch sử: suy thoái hay bắt đầu đúng giai đoạn này, không phải lúc còn đảo ngược.`];
      return [s.st.v > 1 ? 1 : 0, `${nf(s.st.v, 2)}%: dốc dương bình thường, không có tín hiệu suy thoái từ đường cong.`]; } }),
    recess: (dir) => ({ ref: "cycle", name: "Bảng kiểm tra suy thoái", f: () => { const c = G.cycle && G.cycle.checks; if (!c) return null; const n = c.filter((x) => x.on).length;
      const sc = dir > 0 ? (n >= 3 ? -2 : n === 2 ? -1 : n === 0 ? 1 : 0) : (n >= 2 ? 1 : 0);
      return [sc, `${n}/${c.length} đèn đang bật. ${dir > 0 ? (n >= 2 ? "Rủi ro suy thoái tăng: lợi nhuận doanh nghiệp dễ bị hạ." : "Chưa thấy nhiều dấu hiệu suy thoái.") : (n >= 2 ? "Rủi ro suy thoái là lực đỡ cho tài sản trú ẩn." : "Ít nhu cầu trú ẩn từ suy thoái.")}`]; } }),
    phase: (tbl) => ({ ref: "cycle", name: "Pha chu kỳ kinh tế", f: () => { const p = G.cycle && G.cycle.phase; if (!p) return null; const k = KB_PHASE[p] || {};
      return [tbl[p] || 0, `Đang ở pha ${k.name || p} (${k.sub || ""}). Tài sản thường dẫn đầu pha này: ${k.best || "–"}.`]; } }),
    buffett: () => ({ ref: "liq.buffett", name: "Định giá (chỉ báo Buffett)", f: (s) => { const p = s.st.pct10 != null ? s.st.pct10 : s.st.pct; const sc = p >= 85 ? -1 : p <= 25 ? 1 : 0;
      return [sc, `${nf(s.st.v, 0)}% GDP, phân vị 10 năm ${p}%. Định giá tác động chủ yếu ở khung 3-5 năm nên chỉ tính nhẹ; đắt không có nghĩa sắp giảm.`]; } }),
    trend: (ref, name) => ({ ref, name: name || "Xu hướng giá (so với TB 40 tuần)", f: (s) => { const x = vsAvg40w(s); if (x == null) return null; const sc = x > 3 ? 1 : x < -3 ? -1 : 0;
      return [sc, `Giá ${sg(x, 1)}% so với trung bình 40 tuần (~200 phiên). ${sc > 0 ? "Xu hướng tăng: đi ngược xu hướng 6-18 tháng thường tốn kém." : sc < 0 ? "Xu hướng giảm: chưa có xác nhận đảo chiều." : "Đi ngang."}`]; } }),
    be: () => ({ ref: "infl.be5y", name: "Lạm phát kỳ vọng 5 năm", f: (s) => { const d = d6(s); const sc = step(d == null ? null : d * 100, 20, 50);
      return [sc, `${nf(s.st.v, 2)}%, 6 tháng ${d == null ? "–" : bp(d)}. Kỳ vọng lạm phát tăng là lực đẩy cho tài sản thực.`]; } }),
    goldspx: () => ({ ref: "assets.gold_spx", name: "Vàng so với cổ phiếu", f: (s) => { const p = s.st.pct10 != null ? s.st.pct10 : s.st.pct; const sc = p <= 20 ? 1 : p >= 85 ? -1 : 0;
      return [sc, `Tỷ lệ ${nf(s.st.v, 2)}, phân vị 10 năm ${p}%. ${p >= 85 ? "Vàng đã đắt so với cổ phiếu." : p <= 20 ? "Vàng rẻ so với cổ phiếu." : "Không cực trị."}`]; } }),
    crude5y: () => ({ ref: "energy.crude", name: "Tồn kho dầu thô so với 5 năm", f: (s) => { const v = s.season && s.season.vs5y_pct; if (v == null) return null; const sc = v < -4 ? 1 : v > 4 ? -1 : 0;
      return [sc, `${sg(v, 1)}% so với trung bình 5 năm cùng tuần. ${v < 0 ? "Thị trường đang thiếu hàng tương đối." : "Thị trường dư hàng tương đối."}`]; } }),
    cugold: () => ({ ref: "assets.copper_gold", name: "Đồng / vàng (tín hiệu tăng trưởng)", f: (s) => { const p = p6(s); const sc = step(p, 5, 15);
      return [sc, `6 tháng ${p == null ? "–" : sg(p, 1) + "%"}. ${p > 0 ? "Thị trường đặt cược kinh tế mạnh lên." : "Thị trường thiên về phòng thủ hơn là tăng trưởng."}`]; } }),
    indpro: () => ({ ref: "grow.indpro", name: "Sản xuất công nghiệp", f: (s) => { const d = d6(s); const sc = d == null ? 0 : d > 1 ? 1 : d < -1 ? -1 : 0;
      return [sc, `${sg(s.st.v, 1)}%/năm, 6 tháng ${d == null ? "–" : sg(d, 1) + " điểm %"}. Nhu cầu nguyên liệu đi theo nhà máy.`]; } }),
    stu: () => ({ ref: "agri", name: "Tồn kho nông sản thế giới (WASDE)", f: () => { const cr = G.agri && G.agri.crops; if (!cr) return null; let tight = [], loose = [];
      for (const k in cr) { const rows = cr[k].world && cr[k].world.rows; if (!rows || rows.length < 10) continue; const last = rows[rows.length - 1].stu, hist = rows.slice(-21, -1).map((r) => r.stu); const p = hist.filter((x) => x < last).length / hist.length * 100; if (p <= 25) tight.push(cr[k].name); else if (p >= 75) loose.push(cr[k].name); }
      const sc = tight.length >= loose.length + 2 ? 1 : loose.length >= tight.length + 2 ? -1 : 0;
      return [sc, `Tồn kho/tiêu thụ thấp so với 20 vụ: ${tight.join(", ") || "không có"}. Dư thừa: ${loose.join(", ") || "không có"}.`]; } }),
    oilVN: () => ({ ref: "energy.wti", name: "Giá dầu (Việt Nam nhập khẩu ròng xăng dầu)", f: (s) => { const p = s.st.pct10 != null ? s.st.pct10 : s.st.pct; const sc = p >= 85 ? -1 : p <= 25 ? 1 : 0;
      return [sc, `${nf(s.st.v, 1)} $/thùng, phân vị 10 năm ${p}%. ${p >= 85 ? "Dầu đắt đẩy lạm phát và tỷ giá, NHNN khó nới." : p <= 25 ? "Dầu rẻ giúp lạm phát thấp, có dư địa nới tiền tệ." : "Không gây áp lực lớn."}`]; } }),
    vnd: () => ({ ref: "assets.usdvnd", name: "Tỷ giá USD/VND", f: (s) => { const p = p6(s); const sc = p == null ? 0 : p > 3 ? -2 : p > 1.5 ? -1 : p < 0 ? 1 : 0;
      return [sc, `${nf(s.st.v, 0)}, 6 tháng ${p == null ? "–" : sg(p, 1) + "%"}. ${p > 1.5 ? "VND mất giá nhanh: áp lực rút vốn ngoại, NHNN phải giữ lãi cao." : "Tỷ giá ổn định, NHNN có dư địa điều hành."}`]; } }),
  };

  const ASSET_BOARD = [
    { k: "us", name: "CỔ PHIẾU MỸ", ref: "assets.spx", drivers: [DRV.trend("assets.spx"), DRV.real(1), DRV.fed(), DRV.netliq(), DRV.hy(), DRV.curve(), DRV.recess(1), DRV.phase({ recovery: 2, overheat: 1, stagflation: -2, reflation: 0 }), DRV.buffett()],
      bull: "Điểm cao không có nghĩa là rẻ: định giá Mỹ có thể đang ở vùng đắt, nên lợi nhuận 5 năm vẫn có thể thấp dù 12 tháng tới thuận lợi.",
      bear: "Gió ngược không phải lệnh bán: những năm khó khăn là lúc người có tiền mặt và không vay nợ lập danh sách cổ phiếu muốn mua khi giảm sâu." },
    { k: "vn", name: "CỔ PHIẾU VIỆT NAM", ref: "assets.vnm", drivers: [DRV.trend("assets.vnm", "Xu hướng ETF VNM (so với TB 40 tuần)"), DRV.vnd(), DRV.dollar(1), DRV.fed(), DRV.us10y(), DRV.trend("assets.em", "Xu hướng cổ phiếu mới nổi (EEM)"), DRV.oilVN(), DRV.phase({ recovery: 2, overheat: 1, stagflation: -1, reflation: 0 })],
      note: "Chưa có nguồn miễn phí ổn định cho P/E VN-Index, room ngoại, tín dụng hay lãi suất trong nước. Bảng này dùng ETF VNM (tính bằng USD), tỷ giá và các yếu tố toàn cầu tác động lên dòng vốn vào Việt Nam.",
      bull: "Thị trường cận biên đi nhanh cả hai chiều: gió xuôi toàn cầu không chặn được rủi ro trong nước (tín dụng, bất động sản, chính sách).",
      bear: "Việt Nam thường rẻ nhất khi USD mạnh và ngoại bán ròng kéo dài: đó là lúc người kiên nhẫn gom cổ phiếu tốt với định giá thấp." },
    { k: "gold", name: "VÀNG", ref: "assets.gold", drivers: [DRV.trend("assets.gold"), DRV.real(1), DRV.dollar(1), DRV.fed(), DRV.be(), DRV.recess(-1), DRV.goldspx(), DRV.phase({ recovery: -1, overheat: 1, stagflation: 2, reflation: 1 })],
      note: "Từ 2022, ngân hàng trung ương mua vàng mạnh nên vàng tăng cả khi lợi suất thực cao: quan hệ cũ yếu đi, bảng này không bắt được lực mua đó.",
      bull: "Vàng không trả lãi: khi lợi suất thực cao, cầm vàng là chấp nhận bỏ lỡ phần lãi chắc chắn của tiền mặt.",
      bear: "Vàng không có dòng tiền nên rất khó định giá; khi mọi yếu tố ngược chiều mà giá vẫn giữ, đó là dấu hiệu lực mua dài hạn còn mạnh." },
    { k: "crypto", name: "CRYPTO (BTC)", ref: "assets.btc", drivers: [DRV.trend("assets.btc"), DRV.netliq(), DRV.m2(), DRV.dollar(1), DRV.real(1), DRV.nfci(), DRV.hy(), DRV.phase({ recovery: 1, overheat: 1, stagflation: -1, reflation: 0 })],
      note: "BTC nhạy nhất với thanh khoản toàn cầu, nhưng còn chịu chu kỳ halving, dòng tiền ETF và sự kiện riêng của ngành mà bảng vĩ mô không đo được.",
      bull: "Biến động 50-80% từ đỉnh là bình thường với BTC: chỉ dùng phần tiền chịu được mất lớn.",
      bear: "Các đáy lớn của BTC đều xuất hiện khi thanh khoản thắt chặt và tâm lý tệ nhất: gió ngược kéo dài là lúc gom dần với khối lượng nhỏ." },
    { k: "cmdty", name: "HÀNG HÓA", ref: "assets.oil", drivers: [DRV.trend("assets.oil", "Xu hướng dầu WTI"), DRV.trend("assets.copper", "Xu hướng giá đồng"), DRV.dollar(1), DRV.crude5y(), DRV.stu(), DRV.cugold(), DRV.indpro(), DRV.phase({ recovery: 0, overheat: 2, stagflation: 1, reflation: -2 })],
      note: "OPEC chặn truy cập tự động nên không có dữ liệu cung OPEC; địa chính trị có thể đảo chiều giá dầu trong vài ngày.",
      bull: "Giá cao tự chữa giá cao: cầu giảm và cung mới xuất hiện sau 6-18 tháng.",
      bear: "Giá thấp tự chữa giá thấp: đầu tư khai thác bị cắt, nguồn cung thiếu hụt về sau. Người mua nhà sản xuất chi phí thấp lúc giá xấu thường thắng lớn." },
  ];

  function scoreAsset(a) {
    const rows = a.drivers.map((d) => {
      const s = d.ref === "cycle" || d.ref === "agri" ? null : ser(d.ref);
      if (!s && d.ref !== "cycle" && d.ref !== "agri") return { d, miss: true };
      let r = null;
      try { r = d.f(s); } catch (e) { r = null; }
      return r ? { d, s, sc: r[0], why: r[1] } : { d, miss: true };
    });
    const ok = rows.filter((r) => !r.miss);
    const total = ok.length ? Math.round(ok.reduce((x, r) => x + r.sc, 0) / (ok.length * 2) * 100) : null;
    return { rows, total, n: ok.length };
  }
  const verdict = (t) => t == null ? ["–", "mid"] : t >= 35 ? ["GIÓ XUÔI MẠNH", "up"] : t >= 10 ? ["NGHIÊNG TÍCH CỰC", "up"] : t > -10 ? ["TRUNG LẬP", "mid"] : t > -35 ? ["NGHIÊNG TIÊU CỰC", "down"] : ["GIÓ NGƯỢC MẠNH", "down"];
  const pip = (sc) => `<span class="pip ${sc > 0 ? "up" : sc < 0 ? "down" : "dim"}">${sc > 0 ? "▲".repeat(sc) : sc < 0 ? "▼".repeat(-sc) : "■"}</span>`;
  function gauge(t) {
    const x = t == null ? 50 : (t + 100) / 2;
    return `<div class="gauge"><i style="left:calc(${x}% - 2px)"></i></div><div class="plab"><span>gió ngược</span><span>trung lập</span><span>gió xuôi</span></div>`;
  }

  function hurdle() {
    const b = ser("rates.us3m"), c = ser("infl.cpi");
    if (!b || !c) return "";
    const real = b.st.v - c.st.v;
    return `<p class="small">Mốc so sánh: tín phiếu Mỹ 3 tháng trả <b class="amber">${nf(b.st.v, 2)}%</b>, lạm phát CPI ${nf(c.st.v, 2)}% (${freshness(c, "cpi").period}), tức lãi thực <b class="${real >= 0 ? "up" : "down"}">${sg(real, 2)}%</b>. Mọi tài sản rủi ro phải thắng được mức này mới đáng cầm. ${real >= 1 ? "Tiền mặt đang được trả công tốt: chờ đợi không tốn kém." : real < 0 ? "Tiền mặt đang mất giá thực: cầm tiền chờ cũng có chi phí." : ""}</p>`;
  }

  function boardCard(a, full) {
    const r = scoreAsset(a), [vt, vc] = verdict(r.total), px = ser(a.ref);
    const pos = r.rows.filter((x) => !x.miss && x.sc > 0).length, neg = r.rows.filter((x) => !x.miss && x.sc < 0).length;
    const head = `<div class="ph"><span class="code">${a.k.toUpperCase()}</span><h2>${a.name}</h2>${px ? `<span class="dim small" style="margin-left:auto">${fmt(px.st.v, px.unit)} · ${freshBadge(px, a.ref.split(".")[1])}</span>` : ""}</div>`;
    const score = `<div class="dscore"><b class="${vc}">${r.total == null ? "–" : sg(r.total, 0)}</b><span class="${vc}">${vt}</span><span class="dim small">${pos} gió xuôi · ${neg} gió ngược · ${r.n}/${r.rows.length} yếu tố có dữ liệu</span></div>${gauge(r.total)}`;
    if (!full) return `<a class="dcard" href="#DECI/${a.k}"><div class="dn">${a.name}</div>${score}</a>`;
    const table = `<table class="drv">${r.rows.map((x) => x.miss ? `<tr class="dim"><td>${esc(x.d.name)}</td><td>–</td><td class="wrap small">chưa có dữ liệu</td><td></td></tr>` :
      `<tr${x.s ? ` class="click" data-ref="${x.d.ref}"` : ""}><td>${esc(x.d.name)}</td><td>${pip(x.sc)}</td><td class="wrap small">${esc(x.why)}</td><td class="small nowrap">${x.s ? freshBadge(x.s, x.d.ref.split(".")[1]) : ""}</td></tr>`).join("")}</table>`;
    const other = r.total != null && r.total >= 10 ? a.bull : r.total != null && r.total <= -10 ? a.bear : a.bull + " " + a.bear;
    return `<section class="panel" id="d-${a.k}">${head}<div class="pb">${score}<div class="scroll">${table}</div>
      <div class="side ${r.total != null && r.total >= 10 ? "risk" : "opp"}" style="margin-top:8px"><h4>⇄ MẶT KIA</h4><p class="small">${esc(other)}</p></div>
      ${a.note ? `<p class="dim small">Giới hạn: ${esc(a.note)}</p>` : ""}</div></section>`;
  }

  const board = () => `<div class="dstrip">${ASSET_BOARD.map((a) => boardCard(a, false)).join("")}</div>`;
  SCREENS.DECI = () => {
    const ph = G.cycle && KB_PHASE[G.cycle.phase];
    return `<h1 class="title">BẢNG QUYẾT ĐỊNH <small>gió xuôi, gió ngược theo từng tài sản · khung 6-18 tháng</small></h1>
      <section class="panel"><div class="pb">
        <p class="small">Mỗi tài sản có 8-9 yếu tố vĩ mô. Mỗi yếu tố chấm từ ▼▼ (-2) đến ▲▲ (+2), chủ yếu theo hướng đi trong 6 tháng qua, vì ở khung 6-18 tháng hướng đi quan trọng hơn mức tuyệt đối. Điểm tổng từ -100 đến +100. Bấm vào một yếu tố để xem biểu đồ và hai mặt của nó.</p>
        ${hurdle()}
        ${ph ? `<p class="small">Pha chu kỳ hiện tại: <b class="amber">${ph.name}</b> (${ph.sub}), tài sản thường dẫn đầu: <b>${ph.best}</b>.</p>` : ""}
        <p class="dim small">Đây là bảng kiểm tra bối cảnh, không phải dự báo hay lời khuyên. Nó không biết giá bạn mua, tỷ trọng danh mục, hay tin tức riêng của từng doanh nghiệp. Số liệu tháng và quý luôn trễ (xem nhãn từng dòng).</p>
      </div></section>
      ${board()}
      ${ASSET_BOARD.map((a) => boardCard(a, true)).join("")}`;
  };

  // ------------------------------------------------------------------ release calendar
  /* Official dates come from data/calendar.json, re-read daily from the Fed, USDA, BEA and Census
     schedule pages (pipeline/calendar_desk.py). Releases without an official date there (BLS blocks
     automated reads: CPI, jobs, PPI) are estimated from their usual rule, shown as a range when the rule
     is loose. Times are converted from New York to Vietnam time. */
  let CALDATA = null;    // data/calendar.json
  // fallback only, if calendar.json is missing: the Fed's 2026 schedule
  const FOMC = ["2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09"];
  function officialByMonth() {
    const out = {};
    for (const e of (CALDATA && CALDATA.events) || []) { const key = e.k + ":" + e.date.slice(0, 7); (out[key] = out[key] || []).push(e); }
    return out;
  }
  const usDST = (y, m, d) => { // second Sunday of March to first Sunday of November
    const nth = (mo, n) => { const f = new Date(Date.UTC(y, mo, 1)).getUTCDay(); return 1 + ((7 - f) % 7) + 7 * (n - 1); };
    const t = m * 100 + d;
    return t >= 200 + nth(2, 2) && t < 1000 + nth(10, 1);
  };
  const ictTime = (y, m, d, hh, mm) => { const h = hh + (usDST(y, m, d) ? 11 : 12); return { next: h >= 24, txt: String(h % 24).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + " ICT" }; };
  const nthWeekday = (y, m, wd, n) => { const f = new Date(Date.UTC(y, m, 1)).getUTCDay(); return 1 + ((wd - f + 7) % 7) + 7 * (n - 1); };
  const lastWeekday = (y, m, wd) => { const last = new Date(Date.UTC(y, m + 1, 0)); return last.getUTCDate() - ((last.getUTCDay() - wd + 7) % 7); };
  const MON = (m) => "T" + (m + 1);

  // rule: (y, m) -> {d, d2?, label} for month m (0-based)
  const CAL_RULES = [
    { k: "fomc", name: "FOMC: Fed quyết định lãi suất", imp: 3, refs: ["rates.fedfunds"], t: [14, 0], rule: (y, m) => { if (CALDATA && (CALDATA.events || []).some((e) => e.k === "fomc")) return null; const f = FOMC.find((x) => +x.slice(0, 4) === y && +x.slice(5, 7) === m + 1); return f ? { d: +f.slice(8) } : null; },
      why: "Lãi suất và lời phát biểu định hướng 6-12 tháng tới. Thị trường phản ứng với chênh lệch so với kỳ vọng, không phải với quyết định." },
    { k: "nfp", name: "Báo cáo việc làm (NFP, thất nghiệp, lương)", imp: 3, refs: ["grow.payrolls", "grow.unrate", "infl.wages"], t: [8, 30], rule: (y, m) => ({ d: nthWeekday(y, m, 5, 1), label: `số ${MON((m + 11) % 12)}` }),
      why: "Thất nghiệp tăng nhanh là tín hiệu suy thoái đáng tin nhất (quy tắc Sahm). Số việc làm hay bị sửa lại mạnh." },
    { k: "cpi", name: "Lạm phát CPI", imp: 3, refs: ["infl.cpi", "infl.corecpi"], t: [8, 30], rule: (y, m) => ({ d: 10, d2: 15, label: `số ${MON((m + 11) % 12)}` }),
      why: "Quyết định Fed còn phải giữ lãi cao bao lâu. CPI lõi quan trọng hơn CPI tổng." },
    { k: "ppi", name: "Giá sản xuất PPI", imp: 1, refs: ["infl.ppi"], t: [8, 30], rule: (y, m) => ({ d: 11, d2: 16, label: `số ${MON((m + 11) % 12)}` }), why: "Áp lực chi phí đầu vào, thường đi trước CPI vài tháng." },
    { k: "wasde", name: "WASDE: cung cầu nông sản thế giới (USDA)", imp: 2, refs: ["agri.corn", "agri.soybean", "agri.wheat"], t: [12, 0], rule: (y, m) => ({ d: 8, d2: 12 }),
      why: "Dự báo tồn kho cuối vụ. Tồn kho/tiêu thụ thấp là điều kiện cho giá nông sản tăng dài." },
    { k: "retail", name: "Doanh số bán lẻ", imp: 2, refs: ["grow.retail"], t: [8, 30], rule: (y, m) => ({ d: 14, d2: 17, label: `số ${MON((m + 11) % 12)}` }), why: "Tiêu dùng là khoảng 70% GDP Mỹ." },
    { k: "indpro", name: "Sản xuất công nghiệp", imp: 1, refs: ["grow.indpro"], t: [9, 15], rule: (y, m) => ({ d: 15, d2: 18, label: `số ${MON((m + 11) % 12)}` }), why: "Nhu cầu nguyên liệu, năng lượng." },
    { k: "umich", name: "Niềm tin người tiêu dùng UMich (sơ bộ)", imp: 1, refs: ["grow.sentiment", "infl.mich"], t: [10, 0], rule: (y, m) => ({ d: nthWeekday(y, m, 5, 2) }), why: "Tâm lý cực xấu thường trùng vùng đáy của thị trường." },
    { k: "housing", name: "Nhà khởi công", imp: 1, refs: ["grow.housing"], t: [8, 30], rule: (y, m) => ({ d: 16, d2: 19, label: `số ${MON((m + 11) % 12)}` }), why: "Ngành nhạy với lãi suất nhất, hay đi trước chu kỳ." },
    { k: "cfnai", name: "Chỉ số hoạt động Chicago (CFNAI)", imp: 1, refs: ["grow.cfnai"], t: [8, 30], rule: (y, m) => ({ d: 20, d2: 26 }), why: "Trục tăng trưởng của đồng hồ chu kỳ." },
    { k: "m2", name: "Cung tiền M2 (Fed H.6)", imp: 1, refs: ["liq.m2"], t: [13, 0], rule: (y, m) => ({ d: nthWeekday(y, m, 2, 4) }), why: "Thanh khoản trong nền kinh tế." },
    { k: "gdp", name: "GDP Mỹ", imp: 3, refs: ["grow.gdp", "grow.gdpq"], t: [8, 30], rule: (y, m) => ({ d: 24, d2: 30, label: ["bản sơ bộ", "bản lần 2", "bản lần 3"][m % 3] + " Q" + [4, 4, 4, 1, 1, 1, 2, 2, 2, 3, 3, 3][m] }),
      why: "Tăng trưởng thực tế, nhưng đã cũ khi công bố; thị trường nhìn các chỉ báo tuần và tháng nhiều hơn." },
    { k: "pce", name: "PCE lõi (thước đo Fed nhắm 2%)", imp: 3, refs: ["infl.corepce"], t: [8, 30], rule: (y, m) => ({ d: 26, d2: 31, label: `số ${MON((m + 11) % 12)}` }), why: "Thước đo lạm phát chính thức của Fed." },
    { k: "z1", name: "Fed Z.1: vốn hóa, tiền quỹ tiền tệ (chỉ báo Buffett)", imp: 1, refs: ["liq.buffett", "liq.cash_ratio"], t: [12, 0], rule: (y, m) => m % 3 === 2 ? { d: 8, d2: 14 } : null, why: "Định giá toàn thị trường Mỹ, cập nhật mỗi quý." },
    { k: "sloos", name: "Khảo sát cho vay ngân hàng (SLOOS)", imp: 1, refs: ["liq.lending"], t: [14, 0], rule: (y, m) => m % 3 === 1 ? { d: 1, d2: 10 } : null, why: "Ngân hàng siết cho vay thường đi trước suy thoái 2-4 quý." },
  ];
  const WEEKLY = [
    { name: "Tồn kho dầu, xăng EIA", day: "Thứ Tư", t: [10, 30], refs: ["energy.crude", "energy.gasoline"] },
    { name: "Đơn xin trợ cấp thất nghiệp", day: "Thứ Năm", t: [8, 30], refs: ["grow.claims"] },
    { name: "Tồn kho khí đốt EIA", day: "Thứ Năm", t: [10, 30], refs: ["energy.natgas"] },
    { name: "Bảng cân đối Fed (H.4.1)", day: "Thứ Năm", t: [16, 30], refs: ["liq.fedbs", "liq.netliq"] },
    { name: "Lãi vay mua nhà Freddie Mac", day: "Thứ Năm", t: [12, 0], refs: ["rates.mortgage"] },
    { name: "Điều kiện tài chính Chicago", day: "Thứ Tư", t: [8, 30], refs: ["liq.nfci"] },
  ];

  function upcoming(daysAhead) {
    const now = new Date(), t0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const out = [], off = officialByMonth(), end = t0 + daysAhead * DAY * 1000;
    for (let i = -1; i <= 2; i++) {
      const y = now.getUTCFullYear() + Math.floor((now.getUTCMonth() + i) / 12), m = ((now.getUTCMonth() + i) % 12 + 12) % 12;
      for (const r of CAL_RULES) {
        const offs = off[r.k + ":" + y + "-" + String(m + 1).padStart(2, "0")];
        if (offs) {
          for (const o of offs) {
            const d = +o.date.slice(8), from = Date.UTC(y, m, d), [hh, mm] = (o.time || "08:30").split(":").map(Number);
            if (from >= t0 && from <= end) out.push({ r, y, m, d, d2: d, from, to: from, label: o.label || "", official: true, tm: ictTime(y, m, d, hh, mm) });
          }
          continue;
        }
        const e = r.rule(y, m);
        if (!e) continue;
        const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const d = Math.min(e.d, last), d2 = e.d2 ? Math.min(e.d2, last) : d;
        const from = Date.UTC(y, m, d), to = Date.UTC(y, m, d2);
        if (to < t0 || from > t0 + daysAhead * DAY * 1000) continue;
        out.push({ r, y, m, d, d2, from, to, label: e.label || "", tm: ictTime(y, m, d, r.t[0], r.t[1]) });
      }
    }
    return out.sort((a, b) => a.from - b.from || b.r.imp - a.r.imp);
  }
  const dmy = (d, m) => String(d).padStart(2, "0") + "/" + String(m + 1).padStart(2, "0");
  const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  function lastVal(refs) {
    return refs.map((ref) => { const s = ser(ref); if (!s) return ""; const f = freshness(s, ref.split(".")[1]); return `<span class="click nowrap" data-ref="${ref}">${esc(s.name)}: <b>${fmt(s.st.v, s.unit)}</b>${s.unit === "%" ? "%" : ""} <span class="dim">(${f.period})</span></span>`; }).filter(Boolean).join("<br>");
  }
  function calRow(e, withWhy) {
    const day = e.d === e.d2 ? `${WD[new Date(e.from).getUTCDay()]} ${dmy(e.d, e.m)}` : `${dmy(e.d, e.m)} - ${dmy(e.d2, e.m)}`;
    const now = Date.now(), live = e.from <= now && now < e.to + DAY * 1000;
    return `<tr><td class="nowrap">${day}${live ? ' <span class="fr live">TRONG KỲ</span>' : ""}</td><td class="nowrap">${e.d === e.d2 ? e.tm.txt + (e.tm.next ? " (+1 ngày)" : "") : "–"}</td><td><span class="amber">${"★".repeat(e.r.imp)}</span><span class="dim">${"★".repeat(3 - e.r.imp)}</span></td>
      <td>${esc(e.r.name)}${e.label ? ` <span class="dim small">(${esc(e.label)})</span>` : ""} ${e.official || e.r.k === "fomc" ? '<span class="fr">LỊCH CHÍNH THỨC</span>' : `<span class="dim small">${e.d === e.d2 ? "ngày ước tính" : "khoảng ngày"}</span>`}${withWhy ? `<div class="dim small wrap">${esc(e.r.why)}</div>` : ""}</td>
      ${withWhy ? `<td class="small">${lastVal(e.r.refs)}</td>` : ""}</tr>`;
  }

  SCREENS.CAL = () => {
    const ev = upcoming(45);
    const fomcKnown = CALDATA && (CALDATA.events || []).some((e) => e.k === "fomc" && Date.parse(e.date) >= Date.now() + 40 * DAY * 1000);
    const calAge = CALDATA ? Math.floor((Date.now() - CALDATA.generated) / 864e5) : null;
    return `<h1 class="title">LỊCH CÔNG BỐ DỮ LIỆU <small>45 ngày tới · giờ Việt Nam</small></h1>
      <section class="panel"><div class="ph"><span class="code">CAL</span><h2>Sắp công bố</h2></div><div class="pb scroll">
        <p class="dim small">Dòng có nhãn <span class="fr">LỊCH CHÍNH THỨC</span> lấy thẳng từ trang lịch của Fed (FOMC), USDA (WASDE), BEA (GDP, PCE) và Census (bán lẻ, nhà khởi công), hệ thống tự đọc lại mỗi ngày${calAge != null ? ` (lần gần nhất ${calAge ? calAge + " ngày trước" : "hôm nay"})` : ""}. Các dòng còn lại (CPI, việc làm, PPI...) là ngày ước tính theo lịch thường lệ, vì BLS chặn truy cập tự động; có thể lệch 1-3 ngày. ★★★ là số liệu hay làm thị trường biến động mạnh nhất.${fomcKnown || !CALDATA ? "" : ' <b class="down">Chưa đọc được lịch FOMC sắp tới từ trang Fed.</b>'}</p>
        <table class="cal"><tr><th>Ngày</th><th>Giờ</th><th>Mức</th><th>Số liệu và vì sao quan trọng</th><th>Kỳ gần nhất đang hiển thị</th></tr>${ev.map((e) => calRow(e, true)).join("") || '<tr><td colspan="5" class="dim">Không có sự kiện.</td></tr>'}</table></div></section>
      <section class="panel"><div class="ph"><span class="code">WEEK</span><h2>Hằng tuần</h2></div><div class="pb scroll"><table>
        <tr><th>Số liệu</th><th>Ngày</th><th>Giờ</th><th>Kỳ gần nhất</th></tr>
        ${WEEKLY.map((w) => { const n = new Date(); const tm = ictTime(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), w.t[0], w.t[1]); return `<tr><td>${esc(w.name)}</td><td>${w.day}</td><td class="nowrap">${tm.txt}${tm.next ? " (+1 ngày)" : ""}</td><td class="small">${lastVal(w.refs)}</td></tr>`; }).join("")}
      </table><p class="dim small">Giờ Mỹ đổi giữa mùa hè và mùa đông nên giờ Việt Nam lệch 1 tiếng theo mùa; bảng đã tính sẵn.</p></div></section>`;
  };

  function drawClock(el, mini) {
    const tr = (G.cycle && G.cycle.trail) || [];
    if (!tr.length) return;
    const W = 520, H = mini ? 300 : 420, P = 28;
    const gx = Math.max(1, ...tr.map((p) => Math.abs(p.g))) * 1.15, iy = Math.max(1, ...tr.map((p) => Math.abs(p.i))) * 1.15;
    const X = (g) => P + (g + gx) / (2 * gx) * (W - 2 * P), Y = (i) => H - P - (i + iy) / (2 * iy) * (H - 2 * P);
    const q = (x, y, w, h, name, sub, col, on) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" opacity="${on ? 0.22 : 0.08}"/><text x="${x + 8}" y="${y + 18}" fill="${on ? C.yellow : C.dim}" font-size="12" font-weight="700">${name}</text>${mini ? "" : `<text x="${x + 8}" y="${y + 33}" fill="${C.dim}" font-size="10">${sub}</text>`}`;
    const cur = G.cycle.phase, mx = X(0), my = Y(0);
    let s = `<svg viewBox="0 0 ${W} ${H}" font-family="JetBrains Mono, monospace">`;
    s += q(P, P, mx - P, my - P, "ĐÌNH LẠM", "tiền mặt", "#ff4d4d", cur === "stagflation") + q(mx, P, W - P - mx, my - P, "QUÁ NÓNG", "hàng hóa", "#ffa028", cur === "overheat") +
      q(P, my, mx - P, H - P - my, "SUY GIẢM", "trái phiếu", "#4aa8ff", cur === "reflation") + q(mx, my, W - P - mx, H - P - my, "PHỤC HỒI", "cổ phiếu", "#2fd36b", cur === "recovery");
    s += `<line x1="${P}" x2="${W - P}" y1="${my}" y2="${my}" stroke="#444"/><line x1="${mx}" x2="${mx}" y1="${P}" y2="${H - P}" stroke="#444"/>`;
    s += `<text x="${W - P}" y="${my - 4}" fill="${C.dim}" font-size="10" text-anchor="end">tăng trưởng →</text><text x="${mx + 4}" y="${P - 8}" fill="${C.dim}" font-size="10">lạm phát tăng tốc ↑</text>`;
    s += `<polyline fill="none" stroke="#777" stroke-width="1" points="${tr.map((p) => X(p.g).toFixed(1) + "," + Y(p.i).toFixed(1)).join(" ")}"/>`;
    tr.forEach((p, k) => {
      const last = k === tr.length - 1, a = 0.25 + 0.75 * k / tr.length;
      s += `<circle cx="${X(p.g).toFixed(1)}" cy="${Y(p.i).toFixed(1)}" r="${last ? 6 : 2.5}" fill="${last ? C.yellow : "#bbb"}" opacity="${last ? 1 : a.toFixed(2)}"><title>${date(p.t).slice(3)}: CFNAI ${nf(p.g, 2)}, CPI ${nf(p.cpi, 1)}% (Δ6 tháng ${nf(p.i, 2)})</title></circle>`;
    });
    const l = tr[tr.length - 1];
    s += `<text x="${(X(l.g) + 9).toFixed(1)}" y="${(Y(l.i) + 4).toFixed(1)}" fill="${C.yellow}" font-size="11">${date(l.t).slice(3)}</text></svg>`;
    el.innerHTML = s;
  }

  // ------------------------------------------------------------------ detail screen
  function detail(g, k) {
    const ref = g + "." + k, s = ser(ref);
    if (!s) return `<h1 class="title">Không tìm thấy ${esc(ref)}</h1>`;
    const st = s.st, inflLike = ["cpi", "corecpi", "corepce", "ppi"].includes(k);
    const lines = [];
    if (st.avg10 != null) lines.push({ v: st.avg10, color: "#666", label: "TB 10 năm " + fmt(st.avg10, s.unit) });
    if (inflLike) lines.push({ v: 2, color: C.yellow, label: "2%" });
    if (st.min < 0 && st.max > 0) lines.push({ v: 0, color: "#444" });
    const log = isPrice(s) && st.min > 0 && st.max / st.min > 8;
    after.push(() => { const el = $("#dchart"); const u = tsChart(el, [{ label: s.name, d: s.d, unit: s.unit, width: 1.8 }], { years: s.freq === "q" ? "MAX" : 10, lines, height: 380, log }); wireRange(el.closest(".panel"), u); });
    const stat = (l, v) => `<div><span>${l}</span>${v}</div>`;
    const cell = (back, label) => { const c = change(s, back); return stat(label, c ? `<b class="${c.v > 0 ? "up" : c.v < 0 ? "down" : ""}">${c.txt}</b>` : "–"); };
    const kb = KB[k];
    return `<h1 class="title"><button class="back" id="back">‹ QUAY LẠI</button> ${esc(s.name)} <small>${esc(s.src)} · ${{ d: "ngày", w: "tuần", m: "tháng", q: "quý" }[s.freq] || ""}</small></h1>
      <section class="panel s8"><div class="ph"><span class="code">GP</span><h2>Lịch sử ${log ? "(thang log)" : ""}</h2><div class="right">${rangeButtons(s.freq === "q" ? "MAX" : 10)}</div></div><div class="pb">
        <div class="dhead"><span class="big">${fmt(st.v, s.unit)}</span><span class="dim">${esc(s.unit)}</span><span class="tag ${level(st)}">${LEVEL_TXT[level(st)]}</span><span class="small">${freshBadge(s, k)}</span><span class="dim small">có dữ liệu từ ${date(st.since)}</span></div>
        <p class="dim small">Lịch công bố: ${esc(freshness(s, k).release || "–")}. Cũ ${freshness(s, k).age} ngày tính từ ${s.freq === "m" || s.freq === "q" ? "đầu kỳ" : "ngày của số liệu"}.</p>
        <div class="chart" id="dchart"></div><p class="dim small">Vùng xám: suy thoái Mỹ (NBER). Kéo chuột trên biểu đồ để phóng to, bấm đúp để về lại.</p></div></section>
      <section class="panel s4"><div class="ph"><span class="code">DES</span><h2>Thống kê</h2></div><div class="pb">${pbar(st)}<div class="stats">
        ${cell("prev", "Kỳ trước")}${s.freq === "d" || s.freq === "w" ? cell("m", "1 tháng") : ""}${cell("y", "1 năm")}
        ${stat("TB 10 năm", fmt(st.avg10, s.unit))}${stat("TB toàn bộ", fmt(st.avg, s.unit))}${stat("Thấp nhất", fmt(st.min, s.unit))}${stat("Cao nhất", fmt(st.max, s.unit))}
        ${stat("Phân vị 10N", (st.pct10 != null ? st.pct10 : "–") + "%")}${stat("Phân vị toàn bộ", st.pct + "%")}
        ${s.season ? stat("So với TB 5 năm", nf(s.season.vs5y_pct, 1) + "%") : ""}</div></div></section>
      ${kb ? `<section class="panel"><div class="ph"><span class="code">2SID</span><h2>Hiểu con số này theo hai mặt</h2></div><div class="pb">${twoSided(k, s.season ? seasonLevel(s) : st)}</div></section>` : ""}`;
  }

  // ------------------------------------------------------------------ routing
  let current = "";
  function go(code) { location.hash = code; }
  function render() {
    const h = decodeURIComponent(location.hash.slice(1)) || "HOME";
    current = h;
    killCharts();
    after = [];
    const scr = $("#screen");
    let html, post = null;
    if (h.startsWith("S/")) { const [, g, k] = h.split("/"); html = detail(g, k); }
    else { const f = SCREENS[h.split("/")[0]] || SCREENS.HOME; html = f(); post = f.after; }
    scr.innerHTML = html;
    document.querySelectorAll(".fkeys a").forEach((a) => a.classList.toggle("on", a.dataset.code === h.split("/")[0]));
    after.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    if (post) try { post(); } catch (e) { console.error(e); }
    scr.querySelectorAll("[data-ref]").forEach((el) => el.addEventListener("click", () => { const [g, k] = el.dataset.ref.split("."); go("S/" + g + "/" + k); }));
    const b = $("#back");
    if (b) b.addEventListener("click", () => history.length > 1 ? history.back() : go("HOME"));
    const sub = !h.startsWith("S/") && h.split("/")[1], target = sub && document.getElementById("d-" + sub);
    if (target) target.scrollIntoView();
    else if (!h.startsWith("S/") || !location.hash) window.scrollTo(0, 0);
  }

  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (charts.length) render(); }, 300); });
  window.addEventListener("hashchange", render);

  // ------------------------------------------------------------------ command line
  function wireCommand() {
    const inp = $("#cmd-in"), box = $("#suggest");
    let items = [], sel = 0;
    const show = () => {
      const q = fold(inp.value.trim());
      if (!q) { box.classList.add("hidden"); items = []; return; }
      const fn = FN.filter(([c, n]) => fold(c).startsWith(q) || fold(n).includes(q)).map(([c, n]) => ({ code: c, label: n, to: c }));
      const ss = allSeries().filter((x) => x.key !== "usrec" && (fold(x.s.name).includes(q) || x.key.includes(q))).slice(0, 10).map((x) => ({ code: x.ref.split(".")[0].toUpperCase().slice(0, 4), label: x.s.name, to: "S/" + x.ref.replace(".", "/") }));
      items = fn.concat(ss).slice(0, 12);
      sel = 0;
      box.innerHTML = items.map((it, i) => `<div class="${i === sel ? "on" : ""}" data-i="${i}"><b>${esc(it.code)}</b>${esc(it.label)}</div>`).join("");
      box.classList.toggle("hidden", !items.length);
      box.querySelectorAll("div").forEach((d) => d.addEventListener("mousedown", (e) => { e.preventDefault(); pick(+d.dataset.i); }));
    };
    const pick = (i) => { const it = items[i]; if (!it) return; go(it.to); inp.value = ""; box.classList.add("hidden"); inp.blur(); };
    inp.addEventListener("input", show);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
        box.querySelectorAll("div").forEach((d, i) => d.classList.toggle("on", i === sel));
      } else if (e.key === "Escape") { box.classList.add("hidden"); inp.blur(); }
    });
    inp.addEventListener("blur", () => setTimeout(() => box.classList.add("hidden"), 150));
    $("#cmd").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = inp.value.trim().toUpperCase();
      if (SCREENS[v]) { go(v); inp.value = ""; box.classList.add("hidden"); return; }
      pick(sel);
    });
    document.addEventListener("keydown", (e) => {
      const m = /^F(\d+)$/.exec(e.key);
      if (m && FN[+m[1] - 1]) { e.preventDefault(); go(FN[+m[1] - 1][0]); return; }
      if (e.key === "/" && document.activeElement !== inp) { e.preventDefault(); inp.focus(); }
    });
  }

  // ------------------------------------------------------------------ LIVE quotes (browser, every 10 s)
  /* The only realtime layer: perpetual-futures mid prices from Hyperliquid's public API, fetched by the
     visitor's browser. Index and commodity perps (dex "xyz") trade around the clock and track their
     underlying closely, but are not the official index or spot price. */
  const LIVE = [["BTC", "BTC", ""], ["ETH", "ETH", ""], ["GOLD", "VÀNG", "xyz"], ["SILVER", "BẠC", "xyz"], ["CL", "DẦU WTI", "xyz"], ["BRENTOIL", "BRENT", "xyz"], ["SP500", "S&P 500", "xyz"], ["XYZ100", "NASDAQ 100", "xyz"]];
  const liveLast = {};
  async function liveTick() {
    const el = $("#live");
    if (!el) return;
    const post = (dex) => fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dex ? { type: "metaAndAssetCtxs", dex } : { type: "metaAndAssetCtxs" }) }).then((r) => r.json());
    try {
      const [main, xyz] = await Promise.all([post(""), post("xyz")]);
      const px = {};
      for (const [meta, ctxs] of [main, xyz]) meta.universe.forEach((a, i) => { const c = ctxs[i]; if (c) px[a.name.replace(/^xyz:/, "")] = { p: +(c.midPx || c.markPx), prev: +c.prevDayPx }; });
      const t = new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      el.innerHTML = `<span class="fr live" title="Giá hợp đồng perp trên Hyperliquid, trình duyệt tự lấy mỗi 10 giây">LIVE</span>` + LIVE.map(([k, n]) => {
        const q = px[k];
        if (!q || !q.p) return "";
        const ch = q.prev ? (q.p / q.prev - 1) * 100 : null, flash = liveLast[k] && q.p !== liveLast[k] ? (q.p > liveLast[k] ? " fl-up" : " fl-down") : "";
        liveLast[k] = q.p;
        return `<span class="lv${flash}"><span class="n">${n}</span>${nf(q.p, q.p >= 1000 ? 0 : 2)} ${ch == null ? "" : `<span class="${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "+" : ""}${nf(ch, 2)}%</span>`}</span>`;
      }).join("") + `<span class="dim small">${t} · perp Hyperliquid, % so với 24 giờ trước</span>`;
    } catch (e) {
      el.innerHTML = `<span class="fr late">LIVE</span><span class="dim small">mất kết nối giá trực tiếp, thử lại sau 10 giây</span>`;
    }
  }

  // ------------------------------------------------------------------ ticker, clock, status
  function ticker() {
    const refs = [["rates.fedfunds", "FED"], ["rates.us2y", "US2Y"], ["rates.us10y", "US10Y"], ["rates.s10y2y", "10Y-2Y"], ["rates.real10y", "THỰC 10Y"], ["assets.dxy", "DXY"],
      ["assets.spx", "SPX"], ["assets.gold", "VÀNG"], ["energy.wti", "WTI"], ["energy.brent", "BRENT"], ["energy.crude", "TỒN DẦU"], ["assets.btc", "BTC"], ["liq.hyoas", "HY OAS"], ["infl.cpi", "CPI"], ["grow.unrate", "THẤT NGHIỆP"]];
    const html = refs.map(([r, n]) => {
      const s = ser(r);
      if (!s) return "";
      const c = change(s, s.freq === "d" || s.freq === "w" ? "w" : "prev");
      const fr = freshness(s, r.split(".")[1]);
      return `<span class="tk" data-to="S/${r.replace(".", "/")}" title="${fr.kind}, kỳ ${fr.period}, cũ ${fr.age} ngày"><span class="n">${n}</span><span class="frs${fr.late ? " late" : ""}">${fr.kind === "CUỐI NGÀY" ? "EOD" : fr.kind}</span> ${fmt(s.st.v, s.unit)}${s.unit === "%" ? "%" : ""} ${c ? `<span class="${c.v > 0 ? "up" : c.v < 0 ? "down" : "dim"}">${c.v > 0 ? "▲" : c.v < 0 ? "▼" : "■"} ${c.txt}</span>` : ""}</span>`;
    }).join("");
    const t = $("#tk-track");
    t.innerHTML = html + html;
    t.querySelectorAll(".tk").forEach((el) => el.addEventListener("click", () => go(el.dataset.to)));
  }

  function clock() {
    const tick = () => { $("#clock").textContent = new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }) + " ICT"; };
    tick(); setInterval(tick, 30000);
  }

  function status() {
    const a = $("#sys");
    getJSON("data/health.json").then((h) => {
      if (!h) { a.textContent = "? STATUS"; return; }
      const bad = h.sources.filter((s) => s.status !== "ok").length, long = h.sources.filter((s) => s.fails_in_row >= 3).length;
      const old = Date.now() / 1000 - h.generated > 3 * 3600;
      a.className = "pill " + (long || old ? "stale" : bad ? "warn" : "ok");
      a.textContent = long || old ? "✕ CÓ SỰ CỐ" : bad ? "▲ " + bad + " NGUỒN LỖI" : "● HỆ THỐNG ỔN";
    });
  }

  // ------------------------------------------------------------------ boot
  async function boot() {
    $("#fkeys").innerHTML = FN.map(([c, n, f]) => `<a href="#${c}" data-code="${c}" title="${f}"><b>${c}</b>${n}</a>`).join("");
    wireCommand(); clock(); status();
    const res = await Promise.all(GROUPS.map((g) => getJSON("data/macro/" + g + ".json")).concat([getJSON("data/global.json"), getJSON("data/calendar.json")]));
    GROUPS.forEach((g, i) => { if (res[i]) G[g] = res[i]; });
    GLOBAL = res[GROUPS.length];
    CALDATA = res[GROUPS.length + 1];
    const missing = GROUPS.filter((g) => !G[g]);
    const times = GROUPS.filter((g) => G[g]).map((g) => G[g].generated);
    $("#errors").textContent = (times.length ? "Dữ liệu dựng " + ago(Math.min(...times)) + "." : "") + (missing.length ? " Chưa có nhóm: " + missing.join(", ") + " (sẽ có sau lần quét kế tiếp)." : "");
    ticker();
    render();
    liveTick();
    setInterval(() => { if (!document.hidden) liveTick(); }, 10000);
  }
  boot();
})();
