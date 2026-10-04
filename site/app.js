/* Lai Long Desk Terminal: reads data/*.json written by the scan and renders the desk. */
"use strict";

const T = {
  vi: {
    setups: "CƠ HỘI GIAO DỊCH", macro: "VĨ MÔ · LÃI SUẤT · USD", survival: "SỐNG SÓT · HIỆU QUẢ SAU CHI PHÍ",
    radar: "RADAR KHỐI LƯỢNG BẤT THƯỜNG", crowd: "CRYPTO · ĐÁM ĐÔNG (FUNDING)", cot: "VỊ THẾ ĐẦU CƠ (CFTC COT)",
    journal: "NHẬT KÝ TÍN HIỆU (THEO DÕI THẬT)", backtest: "BACKTEST TỪNG LOẠI TÍN HIỆU", market: "BẢNG THỊ TRƯỜNG",
    showC: "hiện hạng C",
    setupsHint: "Hạng A ≥ 70 điểm, B ≥ 55. Chỉ dùng nến ngày đã đóng. Loại tín hiệu nào backtest lỗ sau chi phí sẽ bị khóa ở hạng C. Bấm vào dòng để xem chi tiết. Bạn luôn là người quyết định.",
    equityHint: "Đường vốn backtest của toàn bộ tín hiệu, đơn vị R (1R = số tiền rủi ro mỗi lệnh), đã trừ phí và trượt giá.",
    radarHint: "Khối lượng gấp nhiều lần bình thường. \"Lặng lẽ\" = khối lượng lớn nhưng giá gần như không đổi: có người đang gom hoặc xả.",
    crowdHint: "Funding dương lớn = phe mua đông và trả phí cao (dễ bị quét). Âm lớn = phe bán đông. Nguồn: Hyperliquid.",
    cotHint: "Phân vị vị thế ròng của giới đầu cơ trong 3 năm. ≥ 90 hoặc ≤ 10 là cực đoan, thường dễ đảo chiều.",
    footer: "Lai Long Desk chỉ là công cụ cảnh báo cá nhân, không tự đặt lệnh và không phải lời khuyên đầu tư. Dữ liệu miễn phí có độ trễ. Nguyên tắc: sống sót trước, kiếm vàng sau.",
    all: "TẤT CẢ", crypto: "CRYPTO", forex: "FOREX", commodity: "HÀNG HÓA",
    grade: "Hạng", asset: "Tài sản", cls: "Nhóm", setup: "Mẫu hình", dir: "Hướng", entry: "Vào", stop: "Cắt lỗ",
    target: "Chốt lời", rr: "R:R", rvol: "KL x", macroCol: "Vĩ mô", hist: "Backtest R/lệnh", score: "Điểm",
    long: "MUA", short: "BÁN", none: "Hiện chưa có cơ hội đạt chuẩn. Không có lệnh cũng là một quyết định tốt.",
    price: "Giá", chg: "% ngày", trend: "Xu hướng", atr: "Biên độ %", funding: "Funding %/năm", oi: "OI",
    up: "tăng", down: "giảm", range: "đi ngang", tf: "Khung", kind: "Loại", note: "Ghi chú",
    quiet_volume: "lặng lẽ", hourly_spike: "đột biến giờ", accumulation: "có thể đang gom", distribution: "có thể đang xả", unclear: "chưa rõ",
    netPct: "Phân vị", chgW: "Thay đổi tuần", date: "Ngày",
    usdMedium: "USD trung–dài hạn (chính sách lãi suất)", usdIntraday: "USD trong ngày (DXY + lợi suất)",
    usdBias: "USD trung hạn / trong ngày", usdStrong: "USD mạnh", usdWeak: "USD yếu", usdNeutral: "trung tính",
    ff: "Lãi suất Fed", y2: "Lợi suất 2 năm", y10: "Lợi suất 10 năm", dxy: "DXY",
    trades: "Số lệnh", win: "% thắng", exp: "Kỳ vọng R/lệnh", total: "Tổng R", pf: "Profit factor", dd: "Sụt giảm tối đa R", streak: "Chuỗi thua dài nhất",
    survives: "ĐẠT: có lãi sau chi phí", fails: "CHƯA ĐẠT: lỗ sau chi phí", na: "chưa đủ dữ liệu",
    btLabel: "Backtest", liveLabel: "Thực tế",
    status: "Trạng thái", open: "đang mở", win_: "thắng", loss: "thua", expired: "hết hạn", skipped: "bỏ qua", result: "Kết quả R",
    logged: "Ghi nhận", noJournal: "Chưa có tín hiệu nào được ghi. Tín hiệu hạng A/B sẽ được tự động ghi lại và chấm kết quả thật.",
    updated: "cập nhật", ago: "trước", stale: "dữ liệu cũ", loading: "đang tải…", noData: "Chưa có dữ liệu. Hệ thống sẽ có dữ liệu sau lần quét đầu tiên.",
    why: "Lý do", scoreParts: "Cách tính điểm", risk: "Rủi ro / lệnh", cost: "Chi phí khứ hồi", plan: "Kế hoạch lệnh",
    histFor: "Backtest của mẫu hình này trong nhóm", errors: "Nguồn lỗi lần quét này",
    TREND_PULLBACK: "Hồi về hỗ trợ/kháng cự thuận xu hướng", VOL_BREAKOUT: "Phá vỡ kèm khối lượng", RANGE_EDGE: "Bật lại ở biên vùng đi ngang",
  },
  en: {
    setups: "TRADE SETUPS", macro: "MACRO · RATES · USD", survival: "SURVIVAL · EDGE AFTER COSTS",
    radar: "ABNORMAL VOLUME RADAR", crowd: "CRYPTO · CROWDING (FUNDING)", cot: "SPECULATOR POSITIONING (CFTC COT)",
    journal: "SIGNAL JOURNAL (LIVE TRACKING)", backtest: "BACKTEST BY SIGNAL TYPE", market: "MARKET WATCH",
    showC: "show grade C",
    setupsHint: "Grade A ≥ 70 points, B ≥ 55. Closed daily bars only. Signal types that lose money after costs in the backtest are capped at C. Click a row for details. You always make the call.",
    equityHint: "Backtest equity of every signal, in R (1R = the amount risked per trade), after fees and slippage.",
    radarHint: "Volume many times normal. \"Quiet\" = big volume while price barely moved: someone is accumulating or distributing.",
    crowdHint: "Large positive funding = crowded longs paying up (squeeze risk). Large negative = crowded shorts. Source: Hyperliquid.",
    cotHint: "Percentile of speculators' net position over 3 years. ≥ 90 or ≤ 10 is extreme and prone to reversal.",
    footer: "Lai Long Desk is a personal alert tool. It never places orders and is not investment advice. Free data is delayed. Rule: survive first, then strike gold.",
    all: "ALL", crypto: "CRYPTO", forex: "FOREX", commodity: "COMMODITIES",
    grade: "Grade", asset: "Asset", cls: "Class", setup: "Setup", dir: "Side", entry: "Entry", stop: "Stop",
    target: "Target", rr: "R:R", rvol: "Vol x", macroCol: "Macro", hist: "Backtest R/trade", score: "Score",
    long: "LONG", short: "SHORT", none: "No setup meets the bar right now. No trade is a good decision too.",
    price: "Price", chg: "1D %", trend: "Trend", atr: "ATR %", funding: "Funding %/yr", oi: "OI",
    up: "up", down: "down", range: "range", tf: "TF", kind: "Type", note: "Note",
    quiet_volume: "quiet", hourly_spike: "hourly spike", accumulation: "possible accumulation", distribution: "possible distribution", unclear: "unclear",
    netPct: "Percentile", chgW: "Weekly change", date: "Date",
    usdMedium: "USD medium/long term (rate policy)", usdIntraday: "USD intraday (DXY + yields)",
    usdBias: "USD medium / intraday", usdStrong: "USD strong", usdWeak: "USD weak", usdNeutral: "neutral",
    ff: "Fed funds", y2: "US 2Y", y10: "US 10Y", dxy: "DXY",
    trades: "Trades", win: "Win %", exp: "Expectancy R/trade", total: "Total R", pf: "Profit factor", dd: "Max drawdown R", streak: "Longest losing streak",
    survives: "PASS: profitable after costs", fails: "FAIL: loses after costs", na: "not enough data",
    btLabel: "Backtest", liveLabel: "Live",
    status: "Status", open: "open", win_: "win", loss: "loss", expired: "expired", skipped: "skipped", result: "Result R",
    logged: "Logged", noJournal: "No signals logged yet. Grade A/B signals are logged automatically and scored on real outcomes.",
    updated: "updated", ago: "ago", stale: "stale data", loading: "loading…", noData: "No data yet. It appears after the first scan.",
    why: "Why", scoreParts: "Score breakdown", risk: "Risk / trade", cost: "Round-trip cost", plan: "Trade plan",
    histFor: "Backtest of this setup in", errors: "Feeds that failed this scan",
    TREND_PULLBACK: "Pullback to support/resistance with the trend", VOL_BREAKOUT: "Breakout on volume", RANGE_EDGE: "Bounce at a range edge",
  },
};

