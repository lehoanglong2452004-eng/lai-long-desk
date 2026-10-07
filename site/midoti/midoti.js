"use strict";
// MIDOTI page: load bars from the chosen source, replay MIDOTI v1.568 (engine.js) with the conditions the
// user switched on, stream the forming bar and re-run every second, and show each stage of the process.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const M = window.MIDOTI, F = window.FEEDS;
  const TFS = ["5m", "15m", "30m", "1H", "4H", "1D"];
  const TFL = { "5m": "5 phút", "15m": "15 phút", "30m": "30 phút", "1H": "H1", "4H": "H4", "1D": "D1" };
  const GROUPS = ["crypto", "forex", "commodity", "index", "stock"];
  const GNAME = { crypto: "Crypto", forex: "Forex", commodity: "Hàng hóa", index: "Chỉ số Mỹ", stock: "Cổ phiếu Mỹ top 7 công nghệ" };
  const COST = { crypto: 0.2, forex: 0.03, commodity: 0.08, index: 0.02, stock: 0.05 };
  const NAMES = {
    SP500: "S&P 500", NASDAQ100: "Nasdaq 100", DOW: "Dow Jones", RUSSELL2000: "Russell 2000", AAPL: "Apple", MSFT: "Microsoft", NVDA: "Nvidia", GOOGL: "Alphabet",
    AMZN: "Amazon", META: "Meta", TSLA: "Tesla", GOLD: "Vàng", SILVER: "Bạc", PLATINUM: "Bạch kim", COPPER: "Đồng", WTI: "Dầu WTI", BRENT: "Dầu Brent", NATGAS: "Khí tự nhiên",
    CORN: "Ngô", WHEAT: "Lúa mì", SOYBEAN: "Đậu tương", COFFEE: "Cà phê", SUGAR: "Đường", COCOA: "Ca cao",
  };
  const FALLBACK = ["BTC", "ETH", "BNB", "XRP", "SOL", "DOGE"].map((s) => ({ symbol: s, cls: "crypto" }))
    .concat(["EURUSD", "GBPUSD", "USDJPY"].map((s) => ({ symbol: s, cls: "forex" })), [{ symbol: "GOLD", cls: "commodity" }]);

  // ---------- conditions ----------
  // [key, label, explanation, group]; "inv" chips are on when the option is false
  const CH = [
    ["L1", "L1 · Giá cùng phía OP và VWAP", "Mua khi giá đóng cửa trên cả giá mở kỳ (OP) và VWAP; bán khi dưới cả hai.", "Lõi MIDOTI v1.568"],
    ["L2", "L2 · ADX ≥ 20 đang tăng, DI cùng hướng", "Có xu hướng và xu hướng đang mạnh lên.", "Lõi MIDOTI v1.568"],
    ["L3", "L3 · Hồi về vùng tựa rồi đóng nến cùng hướng", "Trong 5 nến gần nhất giá chạm vùng tựa rồi nến tín hiệu đóng cửa theo hướng lệnh.", "Lõi MIDOTI v1.568"],
    ["zVw", "Vùng tựa: VWAP", "Cho phép hồi về VWAP.", "Lõi MIDOTI v1.568"],
    ["zMl", "Vùng tựa: MLP", "Cho phép hồi về vùng MLP (giữa đỉnh–đáy kỳ trước).", "Lõi MIDOTI v1.568"],
    ["zOp", "Vùng tựa: OP", "Cho phép hồi về giá mở kỳ.", "Lõi MIDOTI v1.568"],
    ["inBand", "Không đuổi giá ngoài dải VWAP 2σ", "Bỏ tín hiệu khi giá đã chạy quá xa VWAP.", "Lõi MIDOTI v1.568"],
    ["inv:tradeA", "Chỉ vào lệnh ◆ (RVOL ≥ 1.5)", "Tắt thì vào cả tín hiệu ◇ thiếu khối lượng (rủi ro 0,5%).", "Bộ lọc thêm"],
    ["htfOn", "Khung lớn cùng hướng", "Trong ngày: tuần. Swing: tháng. Ngược hướng thì tối đa là ◇.", "Bộ lọc thêm"],
    ["l4On", "L4 · Mục tiêu gần nhất ≥ 2R", "Đỉnh/đáy kỳ trước, dải 2σ hoặc pivot gần nhất phải cách ít nhất 2 lần rủi ro.", "Bộ lọc thêm"],
    ["pbVolOn", "L5 · Nhịp hồi khối lượng thấp", "Các nến hồi có RVOL < 1 và nến tín hiệu có khối lượng lớn hơn nhịp hồi.", "Bộ lọc thêm"],
    ["ksiOn", "KSI ≥ 65 (mua) / ≤ 35 (bán)", "Chỉ số sức mạnh tổng hợp VWAP tuần + ADX/DI + CMF phải đồng thuận.", "Bộ lọc thêm"],
    ["adxStrongOn", "ADX ≥ 25 (xu hướng mạnh)", "Chặt hơn L2.", "Bộ lọc thêm"],
    ["ccryOn", "Nến tín hiệu là nến Blue/Black (CCRY)", "Nến tín hiệu phải có động lượng: đúng phía VWAP, DI cùng hướng, RVOL ≥ 1.2.", "Bộ lọc thêm"],
    ["slOkOn", "SL không quá 1.5 ATR", "Bỏ tín hiệu khi điểm cắt lỗ quá xa.", "Bộ lọc thêm"],
    ["sessOn", "Chỉ vào trong phiên Á · Âu · Mỹ", "Chỉ áp dụng góc nhìn Trong ngày (khung dưới H1).", "Thời gian (Trong ngày)"],
    ["rollOn", "Tránh rollover 16:55–18:05 New York", "Chỉ áp dụng góc nhìn Trong ngày.", "Thời gian (Trong ngày)"],
    ["warm", "Chờ 30 phút sau mốc OP", "VWAP vừa reset còn dao động mạnh. Chỉ áp dụng góc nhìn Trong ngày.", "Thời gian (Trong ngày)"],
    ["beOn", "Chốt TP1 thì dời SL về hòa vốn", "", "Thoát lệnh"],
    ["trailOn", "Trailing theo VWAP sau TP1", "", "Thoát lệnh"],
    ["timeStopOn", "Thoát nếu 12 nến chưa đạt 1R", "", "Thoát lệnh"],
    ["opExitOn", "Thoát khi mất cả OP và VWAP", "", "Thoát lệnh"],
    ["oppExitOn", "Thoát khi có ◆ ngược chiều", "", "Thoát lệnh"],
    ["locksOn", "Khóa rủi ro: lỗ ngày 3%, tuần 6%, tối đa 3 lệnh/ngày, nghỉ 30 phút sau lệnh thua", "", "Quản lý rủi ro"],
  ];
  const PARAMS = [
    ["adxSig", "Ngưỡng ADX (L2)", 1], ["adxStrong", "ADX mạnh", 1], ["rvolStr", "RVOL cho ◆", 0.1], ["rvolCcry", "RVOL cho nến CCRY", 0.1],
    ["pbBars", "Số nến hồi", 1], ["pbRvolMax", "RVOL nhịp hồi <", 0.1], ["ksiBuy", "KSI mua ≥", 1], ["ksiSell", "KSI bán ≤", 1],
    ["slBufAtr", "Đệm SL (× ATR)", 0.05], ["slMinAtr", "SL tối thiểu (× ATR)", 0.05], ["slMaxAtr", "SL tối đa (× ATR)", 0.05], ["rrMin", "RR cho L4", 0.1],
    ["tp1R", "TP1 (R)", 0.1], ["tp1Pct", "Chốt ở TP1 (%)", 5], ["tp2R", "TP2 (R)", 0.1], ["trailAtr", "Trailing VWAP ∓ (× ATR)", 0.05],
    ["timeStop", "Dừng theo thời gian (nến)", 1], ["bal", "Vốn tài khoản ($)", 1000], ["riskD", "Rủi ro ◆ (%)", 0.1], ["riskA", "Rủi ro ◇ (%)", 0.1],
    ["costPct", "Phí + trượt giá khứ hồi (%)", 0.01], ["dayLoss", "Lỗ tối đa ngày (%)", 0.5], ["weekLoss", "Lỗ tối đa tuần (%)", 0.5], ["maxTrades", "Số lệnh tối đa/ngày", 1],
  ];
  const PRESETS = {
    chac: { name: "Chắc chắn", note: "Lõi v1.568 + khung lớn, KSI, ADX ≥ 25, nến CCRY: ít lệnh, mỗi lệnh nhiều xác nhận.", set: { L1: true, L2: true, L3: true, htfOn: true, ksiOn: true, adxStrongOn: true, ccryOn: true, tradeA: false, slOkOn: true, locksOn: true } },
    goc: { name: "Mặc định MIDOTI v1.568", note: "Đúng như chỉ báo gốc: lõi L1–L3, chỉ vào ◆.", set: {} },
    nhieu: { name: "Nhiều lệnh", note: "Chỉ giữ L1 và L3, vào cả ◇, bỏ khóa rủi ro và lọc giờ.", set: { L1: true, L2: false, L3: true, htfOn: false, l4On: false, pbVolOn: false, ksiOn: false, adxStrongOn: false, ccryOn: false, tradeA: true, slOkOn: false, locksOn: false, sessOn: false, warmMin: 0 } },
  };
  const COND_KEYS = ["L1", "L2", "L3", "zVw", "zMl", "zOp", "inBand", "tradeA", "htfOn", "l4On", "pbVolOn", "ksiOn", "adxStrongOn", "ccryOn", "slOkOn", "sessOn", "rollOn", "warmMin", "beOn", "trailOn", "timeStopOn", "opExitOn", "oppExitOn", "locksOn"];

  const EXIT = {
    SL: "Chạm SL ban đầu", SL_MOVED: "Chạm SL đã dời", SL_AFTER_TP1: "Chạm SL đã dời (hòa vốn/trailing) sau khi chốt TP1", TP1: "Chốt hết ở TP1", TP2: "Chạm TP2, chốt phần còn lại",
    TIME: "Hết thời gian: chưa đạt 1R sau số nến quy định", EOD: "Đóng cuối ngày", OPP: "Xuất hiện ◆ ngược chiều", OPVWAP: "Giá đóng cửa ngược qua cả OP và VWAP",
  };
  const FAC = {
    htf: "Khung lớn cùng hướng", rvol: "RVOL nến tín hiệu ≥ 1.5", ksi: "KSI cùng hướng (trên/dưới 50)", adx: "ADX ≥ 25", cmf: "Dòng tiền CMF cùng hướng",
    ccry: "Nến tín hiệu là Blue/Black", zvw: "Tựa vào VWAP", zml: "Tựa vào MLP hoặc OP",
  };
  const BLOCK = { GRADE: "chỉ là ◇ (đang chỉ vào ◆)", INPOS: "đang có lệnh", BUSY: "vừa đóng/đang chờ lệnh khác", COOL: "đang nghỉ sau lệnh thua", DAYLOSS: "chạm giới hạn lỗ ngày", WEEKLOSS: "chạm giới hạn lỗ tuần", MAXTRADES: "đủ số lệnh trong ngày" };

  // ---------- settings ----------
  const S = { sym: "BTC", tf: "15m", view: "auto", hist: 5000, srcs: {}, opt: {}, preset: "goc", costs: Object.assign({}, COST) };
  try { const o = JSON.parse(localStorage.getItem("lld-midoti") || "null"); if (o) Object.assign(S, o, { costs: Object.assign({}, COST, o.costs || {}) }); } catch (e) { /* defaults */ }
  if (!TFS.includes(S.tf)) S.tf = "15m";
  const save = () => { try { localStorage.setItem("lld-midoti", JSON.stringify(S)); } catch (e) { /* private mode */ } };

  let liveTicks = 0, ASSETS = FALLBACK, A = null, B = null, R = null, prevStats = null, stopLive = null, lastTick = 0, lastRun = 0, dirty = false, loadTok = 0;
  let logFilter = "all", selTrade = null, view = { n: 140, end: null };
  const asset = () => ASSETS.find((a) => a.symbol === S.sym) || ASSETS[0];
  const srcOf = (a, tf) => { const l = F.sourcesFor(a, tf), s = S.srcs[a.symbol]; return l.includes(s) ? s : l[0]; };
  function opts(a) {
    return Object.assign({}, S.opt, { tfSec: F.TF[S.tf], view: S.view, mergeWkd: a.cls !== "crypto", costPct: S.costs[a.cls] ?? 0.1 });
  }
  const cur = () => Object.assign({}, M.DEFAULTS, S.opt);

  // ---------- formatting ----------
  function px(x) {
    if (x == null || !isFinite(x)) return "–";
    const a = Math.abs(x), d = a >= 1000 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 5 : 8;
    return Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  const f = (x, d = 2) => (x == null || !isFinite(x) ? "–" : Number(x).toFixed(d));
  const sg = (x, d = 2) => (x == null || !isFinite(x) ? "–" : `${x > 0 ? "+" : ""}${Number(x).toFixed(d)}`);
  const pc = (x) => (x == null ? "–" : `${Math.round(x * 100)}%`);
  const cl = (x) => (x > 0 ? "up" : x < 0 ? "down" : "");
  const VN = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const VNs = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const when = (t) => (t ? VN.format(new Date(t * 1000)) : "–");
  const ago = (ms) => { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 60 ? `${s} giây` : s < 3600 ? `${Math.round(s / 60)} phút` : `${Math.round(s / 3600)} giờ`; };
  const nameOf = (a) => (NAMES[a.symbol] ? `${a.symbol} · ${NAMES[a.symbol]}` : a.symbol);
  const dirTxt = (d) => (d === 1 ? "MUA" : "BÁN");

  // ---------- controls ----------
  function fillAssets() {
    $("asset").innerHTML = GROUPS.map((g) => {
      const l = ASSETS.filter((a) => a.cls === g);
      return l.length ? `<optgroup label="${GNAME[g]} (${l.length})">${l.map((a) => `<option value="${esc(a.symbol)}">${esc(nameOf(a))}</option>`).join("")}</optgroup>` : "";
    }).join("");
    if (!ASSETS.some((a) => a.symbol === S.sym)) S.sym = ASSETS[0].symbol;
    $("asset").value = S.sym;
  }
  function fillSrc() {
    const a = asset();
    $("src").innerHTML = F.sourcesFor(a, S.tf).map((s) => `<option value="${s}">${esc(F.SRC[s].label)}${F.SRC[s].live ? " · trực tiếp" : " · trễ ≤ 1 giờ"}</option>`).join("");
    $("src").value = srcOf(a, S.tf);
  }
  function fillTfs() {
    $("tfs").innerHTML = TFS.map((t, k) => (k === 4 ? '<span class="sep"></span>' : "") + `<button data-tf="${t}" class="${t === S.tf ? "on" : ""}" title="${k >= 4 ? "Khung dài hạn" : "Khung tiêu biểu"}">${TFL[t]}</button>`).join("");
  }
  $("asset").addEventListener("change", () => { S.sym = $("asset").value; save(); fillSrc(); load(); });
  $("src").addEventListener("change", () => { S.srcs[S.sym] = $("src").value; save(); load(); });
  $("tfs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.tf = b.dataset.tf; save(); fillTfs(); fillSrc(); load(); });
  $("view").addEventListener("change", () => { S.view = $("view").value; save(); rerun(true); });
  $("hist").addEventListener("change", () => { S.hist = +$("hist").value; save(); load(); });
  $("reload").addEventListener("click", () => load());

  function renderPresets() {
    $("presets").innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button class="pre ${S.preset === k ? "on" : ""}" data-p="${k}"><b>${esc(p.name)}</b><small>${esc(p.note)}</small></button>`).join("")
      + `<button class="pre ${S.preset === "tuy" ? "on" : ""}" disabled><b>Tự chọn</b><small>Bấm từng điều kiện bên dưới.</small></button>`;
  }
  const chipOn = (k, o) => (k.startsWith("inv:") ? !o[k.slice(4)] : k === "warm" ? o.warmMin > 0 : !!o[k]);
  function renderChips() {
    const o = cur(), swing = S.view === "swing" || (S.view === "auto" && F.TF[S.tf] >= 3600);
    let g = "", h = "";
    for (const [k, label, tip, grp] of CH) {
      if (grp !== g) { h += (g ? "</div>" : "") + `<div class="cgrp">${esc(grp)}${grp.startsWith("Thời gian") && swing ? " · đang xem Swing nên không áp dụng" : ""}</div><div class="chips">`; g = grp; }
      const na = grp.startsWith("Thời gian") && swing;
      h += `<button class="chip ${chipOn(k, o) ? "on" : ""} ${na ? "na" : ""}" data-k="${k}" title="${esc(tip)}">${esc(label)}</button>`;
    }
    $("chips").innerHTML = h + "</div>";
  }
  $("presets").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-p]");
    if (!b) return;
    const keep = {};
    for (const [k] of PARAMS) if (k in S.opt) keep[k] = S.opt[k];
    COND_KEYS.forEach((k) => delete keep[k]);
    S.opt = Object.assign(keep, PRESETS[b.dataset.p].set);
    S.preset = b.dataset.p; save(); renderPresets(); renderChips(); rerun(true);
  });
  $("chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b || b.classList.contains("na")) return;
    const k = b.dataset.k, o = cur();
    if (k.startsWith("inv:")) S.opt[k.slice(4)] = !o[k.slice(4)];
    else if (k === "warm") S.opt.warmMin = o.warmMin > 0 ? 0 : 30;
    else S.opt[k] = !o[k];
    S.preset = "tuy"; save(); renderPresets(); renderChips(); rerun(true);
  });
  function renderParams() {
    const o = cur(), a = asset();
    $("par").innerHTML = PARAMS.map(([k, l, st]) => {
      const v = k === "costPct" ? S.costs[a.cls] : o[k];
      return `<label>${esc(l)}${k === "costPct" ? ` <span class="dim">(${GNAME[a.cls]})</span>` : ""}<input type="number" step="${st}" data-k="${k}" value="${v}"></label>`;
    }).join("");
  }
  $("par").addEventListener("change", (e) => {
    const k = e.target.dataset.k, v = parseFloat(e.target.value);
    if (!k || !isFinite(v)) return;
    if (k === "costPct") S.costs[asset().cls] = v; else S.opt[k] = v;
    save(); rerun(true);
  });

  // ---------- loading and live ----------
  async function load() {
    const tok = ++loadTok, a = asset(), src = srcOf(a, S.tf);
    if (stopLive) { stopLive(); stopLive = null; }
    A = a; B = null; R = null; prevStats = null; selTrade = null; view.end = null; $("delta").innerHTML = "";
    $("h-chart").textContent = `BIỂU ĐỒ · ${nameOf(a)} · ${TFL[S.tf]}`;
    feed(`Đang tải ${S.hist.toLocaleString("vi-VN")} nến ${TFL[S.tf]} của ${a.symbol} từ ${F.SRC[src].label}…`);
    renderParams();
    try {
      const bars = await F.SRC[src].bars(a, S.tf, S.hist);
      if (tok !== loadTok) return;
      if (!bars.t.length) throw new Error("không có nến");
      B = bars; B.src = src; B.loadedAt = Date.now(); lastTick = Date.now(); liveTicks = 0;
      rerun(true);
      if (F.SRC[src].live) stopLive = F.SRC[src].live(a, S.tf, onBar);
    } catch (e) {
      if (tok !== loadTok) return;
      const alt = F.sourcesFor(a, S.tf).filter((s) => s !== src).map((s) => F.SRC[s].label);
      feed(`<b class="off">Không lấy được dữ liệu</b> ${esc(a.symbol)} từ ${esc(F.SRC[src].label)} (${esc(e.message || e)}).${alt.length ? ` Thử nguồn khác: ${esc(alt.join(", "))}.` : ""}`);
      ["s1", "s2", "s3", "s4", "s5"].forEach((id) => { $(id).querySelector(".body").innerHTML = '<p class="dim">Chưa có dữ liệu.</p>'; });
      $("kpis").innerHTML = ""; $("log").innerHTML = ""; drawChart();
    }
  }
  function onBar(k) {
    if (!B) return;
    const n = B.t.length, last = B.t[n - 1];
    if (k.t < last) return;
    if (k.t === last) { B.o[n - 1] = k.o; B.h[n - 1] = k.h; B.l[n - 1] = k.l; B.c[n - 1] = k.c; B.v[n - 1] = k.v; }
    else { ["t", "o", "h", "l", "c", "v"].forEach((c) => B[c].push(k[c])); if (B.t.length > S.hist + 50) ["t", "o", "h", "l", "c", "v"].forEach((c) => B[c].shift()); }
    // a bar is final once a newer one exists or the exchange says so
    B.closed = k.x === true || k.t + F.TF[S.tf] <= Date.now() / 1000;
    lastTick = Date.now(); liveTicks++; dirty = true;
  }
  function feed(html) { $("feed").innerHTML = html; }

  // ---------- run ----------
  let lastSig = null, lastTradeSig = "";
  function rerun(full) {
    if (!B) return;
    const a = A, o = opts(a);
    const t0 = performance.now();
    R = M.run(B, o);
    R.ms = performance.now() - t0; lastRun = Date.now(); dirty = false;
    const tsig = `${R.trades.length}|${R.trades.length ? R.trades[R.trades.length - 1].exitT : 0}|${R.events.length}`;
    if (full) { if (prevStats && R.stats) showDelta(); prevStats = R.stats; }
    if (full || tsig !== lastTradeSig) { renderStats(); renderLog(); renderFactors(); }
    // new signal on a candle that just closed
    const ev = R.events[R.events.length - 1];
    if (ev && lastSig !== null && ev.t !== lastSig && ev.i >= R.n - 2) {
      const al = $("alert");
      al.innerHTML = `<b class="g2">${ev.grade === 2 ? "◆" : "◇"} TÍN HIỆU MỚI</b> · ${esc(a.symbol)} ${TFL[S.tf]} · ${dirTxt(ev.dir)} quanh ${px(ev.price)}, SL ${px(ev.sl)} · ${when(ev.t)}${ev.taken ? "" : ` · không vào vì ${BLOCK[ev.blocked]}`}`;
      al.classList.add("show");
      $("s5").classList.remove("pulse"); void $("s5").offsetWidth; $("s5").classList.add("pulse");
    }
    lastSig = ev ? ev.t : 0; lastTradeSig = tsig;
    renderStages(); drawChart();
  }
  function showDelta() {
    const p = prevStats, s = R.stats;
    if (p.n === s.n && Math.abs((p.totalR || 0) - (s.totalR || 0)) < 1e-9) return;
    const d = (x, y, fmt) => `${fmt(y)} <span class="${cl(y - x)}">(${y - x > 0 ? "+" : ""}${fmt(y - x)})</span>`;
    $("delta").innerHTML = `Sau thay đổi vừa rồi: số lệnh ${d(p.n, s.n, (x) => String(x))}, tỷ lệ thắng ${d(p.win || 0, s.win || 0, (x) => `${Math.round(x * 100)}%`)}, tổng ${d(p.totalR || 0, s.totalR || 0, (x) => `${f(x, 1)}R`)}, R trung bình ${d(p.avgR || 0, s.avgR || 0, (x) => f(x, 2))}.`;
  }

  // ---------- stages ----------
  const row = (k, v, c) => `<div class="row"><span>${k}</span><span class="${c || ""}">${v}</span></div>`;
  function renderStages() {
    if (!R || !R.check) return;
    const c = R.check, n = R.n, o = R.opt, a = A, src = F.SRC[B.src];
    const tfS = F.TF[S.tf], left = c.closed ? 0 : Math.max(0, B.t[n - 1] + tfS - Date.now() / 1000);
    const live = !!src.live, stale = live && Date.now() - lastTick > 20000;
    feed(`${live ? (!liveTicks ? (stale ? '<b class="off">● chưa nối được luồng trực tiếp, đang thử lại</b>' : "◌ đang nối luồng trực tiếp…") : stale ? '<b class="off">● mất kết nối, đang thử lại</b>' : '<b class="live">● TRỰC TIẾP</b>') : "◌ dữ liệu máy chủ, cập nhật mỗi giờ"} · ${esc(src.label)} · ${n.toLocaleString("vi-VN")} nến ${TFL[S.tf]} từ ${when(B.t[0])} · nhịp cuối ${ago(lastTick)} trước · tính lại ${f(R.ms, 0)} ms`);
    const vol = B.v[n - 1];
    $("s1").querySelector(".body").innerHTML =
      `<div class="big">${px(B.c[n - 1])}</div>` + row("Nguồn", esc(src.label)) + row("Số nến", n.toLocaleString("vi-VN")) +
      row("Nến cuối", `${when(B.t[n - 1])}${c.closed ? "" : " (đang chạy)"}`) +
      (c.closed ? row("Trạng thái", live ? "chờ nến mới" : "đã đóng") : row("Còn lại", `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`)) +
      row("Khối lượng", c.hasVol ? Math.round(vol).toLocaleString("en-US") : "không có", c.hasVol ? "" : "down");
    const bias = (b) => (b === 1 ? '<span class="up">tăng</span>' : b === -1 ? '<span class="down">giảm</span>' : "đi ngang");
    $("s2").querySelector(".body").innerHTML =
      row(`VWAP ${c.swing ? "tuần" : "phiên"}`, px(c.vw)) + row(`OP ${c.swing ? "tuần" : "ngày"}`, px(c.op)) + row("MLP", px(c.mlp)) +
      row("ATR 14", px(c.atr)) + row("ADX · DI+/DI−", `${f(c.adx, 0)} · ${f(c.diP, 0)}/${f(c.diM, 0)}`) +
      row("RVOL", f(c.rvol, 2), c.rvol >= o.rvolStr ? "up" : "") + row("KSI", f(c.ksi, 0), c.ksi >= o.ksiBuy ? "up" : c.ksi <= o.ksiSell ? "down" : "") +
      row("CMF", f(c.cmf, 2), cl(c.cmf)) + row("Nến CCRY", c.ccry === 1 ? '<span style="color:var(--buy)">Blue</span>' : c.ccry === -1 ? "Black" : "trung tính") +
      row("Xu hướng kỳ · khung lớn", `${bias(c.bias)} · ${bias(c.htfBias)}`);
    const L = c.long, Sh = c.short, oo = cur();
    const items = [
      ["L1 Giá vs OP & VWAP", "L1", oo.L1], ["L2 ADX↑ & DI", "L2", oo.L2], ["L3 Hồi về vùng tựa", "L3", oo.L3], ["L4 Mục tiêu ≥ RR", "L4", oo.l4On],
      ["L5 Hồi khối lượng thấp", "L5", oo.pbVolOn], ["Khung lớn cùng hướng", "htf", oo.htfOn], ["KSI", "ksi", oo.ksiOn], ["ADX ≥ 25", "adxS", oo.adxStrongOn],
      ["Nến CCRY", "ccry", oo.ccryOn], ["SL ≤ 1.5 ATR", "slOk", oo.slOkOn], ["Giờ giao dịch", "time", !c.swing], ["◆ RVOL ≥ 1.5", "L8", true],
    ];
    const mark = (v, on) => (!on ? '<span class="x">·</span>' : v ? '<span class="y">✓</span>' : '<span class="n">✗</span>');
    $("s3").querySelector(".body").innerHTML = `<div class="ck"><span class="h"></span><span class="h">MUA</span><span class="h">BÁN</span>` +
      items.map(([lb, k, on]) => `<span class="lb ${on ? "" : "off"}">${lb}</span>${mark(L[k], on)}${mark(Sh[k], on)}`).join("") + "</div>" +
      `<div class="dim small" style="margin-top:4px">${c.closed ? "Nến cuối đã đóng." : "Tạm tính trên nến đang chạy, tín hiệu chỉ chốt khi nến đóng."} Gạch ngang = điều kiện đang tắt.</div>`;
    const s = R.stats;
    $("s4").querySelector(".body").innerHTML = `<div class="big ${cl(s.totalR)}">${sg(s.totalR, 1)}R</div>` + row("Số lệnh", `${s.n} (◆ ${s.dia} · ◇ ${s.hollow})`) +
      row("Tỷ lệ thắng", pc(s.win)) + row("R trung bình/lệnh", sg(s.avgR), cl(s.avgR)) + row("Hệ số lợi nhuận", s.pf === Infinity ? "∞" : f(s.pf)) +
      row("Sụt giảm tối đa", `${f(s.maxDD, 1)}R`) + row(`Lãi/lỗ trên $${o.bal.toLocaleString("en-US")}`, `${s.usd >= 0 ? "+" : "−"}$${Math.abs(Math.round(s.usd)).toLocaleString("en-US")}`, cl(s.usd)) +
      row("Chuỗi thua dài nhất", s.worstStreak);
    let h;
    const p = R.open, pend = R.pending;
    if (p) {
      const now = B.c[n - 1], rNow = p.dir * (now - p.entry) / p.r;
      h = `<div class="big ${p.dir === 1 ? "up" : "down"}">ĐANG GIỮ ${dirTxt(p.dir)} ${p.grade === 2 ? '<span class="g2">◆</span>' : "◇"}</div>` +
        row("Vào lúc", when(p.t)) + row("Giá vào", px(p.entry)) + row("SL hiện tại", px(p.sl)) + row("TP1 · TP2", `${px(p.tp1)} · ${px(p.tp2)}`) +
        row("Lãi/lỗ tạm tính", `${sg(p.realR + p.remain * rNow)}R`, cl(rNow)) + row("Rủi ro", `${p.risk}% vốn`) + (p.tp1Done ? row("TP1", "đã chốt, SL dời về hòa vốn") : "");
    } else if (pend) {
      const e = R.events.find((x) => x.i === pend.sigI);
      h = `<div class="big ${pend.dir === 1 ? "up" : "down"}">LỆNH CHỜ ${dirTxt(pend.dir)} ${pend.grade === 2 ? '<span class="g2">◆</span>' : "◇"}</div>` +
        row("Vào ở", "giá mở nến kế tiếp") + row("Giá tín hiệu", px(e && e.price)) + row("SL", px(pend.sl)) + row("Rủi ro/lệnh", `${pend.grade === 2 ? o.riskD : o.riskA}% vốn`) +
        `<div class="small" style="margin-top:4px">${esc(e ? entryWhy(e) : "")}</div>`;
    } else {
      const miss = (side) => items.filter(([, k, on]) => on && k !== "L8" && !side[k]).map(([lb]) => lb.split(" ")[0] === "L1" || /^L\d/.test(lb) ? lb.split(" ")[0] : lb);
      const ml = miss(L), ms = miss(Sh), best = ml.length <= ms.length ? ["MUA", ml] : ["BÁN", ms];
      const ev = R.events[R.events.length - 1];
      h = `<div class="big">CHƯA CÓ TÍN HIỆU</div>` + row(`Gần nhất là ${best[0]}, còn thiếu`, best[1].length ? esc(best[1].join(", ")) : "chờ nến đóng") +
        (ev ? row("Tín hiệu gần nhất", `${ev.grade === 2 ? "◆" : "◇"} ${dirTxt(ev.dir)} ${when(ev.t)}`) : "") +
        `<div class="dim small" style="margin-top:4px">Chỉ là cảnh báo theo quy tắc. Người vào lệnh là bạn.</div>`;
    }
    $("s5").querySelector(".body").innerHTML = h;
    tickClocks();
  }
  function tickClocks() {
    const t = VNs.format(new Date());
    document.querySelectorAll(".st .clk").forEach((el) => { el.textContent = t; });
    $("clock").textContent = `${t} GMT+7`;
  }

  // ---------- texts ----------
  function entryWhy(e) {
    const zn = { vw: "VWAP", ml: "MLP", op: "OP" }, d = e.dir;
    const parts = [];
    parts.push(`giá ${d === 1 ? "trên" : "dưới"} OP ${px(e.op)} và VWAP ${px(e.vw)}`);
    parts.push(`ADX ${f(e.adx, 0)}${e.adxUp ? " đang tăng" : ""}, DI+ ${f(e.diP, 0)} / DI− ${f(e.diM, 0)}`);
    if (e.zone.length) parts.push(`hồi về ${e.zone.map((z) => zn[z]).join(" + ")} rồi nến ${d === 1 ? "tăng" : "giảm"} đóng cửa`);
    parts.push(`RVOL ${f(e.rvol, 2)}${e.grade === 2 ? " → ◆" : " → ◇"}`);
    parts.push(`khung lớn ${e.htfBias === d ? "cùng hướng" : e.htfBias === 0 ? "đi ngang" : "ngược hướng"}`);
    parts.push(`KSI ${f(e.ksi, 0)}`);
    if (e.sess) parts.push(`phiên ${{ AS: "Á", EU: "Âu", "AS-EU": "Á–Âu", "EU-US": "Âu–Mỹ", US: "Mỹ", OUT: "ngoài phiên" }[e.sess]}`);
    return parts.join(" · ");
  }
  function lossWhy(t) {
    const L = {
      htf: (v) => `Khung lớn ${v === 0 ? "đi ngang" : "ngược hướng"}`, rvol: (v) => `Khối lượng nến tín hiệu yếu (RVOL ${f(v, 2)})`,
      ksi: (v) => `KSI ngược hướng (${f(v, 0)})`, adx: (v) => `Xu hướng chưa mạnh (ADX ${f(v, 0)} < 25)`, cmf: (v) => `Dòng tiền CMF ngược hướng (${f(v, 2)})`,
      ccry: () => "Nến tín hiệu chưa phải Blue/Black", gave: (v) => `Đã lời ${f(v, 1)}R nhưng chưa tới TP1 rồi đảo chiều`,
      straight: (v) => `Giá đi ngược gần như ngay sau khi vào (lãi tối đa ${f(v, 2)}R)`, gap: (v) => `Giá vào cách giá tín hiệu ${f(v, 1)} ATR (nhảy giá)`,
      cost: (v) => `Phí và trượt giá ăn ${f(v, 2)}R vì SL hẹp`, thin: (v) => `Vào lệnh lúc thanh khoản mỏng (${v === "AS" ? "phiên Á" : "ngoài phiên"})`,
    };
    return M.lossFactors(t, R.opt).map(([k, v]) => L[k](v));
  }

  // ---------- stats, log, factors ----------
  function renderStats() {
    const s = R.stats, o = R.opt;
    const k = (l, v, c) => `<div class="kpi">${l}<b class="${c || ""}">${v}</b></div>`;
    $("kpis").innerHTML = k("Số lệnh", `${s.n}`) + k("Tỷ lệ thắng", pc(s.win)) + k("R trung bình", sg(s.avgR), cl(s.avgR)) +
      k("Tổng R", sg(s.totalR, 1), cl(s.totalR)) + k("Hệ số lợi nhuận", s.pf === Infinity ? "∞" : f(s.pf)) + k(`Lãi/lỗ $ (${f(s.pct, 1)}%)`, `${s.usd >= 0 ? "+" : "−"}$${Math.abs(Math.round(s.usd)).toLocaleString("en-US")}`, cl(s.usd));
    const skipped = R.events.filter((e) => !e.taken).length;
    $("st-note").textContent = `${R.events.length} tín hiệu, vào ${s.n} lệnh${skipped ? `, bỏ qua ${skipped} (đang có lệnh, khóa rủi ro hoặc chỉ là ◇)` : ""} · Mua ${s.long} · Bán ${s.short} · phí khứ hồi ${o.costPct}% · rủi ro ◆ ${o.riskD}% / ◇ ${o.riskA}%`;
    drawEq();
  }
  function drawEq() {
    const cv = $("eq"), ctx = fit(cv), W = cv.clientWidth, H = cv.clientHeight, cur = R.stats.curve;
    ctx.clearRect(0, 0, W, H);
    if (cur.length < 2) { ctx.fillStyle = "#6b7785"; ctx.font = "11px monospace"; ctx.fillText("Chưa đủ lệnh để vẽ đường vốn.", 8, 20); return; }
    const ys = cur.map((x) => x[1]).concat([0]), lo = Math.min(...ys), hi = Math.max(...ys), sy = (v) => H - 12 - (v - lo) / (hi - lo || 1) * (H - 24);
    ctx.strokeStyle = "#1c232d"; ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(W, sy(0)); ctx.stroke();
    ctx.strokeStyle = cur[cur.length - 1][1] >= 0 ? "#22c55e" : "#f0524f"; ctx.lineWidth = 1.5; ctx.beginPath();
    cur.forEach(([, v], i) => { const x = 4 + i / (cur.length - 1) * (W - 8); i ? ctx.lineTo(x, sy(v)) : ctx.moveTo(x, sy(v)); });
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = "#6b7785"; ctx.font = "10px monospace"; ctx.fillText(`Đường vốn theo R: đỉnh ${f(hi, 1)}R, đáy ${f(lo, 1)}R`, 6, 12);
  }
  $("logf").innerHTML = [["all", "Tất cả"], ["win", "Thắng"], ["loss", "Thua"]].map(([k, l]) => `<button class="tab ${k === logFilter ? "on" : ""}" data-f="${k}">${l}</button>`).join("");
  $("logf").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; logFilter = b.dataset.f; $("logf").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); renderLog(); });
  function renderLog() {
    const all = R.trades.map((t, k) => Object.assign(t, { no: k + 1 })).reverse();
    const list = all.filter((t) => logFilter === "all" || (logFilter === "win" ? t.R > 0 : t.R <= 0));
    $("log-n").textContent = `${list.length} lệnh, mới nhất ở trên`;
    if (!list.length) { $("log").innerHTML = `<tr><td class="dim">Không có lệnh nào với bộ điều kiện này. Thử tắt bớt điều kiện hoặc chọn preset "Nhiều lệnh".</td></tr>`; return; }
    $("log").innerHTML = `<tr><th>#</th><th>Lệnh</th><th>Vào lúc</th><th class="num">Giá vào</th><th class="num">SL</th><th class="num">TP1 / TP2</th><th>Thoát lúc</th><th class="num">Giá thoát</th><th>Lý do thoát</th><th class="num">R</th><th class="num">$</th><th>Lý do vào · vì sao thua</th></tr>` +
      list.slice(0, 400).map((t) => {
        const lw = t.R <= 0 ? lossWhy(t) : [];
        const exit = t.parts.length > 1 ? `${px(t.exitPx)}<br><span class="dim small">TP1 ${px(t.parts[0][1])} (${Math.round(t.parts[0][2] * 100)}%)</span>` : px(t.exitPx);
        return `<tr class="click ${selTrade === t.no ? "sel" : ""}" data-no="${t.no}"><td>${t.no}</td><td class="${t.dir === 1 ? "up" : "down"}">${dirTxt(t.dir)} <span class="${t.grade === 2 ? "g2" : "g1"}">${t.grade === 2 ? "◆" : "◇"}</span></td>` +
          `<td>${when(t.t)}</td><td class="num">${px(t.entry)}</td><td class="num">${px(t.sl0)}</td><td class="num">${px(t.tp1)}<br><span class="dim">${px(t.tp2)}</span></td>` +
          `<td>${when(t.exitT)}<br><span class="dim small">${t.bars} nến</span></td><td class="num">${exit}</td><td class="why">${esc(EXIT[t.exitWhy] || t.exitWhy)}</td>` +
          `<td class="num ${cl(t.R)}"><b>${sg(t.R)}</b></td><td class="num ${cl(t.usd)}">${t.usd >= 0 ? "+" : "−"}${Math.abs(Math.round(t.usd)).toLocaleString("en-US")}</td>` +
          `<td class="why"><b>Vào:</b> ${esc(t.snap ? entryWhy(t.snap) : "")}${t.R <= 0 ? `<br><b class="down">Vì sao thua:</b> ${esc(EXIT[t.exitWhy] || "")}${lw.length ? `<ul>${lw.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}` : `<br><span class="dim">Lãi tối đa trong lệnh ${f(t.mfe, 1)}R</span>`}</td></tr>`;
      }).join("");
  }
  $("log").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-no]");
    if (!tr) return;
    selTrade = +tr.dataset.no;
    const t = R.trades[selTrade - 1];
    view.end = Math.min(R.n - 1, t.exitI + 20); view.n = Math.max(60, t.exitI - t.sigI + 50);
    drawChart(); renderLog();
    $("cv").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  function renderFactors() {
    const rows = M.factorTable(R.trades);
    const c = (s) => (s.n ? `${s.n} lệnh · thắng ${pc(s.win)} · <span class="${cl(s.avgR)}">${sg(s.avgR)}R</span>` : '<span class="dim">–</span>');
    $("fac").innerHTML = `<tr><th>Yếu tố tại nến tín hiệu</th><th>Khi CÓ</th><th>Khi KHÔNG</th><th>Nhận xét</th></tr>` + rows.map((r) => {
      const gain = r.yes.n >= 5 && r.no.n >= 5 ? r.yes.avgR - r.no.avgR : null;
      const v = gain == null ? '<span class="dim">chưa đủ mẫu</span>' : gain > 0.15 ? '<span class="up">giúp thắng, nên bật</span>' : gain < -0.15 ? '<span class="down">không giúp</span>' : "khác biệt nhỏ";
      return `<tr><td>${FAC[r.key]}</td><td>${c(r.yes)}</td><td>${c(r.no)}</td><td>${v}</td></tr>`;
    }).join("");
    const losses = R.trades.filter((t) => t.R <= 0), cnt = {};
    for (const t of losses) {
      cnt[`exit:${t.exitWhy}`] = (cnt[`exit:${t.exitWhy}`] || 0) + 1;
      for (const [k] of M.lossFactors(t, R.opt)) cnt[k] = (cnt[k] || 0) + 1;
    }
    const LB = { htf: "Khung lớn không cùng hướng", rvol: "RVOL nến tín hiệu yếu", ksi: "KSI ngược hướng", adx: "ADX < 25", cmf: "CMF ngược hướng", ccry: "Nến tín hiệu không phải Blue/Black", gave: "Đã lời ≥ 1R rồi đảo chiều", straight: "Đi ngược ngay sau khi vào", gap: "Nhảy giá lúc vào", cost: "Phí ăn nhiều vì SL hẹp", thin: "Thanh khoản mỏng" };
    const items = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
    $("lossum").innerHTML = losses.length ? `<tr><th>Trong ${losses.length} lệnh thua</th><th class="num">Số lệnh</th></tr>` +
      items.map(([k, v]) => `<tr><td>${k.startsWith("exit:") ? `Thoát: ${esc(EXIT[k.slice(5)] || k)}` : esc(LB[k])}</td><td class="num">${v} <span class="dim">(${Math.round(v / losses.length * 100)}%)</span></td></tr>`).join("") : '<tr><td class="dim">Chưa có lệnh thua.</td></tr>';
  }

  // ---------- chart ----------
  function fit(cv) {
    const r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
    const ctx = cv.getContext("2d"); ctx.setTransform(r, 0, 0, r, 0, 0); return ctx;
  }
  let hover = null;
  function drawChart() {
    const cv = $("cv"), ctx = fit(cv), W = cv.clientWidth, H = cv.clientHeight;
    ctx.fillStyle = "#05070a"; ctx.fillRect(0, 0, W, H);
    if (!R || !B) { ctx.fillStyle = "#6b7785"; ctx.font = "12px monospace"; ctx.fillText("Đang chờ dữ liệu…", 12, 24); return; }
    const S2 = R.series, n = R.n, padR = 70, volH = Math.round(H * 0.14), top = 8, bot = H - volH - 18;
    const nVis = Math.max(20, Math.min(n, view.n)), end = view.end == null ? n - 1 : Math.max(nVis - 1, Math.min(n - 1, view.end)), start = Math.max(0, end - nVis + 1);
    const bw = (W - padR) / nVis, x = (i) => (i - start + 0.5) * bw;
    let lo = Infinity, hi = -Infinity, vmax = 0;
    for (let i = start; i <= end; i++) { lo = Math.min(lo, B.l[i]); hi = Math.max(hi, B.h[i]); vmax = Math.max(vmax, B.v[i]); }
    const span = hi - lo || hi * 0.01 || 1; lo -= span * 0.06; hi += span * 0.06;
    const y = (p) => top + (hi - p) / (hi - lo) * (bot - top);
    // grid and price axis
    ctx.font = "10px monospace"; ctx.textAlign = "left";
    for (let k = 0; k <= 5; k++) {
      const p = lo + (hi - lo) * k / 5, yy = y(p);
      ctx.strokeStyle = "#11161d"; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.fillStyle = "#6b7785"; ctx.fillText(px(p), W - padR + 4, yy + 3);
    }
    // session separators and time labels
    let lastLbl = -1e9;
    for (let i = start; i <= end; i++) if (S2.newSess[i]) {
      ctx.strokeStyle = "#141b24"; ctx.beginPath(); ctx.moveTo(x(i) - bw / 2, top); ctx.lineTo(x(i) - bw / 2, H - 14); ctx.stroke();
      if (x(i) - lastLbl > 70) { ctx.fillStyle = "#6b7785"; ctx.fillText(when(B.t[i]).slice(0, 5), x(i) - bw / 2 + 2, H - 3); lastLbl = x(i); }
    }
    // levels: OP, MLP, VWAP (broken at each new period)
    const line = (arr, color, w, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); let on = false;
      for (let i = start; i <= end; i++) {
        const v = arr[i];
        if (!isFinite(v) || S2.newSess[i]) { on = false; if (!isFinite(v)) continue; }
        on ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)); on = true;
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    };
    line(S2.op, "#ff8a3d", 1, [4, 3]); line(S2.mlp, "#c77dff", 1, [2, 3]); line(S2.vw, "#ffc233", 1.6);
    // volume
    for (let i = start; i <= end; i++) {
      const h = vmax ? B.v[i] / vmax * (volH - 4) : 0;
      ctx.fillStyle = S2.rvol[i] >= R.opt.rvolStr ? "rgba(255,176,0,.55)" : "rgba(107,119,133,.35)";
      ctx.fillRect(x(i) - bw * 0.35, H - 16 - h, Math.max(1, bw * 0.7), h);
    }
    // CCRY candles
    for (let i = start; i <= end; i++) {
      const c = S2.ccry[i], up = B.c[i] >= B.o[i];
      const edge = c === 1 ? "#3d7bff" : c === -1 ? "#d5dae3" : "#5e6676", body = c === 1 ? "#3d7bff" : c === -1 ? "#07080b" : null;
      ctx.strokeStyle = edge; ctx.beginPath(); ctx.moveTo(x(i), y(B.h[i])); ctx.lineTo(x(i), y(B.l[i])); ctx.stroke();
      const y1 = y(Math.max(B.o[i], B.c[i])), y2 = y(Math.min(B.o[i], B.c[i])), w = Math.max(1, bw * 0.7);
      if (body) { ctx.fillStyle = body; ctx.fillRect(x(i) - w / 2, y1, w, Math.max(1, y2 - y1)); }
      else { ctx.fillStyle = "#05070a"; ctx.fillRect(x(i) - w / 2, y1, w, Math.max(1, y2 - y1)); }
      ctx.strokeRect(x(i) - w / 2 + 0.5, y1 + 0.5, w - 1, Math.max(1, y2 - y1));
      void up;
    }
    // trades
    for (const [k, t] of R.trades.entries()) {
      if (t.exitI < start || t.i > end) continue;
      const win = t.R > 0, col = win ? "#22c55e" : "#f0524f", sel = selTrade === k + 1;
      ctx.fillStyle = sel ? "rgba(255,176,0,.10)" : win ? "rgba(34,197,94,.06)" : "rgba(240,82,79,.06)";
      ctx.fillRect(x(t.i) - bw / 2, Math.min(y(t.tp2), y(t.sl0)), (t.exitI - t.i + 1) * bw, Math.abs(y(t.tp2) - y(t.sl0)));
      ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(240,82,79,.8)"; ctx.beginPath(); ctx.moveTo(x(t.i) - bw / 2, y(t.sl0)); ctx.lineTo(x(t.exitI) + bw / 2, y(t.sl0)); ctx.stroke();
      ctx.strokeStyle = "rgba(34,197,94,.8)"; ctx.beginPath(); ctx.moveTo(x(t.i) - bw / 2, y(t.tp1)); ctx.lineTo(x(t.exitI) + bw / 2, y(t.tp1)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(x(t.i), y(t.entry)); ctx.lineTo(x(t.exitI), y(t.exitPx)); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = t.dir === 1 ? "#22c55e" : "#f0524f"; ctx.font = "11px monospace"; ctx.textAlign = "center";
      ctx.fillText(t.dir === 1 ? "▲" : "▼", x(t.i), t.dir === 1 ? y(B.l[t.i]) + 13 : y(B.h[t.i]) - 4);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x(t.exitI), y(t.exitPx), 3, 0, 6.3); ctx.fill();
      if (bw > 3 || sel) { ctx.fillText(`${sg(t.R, 1)}R`, x(t.exitI), y(t.exitPx) + (t.dir === 1 ? -7 : 14)); }
      ctx.textAlign = "left";
    }
    // open position
    if (R.open) {
      const p = R.open;
      [[p.sl, "#f0524f", "SL"], [p.tp1, "#22c55e", "TP1"], [p.tp2, "#22c55e", "TP2"], [p.entry, "#ffb000", "VÀO"]].forEach(([v, c, l]) => {
        ctx.strokeStyle = c; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(x(Math.max(start, p.i)), y(v)); ctx.lineTo(W - padR, y(v)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c; ctx.fillText(`${l} ${px(v)}`, W - padR + 4, y(v) - 2);
      });
    }
    // signals
    ctx.font = "12px monospace"; ctx.textAlign = "center";
    for (const e of R.events) {
      if (e.i < start || e.i > end) continue;
      ctx.fillStyle = e.grade === 2 ? "#22e3ff" : "#9aa4b2";
      ctx.fillText(e.grade === 2 ? "◆" : "◇", x(e.i), e.dir === 1 ? y(B.l[e.i]) + 25 : y(B.h[e.i]) - 15);
    }
    ctx.textAlign = "left";
    // last price
    const lp = B.c[n - 1];
    if (end === n - 1) { ctx.fillStyle = "#ffb000"; ctx.fillRect(W - padR, y(lp) - 7, padR, 14); ctx.fillStyle = "#000"; ctx.fillText(px(lp), W - padR + 4, y(lp) + 4); }
    // crosshair
    if (hover != null && hover >= start && hover <= end) {
      const i = hover;
      ctx.strokeStyle = "#39424f"; ctx.beginPath(); ctx.moveTo(x(i), top); ctx.lineTo(x(i), H - 14); ctx.stroke();
      const lines = [when(B.t[i]), `O ${px(B.o[i])}  H ${px(B.h[i])}`, `L ${px(B.l[i])}  C ${px(B.c[i])}`, `VWAP ${px(S2.vw[i])}  OP ${px(S2.op[i])}`,
        `ADX ${f(S2.adx[i], 0)}  RVOL ${f(S2.rvol[i], 2)}  KSI ${f(S2.ksi[i], 0)}`];
      const bx = x(i) > W / 2 ? 8 : W - padR - 250;
      ctx.fillStyle = "rgba(13,17,23,.92)"; ctx.fillRect(bx, top + 4, 242, lines.length * 14 + 8);
      ctx.fillStyle = "#d6dde6"; ctx.font = "10.5px monospace"; lines.forEach((l, k) => ctx.fillText(l, bx + 6, top + 18 + k * 14));
    }
    cv._geo = { start, end, bw };
  }
  // pan, zoom, crosshair
  (() => {
    const cv = $("cv");
    let drag = null;
    const idx = (ev) => { const g = cv._geo, r = cv.getBoundingClientRect(); return g ? g.start + Math.floor((ev.clientX - r.left) / g.bw) : null; };
    cv.addEventListener("pointerdown", (ev) => { drag = { x: ev.clientX, end: cv._geo ? cv._geo.end : 0 }; cv.setPointerCapture(ev.pointerId); });
    cv.addEventListener("pointermove", (ev) => {
      if (drag && cv._geo) { const d = Math.round((ev.clientX - drag.x) / cv._geo.bw); view.end = Math.min(R ? R.n - 1 : 0, drag.end - d); if (R && view.end >= R.n - 1) view.end = null; }
      hover = idx(ev); drawChart();
    });
    cv.addEventListener("pointerup", () => { drag = null; });
    cv.addEventListener("pointerleave", () => { hover = null; drawChart(); });
    cv.addEventListener("wheel", (ev) => { ev.preventDefault(); view.n = Math.max(30, Math.min(1500, Math.round(view.n * (ev.deltaY > 0 ? 1.15 : 0.87)))); drawChart(); }, { passive: false });
    $("zin").onclick = () => { view.n = Math.max(30, Math.round(view.n * 0.75)); drawChart(); };
    $("zout").onclick = () => { view.n = Math.min(1500, Math.round(view.n * 1.33)); drawChart(); };
    $("zend").onclick = () => { view.end = null; selTrade = null; drawChart(); };
    window.addEventListener("resize", () => { drawChart(); if (R) drawEq(); });
  })();

  // ---------- run for every asset ----------
  let raRunning = false;
  $("runall").addEventListener("click", async () => {
    if (raRunning) return;
    raRunning = true; $("runall").disabled = true;
    const tf = S.tf, list = ASSETS.slice(), out = [];
    let done = 0;
    const work = async (a) => {
      const src = srcOf(a, tf), o = Object.assign(opts(a), { tfSec: F.TF[tf], costPct: S.costs[a.cls] ?? 0.1 });
      try {
        const bars = await F.SRC[src].bars(a, tf, Math.min(S.hist, 3000));
        const r = M.run(bars, o), ev = r.events[r.events.length - 1];
        out.push({ a, src, s: r.stats, open: r.open, pend: r.pending, ev: ev && ev.i >= r.n - 3 ? ev : null, n: r.n });
      } catch (e) { out.push({ a, src, err: e.message || String(e) }); }
      done++; $("ra-prog").style.width = `${done / list.length * 100}%`;
      $("ra-note").textContent = `Đang chạy ${done}/${list.length}… (${TFL[tf]})`;
      renderRA(out, tf);
    };
    const q = list.slice();
    await Promise.all([0, 1, 2, 3].map(async () => { while (q.length) await work(q.shift()); }));
    $("ra-note").textContent = `Xong ${list.length} mã · khung ${TFL[tf]} · bộ điều kiện ${S.preset === "tuy" ? "tự chọn" : PRESETS[S.preset].name} · bấm một dòng để mở mã đó`;
    raRunning = false; $("runall").disabled = false;
  });
  function renderRA(out, tf) {
    const rows = out.slice().sort((x, y) => GROUPS.indexOf(x.a.cls) - GROUPS.indexOf(y.a.cls) || ((y.s && y.s.totalR) || -1e9) - ((x.s && x.s.totalR) || -1e9));
    $("ra").innerHTML = `<tr><th>Mã</th><th>Nguồn</th><th class="num">Lệnh</th><th class="num">Thắng</th><th class="num">R TB</th><th class="num">Tổng R</th><th class="num">PF</th><th class="num">Sụt giảm</th><th>Lúc này</th></tr>` +
      rows.map((r, k) => (k === 0 || rows[k - 1].a.cls !== r.a.cls ? `<tr class="grp"><td colspan="9">${GNAME[r.a.cls]}</td></tr>` : "") +
        (r.err ? `<tr><td><b>${esc(r.a.symbol)}</b></td><td class="dim">${esc(F.SRC[r.src].label)}</td><td colspan="7" class="dim">không lấy được dữ liệu (${esc(r.err)})</td></tr>` :
          `<tr class="click" data-s="${esc(r.a.symbol)}"><td><b>${esc(r.a.symbol)}</b></td><td class="dim small">${esc(F.SRC[r.src].label)}</td><td class="num">${r.s.n}</td><td class="num">${pc(r.s.win)}</td>` +
          `<td class="num ${cl(r.s.avgR)}">${sg(r.s.avgR)}</td><td class="num ${cl(r.s.totalR)}"><b>${sg(r.s.totalR, 1)}</b></td><td class="num">${r.s.pf === Infinity ? "∞" : f(r.s.pf)}</td><td class="num">${f(r.s.maxDD, 1)}R</td>` +
          `<td>${r.open ? `<span class="${r.open.dir === 1 ? "up" : "down"}">đang giữ ${dirTxt(r.open.dir)}</span>` : r.pend ? `<b class="g2">chờ vào ${dirTxt(r.pend.dir)}</b>` : r.ev ? `${r.ev.grade === 2 ? "◆" : "◇"} ${dirTxt(r.ev.dir)} mới` : '<span class="dim">chưa có tín hiệu</span>'}</td></tr>`)).join("");
  }
  $("ra").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-s]");
    if (!tr) return;
    S.sym = tr.dataset.s; save(); $("asset").value = S.sym; fillSrc(); load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---------- clock: every stage refreshes each second ----------
  setInterval(() => {
    tickClocks();
    if (dirty && Date.now() - lastRun >= 900) rerun(false);
    else if (R) renderStages();
  }, 1000);
  // sources without streaming: reload the server file every 5 minutes
  setInterval(() => { if (B && !F.SRC[B.src].live && !document.hidden) load(); }, 300000);

  // ---------- start ----------
  $("view").value = S.view; $("hist").value = String(S.hist);
  if (!$("hist").value) { S.hist = 5000; $("hist").value = "5000"; }
  fillTfs(); renderPresets(); renderChips();
  (async () => {
    try {
      const j = await F.getJSON(`../data/latest.json?v=${Math.floor(Date.now() / 300000)}`);
      if (j.market && j.market.length) ASSETS = j.market.map((m) => ({ symbol: m.symbol, cls: m.cls }));
    } catch (e) { /* keep the fallback list */ }
    fillAssets(); fillSrc(); load();
  })();
})();