const VI_NOTES = [
  [/^\+(\d+) volume (.*)x$/, "+$1 khối lượng $2x"], [/^\+5 R:R >= 3$/, "+5 R:R ≥ 3"],
  [/^(.+) macro \(rates\/USD\)$/, "$1 vĩ mô (lãi suất/USD)"], [/^-10 crowded side \(funding\)$/, "-10 phe này đang quá đông (funding)"],
  [/^\+5 crowd on the other side \(squeeze fuel\)$/, "+5 đám đông ở phe ngược lại (nhiên liệu squeeze)"],
  [/^-5 speculators already extreme \(COT\)$/, "-5 giới đầu cơ đã ở mức cực đoan (COT)"],
  [/^\+5 speculators positioned the other way \(COT\)$/, "+5 giới đầu cơ đang đặt cược ngược lại (COT)"],
  [/^\+5 backtest (.*)R\/trade$/, "+5 backtest $1R/lệnh"], [/^capped: backtest loses after costs \((.*)R\)$/, "khóa hạng: backtest lỗ sau chi phí ($1R)"],
  [/^uptrend, rejected support (\S+) \((\d+) touches\)$/, "xu hướng tăng, giá bật khỏi hỗ trợ $1 (đã chạm $2 lần)"],
  [/^downtrend, rejected resistance (\S+) \((\d+) touches\)$/, "xu hướng giảm, giá bị từ chối ở kháng cự $1 (đã chạm $2 lần)"],
  [/^20-bar high broken on (.*)x volume$/, "phá đỉnh 20 phiên với khối lượng $1x"], [/^20-bar low broken on (.*)x volume$/, "phá đáy 20 phiên với khối lượng $1x"],
  [/^range (\S+)-(\S+), bounce off the floor$/, "vùng đi ngang $1–$2, bật lên từ đáy vùng"],
  [/^range (\S+)-(\S+), rejected at the ceiling$/, "vùng đi ngang $1–$2, bị từ chối ở đỉnh vùng"],
  [/^Fed cutting: funds rate (.*) -> (.*) in 90d$/, "Fed đang cắt giảm: lãi suất $1 → $2 trong 90 ngày"],
  [/^Fed hiking: funds rate (.*) -> (.*) in 90d$/, "Fed đang tăng lãi suất: $1 → $2 trong 90 ngày"],
  [/^Fed on hold at (.*)$/, "Fed giữ nguyên lãi suất ở $1"],
  [/^2Y (.*) below funds rate: market prices more cuts$/, "Lợi suất 2 năm $1 thấp hơn lãi suất Fed: thị trường đặt cược sẽ cắt giảm thêm"],
  [/^2Y (.*) above funds rate: market prices hikes$/, "Lợi suất 2 năm $1 cao hơn lãi suất Fed: thị trường đặt cược sẽ tăng lãi suất"],
  [/^10Y (.*) -> (.*) over ~2 months$/, "Lợi suất 10 năm $1 → $2 trong ~2 tháng"],
  [/^DXY (\S+) in uptrend .*$/, "DXY $1 đang trong xu hướng tăng (trên trung bình 50/200 ngày)"],
  [/^DXY (\S+) in downtrend .*$/, "DXY $1 đang trong xu hướng giảm (dưới trung bình 50/200 ngày)"],
  [/^DXY (\S+) no clear trend$/, "DXY $1 chưa có xu hướng rõ"],
  [/^DXY (.*) over last (\d+)h$/, "DXY $1 trong $2 giờ qua"], [/^US10Y (.*) over last (\d+)h$/, "Lợi suất 10 năm Mỹ $1 trong $2 giờ qua"],
];

let lang = safeGet("lld-lang") || "vi";
let clsFilter = safeGet("lld-cls") || "all";
let D = null, S = null, LOG = [];
let marketSort = { key: "rvol", dir: -1 };

function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
const t = (k) => (T[lang][k] ?? T.en[k] ?? k);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function tr(text) {
  if (lang !== "vi") return text;
  for (const [re, rep] of VI_NOTES) if (re.test(text)) return text.replace(re, rep);
  return text;
}
function px(x) {
  if (x == null || isNaN(x)) return "–";
  const a = Math.abs(x);
  const d = a >= 1000 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 5 : 8;
  return Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
const pct = (x, d = 2) => (x == null ? "–" : `${x > 0 ? "+" : ""}${Number(x).toFixed(d)}%`);
const sgn = (x, d = 2) => (x == null ? "–" : `${x > 0 ? "+" : ""}${Number(x).toFixed(d)}`);
const cl = (x) => (x > 0 ? "up" : x < 0 ? "down" : "");
const big = (x) => (x == null ? "–" : x >= 1e9 ? (x / 1e9).toFixed(2) + "B" : x >= 1e6 ? (x / 1e6).toFixed(1) + "M" : x.toFixed(0));
const dirTag = (d) => `<span class="${d === "long" ? "up" : "down"}">${d === "long" ? "▲" : "▼"} ${t(d)}</span>`;
const dateStr = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);

async function load() {
  const bust = `?v=${Date.now()}`;
  const get = (f) => fetch(`data/${f}${bust}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  [D, S, LOG] = await Promise.all([get("latest.json"), get("scorecard.json"), get("signals_log.json")]);
  LOG = LOG || [];
  render();
}

function render() {
  document.documentElement.lang = lang;
  $("lang").textContent = lang === "vi" ? "EN" : "VI";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  renderTabs();
  if (!D) {
    $("t-setups").innerHTML = `<tr><td class="empty">${t("noData")}</td></tr>`;
    return;
  }
  renderAge(); renderStrip(); renderSetups(); renderMacro(); renderSurvival(); renderRadar();
  renderCrowd(); renderCot(); renderJournal(); renderBacktest(); renderMarket();
  $("errors").textContent = D.errors && D.errors.length ? `${t("errors")}: ${D.errors.join(" · ")}` : "";
}

function renderTabs() {
  $("cls-tabs").innerHTML = ["all", "crypto", "forex", "commodity"].map((c) =>
    `<button class="tab ${c === clsFilter ? "on" : ""}" data-cls="${c}">${t(c)}</button>`).join("");
}

function renderAge() {
  const mins = Math.round((Date.now() / 1000 - D.generated) / 60);
  const el = $("age");
  const txt = mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
  el.textContent = mins > 360 ? `${t("stale")} · ${txt} ${t("ago")}` : `${t("updated")} ${txt} ${t("ago")}`;
  el.className = "pill " + (mins > 360 ? "stale" : "ok");
}

function biasWord(b) { return b > 0 ? t("usdStrong") : b < 0 ? t("usdWeak") : t("usdNeutral"); }

function renderStrip() {
  const m = D.macro.medium, i = D.macro.intraday;
  const items = [
    [t("ff"), m.fed_funds != null ? m.fed_funds.toFixed(2) + "%" : "–"],
    [t("y2"), m.us2y != null ? m.us2y.toFixed(2) + "%" : "–"],
    [t("y10"), m.us10y != null ? m.us10y.toFixed(2) + "%" : "–"],
    [t("dxy"), m.dxy != null ? m.dxy.toFixed(2) : "–"],
    ["DXY 8h", `<span class="${cl(i.dxy_chg_pct)}">${pct(i.dxy_chg_pct)}</span>`],
    ["10Y 8h", `<span class="${cl(i.us10y_chg_bp)}">${sgn(i.us10y_chg_bp, 1)}bp</span>`],
    [t("usdBias"), `${biasWord(m.bias)} / ${biasWord(i.bias)}`],
  ];
  const tops = (D.market || []).filter((x) => ["BTC", "ETH", "GOLD", "WTI", "EURUSD", "USDJPY"].includes(x.symbol));
  tops.forEach((x) => items.push([x.symbol, `${px(x.price)} <span class="${cl(x.chg_pct)}">${pct(x.chg_pct)}</span>`]));
  $("strip").innerHTML = items.map(([k, v]) => `<span><b>${esc(k)}</b>${v}</span>`).join("");
}

function filtered(rows) { return clsFilter === "all" ? rows : rows.filter((r) => r.cls === clsFilter); }

function renderSetups() {
  const showC = $("show-c").checked;
  const rows = filtered(D.setups || []).filter((s) => showC || s.grade !== "C");
  if (!rows.length) { $("t-setups").innerHTML = `<tr><td class="empty">${t("none")}</td></tr>`; return; }
  const head = ["grade", "asset", "setup", "dir", "entry", "stop", "target", "rr", "rvol", "macroCol", "hist", "score"];
  $("t-setups").innerHTML = `<tr>${head.map((h, k) => `<th class="${k > 3 ? "num" : ""}">${t(h)}</th>`).join("")}</tr>` +
    rows.map((s, k) => `<tr class="click" data-setup="${D.setups.indexOf(s)}">
      <td><span class="grade ${s.grade}">${s.grade}</span></td>
      <td><b>${esc(s.symbol)}</b> <span class="dim">${t(s.cls)}</span></td>
      <td title="${esc(t(s.setup))}">${esc(t(s.setup))}</td><td>${dirTag(s.dir)}</td>
      <td class="num">${px(s.entry)}</td><td class="num down">${px(s.stop)}</td><td class="num up">${px(s.target)}</td>
      <td class="num">${s.rr.toFixed(1)}</td><td class="num">${s.rvol ? s.rvol.toFixed(1) : "–"}</td>
      <td class="num ${cl(s.macro_align)}">${sgn(s.macro_align)}</td>
      <td class="num ${cl(s.hist && s.hist.exp_r)}">${s.hist && s.hist.n ? sgn(s.hist.exp_r) + ` <span class="dim">(${s.hist.n})</span>` : "–"}</td>
      <td class="num amber"><b>${s.score}</b></td></tr>`).join("");
}

function meter(b) { return `<div class="meter"><i style="left:${((b + 2) / 4) * 100}%"></i></div>`; }

function renderMacro() {
  const m = D.macro.medium, i = D.macro.intraday;
  $("macro").innerHTML = `
    <div class="dim">${t("usdMedium")}</div>
    <div class="bias">${meter(m.bias)}<b class="${m.bias > 0 ? "up" : m.bias < 0 ? "down" : ""}">${biasWord(m.bias)} (${sgn(m.bias, 0)})</b></div>
    <ul class="reasons">${(m.reasons || []).map((r) => `<li>${esc(tr(r))}</li>`).join("")}</ul>
    <div class="dim">${t("usdIntraday")}</div>
    <div class="bias">${meter(i.bias)}<b class="${i.bias > 0 ? "up" : i.bias < 0 ? "down" : ""}">${biasWord(i.bias)} (${sgn(i.bias, 0)})</b></div>
    <ul class="reasons">${(i.reasons || []).map((r) => `<li>${esc(tr(r))}</li>`).join("")}</ul>`;
}

function statusLine(label, st) {
  if (!st || !st.n || st.n < 30) return `<div class="status na"><span>${label}</span><span>${t("na")} (${st ? st.n : 0})</span></div>`;
  const ok = st.exp_r > 0;
  return `<div class="status ${ok ? "ok" : "bad"}"><span>${label}: ${ok ? t("survives") : t("fails")}</span>
    <span>${sgn(st.exp_r)}R · ${st.n}</span></div>`;
}

function renderSurvival() {
  if (!S) { $("survival").innerHTML = `<div class="empty">${t("noData")}</div>`; return; }
  $("survival").innerHTML = ["crypto", "forex", "commodity"].map((c) =>
    `<div style="margin-bottom:6px"><b>${t(c)}</b>${statusLine(t("btLabel"), S.backtest_class[c])}${statusLine(t("liveLabel"), S.live_class[c])}</div>`).join("");
  drawLine($("equity"), (S.equity_curve || []).map((p) => p[1]), { zero: true });
}

function drawLine(cv, vals, opt = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || 300, h = cv.height / (cv._dpr || 1) || 140;
  cv._dpr = dpr; cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext("2d");
  g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  if (vals.length < 2) return;
  const lines = opt.lines || [];
  const all = vals.concat(lines.map((l) => l.v)).concat(opt.zero ? [0] : []);
  const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 || 1;
  const y = (v) => h - 6 - ((v - lo + pad) / (hi - lo + 2 * pad)) * (h - 12);
  const x = (k) => (k / (vals.length - 1)) * (w - 4) + 2;
  if (opt.zero) { g.strokeStyle = "#333"; g.beginPath(); g.moveTo(0, y(0)); g.lineTo(w, y(0)); g.stroke(); }
  lines.forEach((l) => {
    g.strokeStyle = l.c; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, y(l.v)); g.lineTo(w, y(l.v)); g.stroke();
    g.setLineDash([]); g.fillStyle = l.c; g.font = "10px JetBrains Mono, monospace"; g.fillText(l.label, 4, y(l.v) - 3);
  });
  const last = vals[vals.length - 1];
  g.strokeStyle = opt.color || (last >= vals[0] ? "#22c55e" : "#f0524f"); g.lineWidth = 1.5; g.beginPath();
  vals.forEach((v, k) => (k ? g.lineTo(x(k), y(v)) : g.moveTo(x(k), y(v)))); g.stroke();
}

function renderRadar() {
  const rows = filtered(D.radar || []);
  if (!rows.length) { $("t-radar").innerHTML = `<tr><td class="empty">–</td></tr>`; return; }
  $("t-radar").innerHTML = `<tr><th>${t("asset")}</th><th>${t("tf")}</th><th>${t("kind")}</th><th class="num">${t("rvol")}</th><th>${t("note")}</th></tr>` +
    rows.map((r) => `<tr><td><b>${esc(r.symbol)}</b> <span class="dim">${t(r.cls)}</span></td><td>${r.tf}</td><td>${t(r.kind)}</td>
      <td class="num amber">${r.rvol}</td>
      <td>${r.kind === "quiet_volume" ? t(r.hint) : `<span class="${cl(r.move_pct)}">${pct(r.move_pct)}</span> ${new Date(r.t * 1000).toISOString().slice(11, 16)}Z`}</td></tr>`).join("");
}

function renderCrowd() {
  const rows = D.crowding || [];
  if (!rows.length) { $("t-crowd").innerHTML = `<tr><td class="empty">–</td></tr>`; return; }
  $("t-crowd").innerHTML = `<tr><th>${t("asset")}</th><th class="num">${t("funding")}</th><th class="num">${t("oi")}</th><th class="num">Vol 24h</th></tr>` +
    rows.map((r) => `<tr><td><b>${esc(r.symbol)}</b></td><td class="num ${cl(r.funding_apr)}">${sgn(r.funding_apr, 1)}</td>
      <td class="num">${big(r.open_interest_usd)}</td><td class="num">${big(r.volume_24h_usd)}</td></tr>`).join("");
}

function renderCot() {
  const rows = filtered(D.market || []).filter((m) => m.cot).sort((a, b) => Math.abs(b.cot.pct - 50) - Math.abs(a.cot.pct - 50));
  if (!rows.length) { $("t-cot").innerHTML = `<tr><td class="empty">–</td></tr>`; return; }
  $("t-cot").innerHTML = `<tr><th>${t("asset")}</th><th class="num">${t("netPct")}</th><th class="num">${t("chgW")}</th><th>${t("date")}</th></tr>` +
    rows.map((m) => `<tr><td><b>${esc(m.symbol)}</b></td>
      <td class="num ${m.cot.pct >= 90 ? "up" : m.cot.pct <= 10 ? "down" : ""}"><b>${m.cot.pct}</b></td>
      <td class="num ${cl(m.cot.change)}">${sgn(m.cot.change, 0)}</td><td class="dim">${esc(m.cot.date)}</td></tr>`).join("");
}

function renderJournal() {
  const rows = filtered(LOG).slice().reverse().slice(0, 200);
  if (!rows.length) { $("t-journal").innerHTML = `<tr><td class="empty">${t("noJournal")}</td></tr>`; return; }
  $("t-journal").innerHTML = `<tr><th>${t("date")}</th><th>${t("grade")}</th><th>${t("asset")}</th><th>${t("setup")}</th><th>${t("dir")}</th>
    <th class="num">${t("entry")}</th><th class="num">${t("stop")}</th><th class="num">${t("target")}</th><th>${t("status")}</th><th class="num">${t("result")}</th></tr>` +
    rows.map((e) => `<tr><td class="dim">${dateStr(e.bar_t)}</td><td><span class="grade ${e.grade}">${e.grade}</span></td>
      <td><b>${esc(e.symbol)}</b></td><td>${esc(t(e.setup))}</td><td>${dirTag(e.dir)}</td>
      <td class="num">${px(e.fill || e.entry)}</td><td class="num">${px(e.stop)}</td><td class="num">${px(e.target)}</td>
      <td>${t(e.status === "win" ? "win_" : e.status)}</td><td class="num ${cl(e.r)}">${e.r != null ? sgn(e.r) : "–"}</td></tr>`).join("");
}

function renderBacktest() {
  if (!S) return;
  const cols = ["trades", "win", "exp", "total", "pf", "dd", "streak"];
  const rows = Object.entries(S.backtest).filter(([k]) => clsFilter === "all" || k.startsWith(clsFilter + "|"));
  $("t-backtest").innerHTML = `<tr><th>${t("cls")}</th><th>${t("setup")}</th>${cols.map((c) => `<th class="num">${t(c)}</th>`).join("")}<th></th></tr>` +
    rows.map(([k, v]) => {
      const [c, s] = k.split("|");
      const ok = v.n >= 30 ? (v.exp_r > 0 ? `<span class="up">✓</span>` : `<span class="down">✕</span>`) : `<span class="dim">…</span>`;
      return `<tr><td>${t(c)}</td><td>${esc(t(s))}</td><td class="num">${v.n}</td><td class="num">${v.win_rate ?? "–"}</td>
        <td class="num ${cl(v.exp_r)}"><b>${v.exp_r != null ? sgn(v.exp_r, 3) : "–"}</b></td><td class="num ${cl(v.total_r)}">${sgn(v.total_r, 1)}</td>
        <td class="num">${v.pf ?? "–"}</td><td class="num down">${v.max_dd_r}</td><td class="num">${v.max_loss_streak}</td><td>${ok}</td></tr>`;
    }).join("") +
    `<tr><td colspan="10" class="dim">${t("cost")}: crypto ${S.costs_roundtrip_pct.crypto}% · forex ${S.costs_roundtrip_pct.forex}% · ${t("commodity")} ${S.costs_roundtrip_pct.commodity}% · max ${S.rules.max_hold_bars} bars</td></tr>`;
}

function renderMarket() {
  const q = ($("q").value || "").trim().toUpperCase();
  const rows = filtered(D.market || []).filter((m) => !q || m.symbol.includes(q));
  const { key, dir } = marketSort;
  rows.sort((a, b) => ((a[key] ?? -1e18) > (b[key] ?? -1e18) ? 1 : -1) * dir);
  const cols = [["symbol", "asset"], ["price", "price"], ["chg_pct", "chg"], ["trend", "trend"], ["rvol", "rvol"], ["atr_pct", "atr"], ["funding_apr", "funding"]];
  $("t-market").innerHTML = `<tr>${cols.map(([k, l], n) => `<th class="sort ${n ? "num" : ""}" data-sort="${k}">${t(l)}${key === k ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}<th></th></tr>` +
    rows.map((m) => `<tr><td><b>${esc(m.symbol)}</b> <span class="dim">${t(m.cls)}</span></td><td class="num">${px(m.price)}</td>
      <td class="num ${cl(m.chg_pct)}">${pct(m.chg_pct)}</td><td class="num ${m.trend === "up" ? "up" : m.trend === "down" ? "down" : "dim"}">${t(m.trend)}</td>
      <td class="num ${m.rvol >= 2 ? "amber" : ""}">${m.rvol != null ? m.rvol.toFixed(2) : "–"}</td><td class="num">${m.atr_pct}</td>
      <td class="num ${cl(m.funding_apr)}">${m.funding_apr != null ? sgn(m.funding_apr, 1) : ""}</td>
      <td><canvas class="spark" data-sym="${esc(m.symbol)}" width="90" height="22" style="width:90px;height:22px;margin:0"></canvas></td></tr>`).join("");
  document.querySelectorAll("canvas.spark").forEach((cv) => {
    const m = D.market.find((x) => x.symbol === cv.dataset.sym);
    if (m) drawLine(cv, m.spark || []);
  });
}

function openSetup(s) {
  const m = (D.market || []).find((x) => x.symbol === s.symbol);
  const risk = Math.abs(s.entry - s.stop) / s.entry * 100;
  const h = s.hist || {};
  $("drawer-body").innerHTML = `
    <h3>${dirTag(s.dir)} ${esc(s.symbol)} <span class="grade ${s.grade}">${s.grade}</span> <span class="amber">${s.score}</span></h3>
    <div class="dim">${esc(t(s.setup))} · ${t(s.cls)} · ${dateStr(s.bar_t)}</div>
    <canvas id="dchart" height="200"></canvas>
    <h2 style="margin-top:12px">${t("plan")}</h2>
    <div class="kv">
      <div><span>${t("entry")}</span>${px(s.entry)}</div><div><span>${t("stop")}</span><b class="down">${px(s.stop)}</b></div>
      <div><span>${t("target")}</span><b class="up">${px(s.target)}</b></div><div><span>${t("rr")}</span>${s.rr.toFixed(2)}</div>
      <div><span>${t("risk")}</span>${risk.toFixed(2)}%</div><div><span>${t("cost")}</span>${s.cost_pct}%</div>
    </div>
    <h2>${t("why")}</h2><ul><li>${esc(tr(s.why))}</li><li>${t("trend")}: ${t(s.trend)} · ${t("rvol")} ${s.rvol}</li></ul>
    <h2>${t("scoreParts")}</h2><ul>${(s.notes || []).map((n) => `<li>${esc(tr(n))}</li>`).join("") || "<li>–</li>"}</ul>
    <h2>${t("histFor")} ${t(s.cls)}</h2>
    <div class="kv">
      <div><span>${t("trades")}</span>${h.n ?? "–"}</div><div><span>${t("win")}</span>${h.win_rate ?? "–"}</div>
      <div><span>${t("exp")}</span><b class="${cl(h.exp_r)}">${h.exp_r != null ? sgn(h.exp_r, 3) : "–"}</b></div><div><span>${t("pf")}</span>${h.pf ?? "–"}</div>
      <div><span>${t("dd")}</span>${h.max_dd_r ?? "–"}</div><div><span>${t("streak")}</span>${h.max_loss_streak ?? "–"}</div>
    </div>`;
  $("drawer").classList.remove("hidden");
  if (m) drawLine($("dchart"), m.spark, { color: "#d6dde6", lines: [
    { v: s.entry, c: "#ffb000", label: t("entry") }, { v: s.stop, c: "#f0524f", label: t("stop") }, { v: s.target, c: "#22c55e", label: t("target") }] });
}

document.addEventListener("click", (ev) => {
  const tab = ev.target.closest(".tab");
  if (tab) { clsFilter = tab.dataset.cls; safeSet("lld-cls", clsFilter); render(); return; }
  const row = ev.target.closest("tr[data-setup]");
  if (row) { openSetup(D.setups[+row.dataset.setup]); return; }
  const th = ev.target.closest("th[data-sort]");
  if (th) {
    const k = th.dataset.sort;
    marketSort = { key: k, dir: marketSort.key === k ? -marketSort.dir : -1 };
    renderMarket(); return;
  }
  if (ev.target.id === "drawer" || ev.target.id === "drawer-close") $("drawer").classList.add("hidden");
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") $("drawer").classList.add("hidden"); });
$("lang").addEventListener("click", () => { lang = lang === "vi" ? "en" : "vi"; safeSet("lld-lang", lang); render(); });
$("show-c").addEventListener("change", () => D && renderSetups());
$("q").addEventListener("input", () => D && renderMarket());
setInterval(() => { $("clock").textContent = new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC"; if (D) renderAge(); }, 1000);
setInterval(load, 10 * 60 * 1000);
load();
