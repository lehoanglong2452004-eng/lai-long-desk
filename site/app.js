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
    dash: "MACRO DASHBOARD · LÃI SUẤT, USD & GIÁ CHỦ CHỐT", dashRates: "Lãi suất & đồng USD", dashKeys: "Giá chủ chốt",
    dashHint: "Cột Cập nhật cho biết số liệu mới đến đâu: ● trực tiếp = nhảy theo từng giao dịch; \"trễ N phút\" = nguồn miễn phí bị trễ; \"số liệu ngày\" = nguồn chỉ công bố 1 lần mỗi ngày. bp = 0,01 điểm phần trăm. Hàng hóa trực tiếp lấy theo hợp đồng perp trên Hyperliquid và % thay đổi 24 giờ.",
    ind: "Chỉ báo", value: "Giá trị", change: "Thay đổi", meaning: "Ý nghĩa", fresh: "Cập nhật",
    liveNow: "trực tiếp", delayed: (m) => `trễ ~${m} phút`, closedAt: (s) => `đóng cửa ${s}`, daily: (s) => `số liệu ngày ${s}`, perScan: (s) => `theo lần quét ${s}`, lastClose: (s) => `giá đóng cửa ngày ${s}`,
    liveOn: "Giá trực tiếp đang chạy", liveOff: "Đang kết nối giá trực tiếp…", perp24: "Hyperliquid perp, % 24h",
    k_fed_funds: "Lãi suất Fed (thực tế)", k_us3m: "Lợi suất 3 tháng", k_us2y: "Lợi suất 2 năm", k_us5y: "Lợi suất 5 năm", k_us10y: "Lợi suất 10 năm", k_us30y: "Lợi suất 30 năm",
    k_s2s10: "Chênh lệch 10 năm – 2 năm", k_dxy: "DXY (chỉ số USD)", k_vix: "VIX (chỉ số sợ hãi)", k_biasM: "Kết luận USD trung hạn", k_biasI: "Kết luận USD trong ngày",
    m_fed_funds: "Lãi suất qua đêm thực tế của Fed. Tăng = USD đắt hơn, thường gây áp lực lên vàng và crypto.",
    m_us3m: "Bám sát kỳ vọng lãi suất Fed trong vài tháng tới.", m_us2y: "Nhạy nhất với kỳ vọng lãi suất Fed 1–2 năm tới. Cao hơn lãi suất Fed = thị trường chờ tăng lãi suất.",
    m_us5y: "Kỳ vọng lãi suất trung hạn.", m_us10y: "Chuẩn chi phí vốn toàn cầu. Tăng nhanh thường bất lợi cho cổ phiếu, vàng, crypto.",
    m_us30y: "Kỳ vọng lạm phát và rủi ro dài hạn.", m_s2s10: "Âm = đường cong đảo ngược: thị trường lo suy thoái. Chuyển từ âm sang dương thường đi kèm Fed cắt giảm.",
    m_dxy: "Sức mạnh USD so với 6 đồng tiền lớn. Tăng = áp lực lên EURUSD, GBPUSD, vàng, crypto.", m_vix: "Mức sợ hãi trên S&P 500. Trên 25 = thị trường căng thẳng, nên giảm khối lượng.",
    m_bias: "Kết luận của bộ phận Vĩ mô: thang -2 (USD yếu) đến +2 (USD mạnh). Dùng để cộng/trừ điểm tín hiệu.",
    srcCol: "Nguồn / độ trễ", synth: "ước tính từ Kraken",
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
    dash: "MACRO DASHBOARD · RATES, USD & KEY PRICES", dashRates: "Rates & the US dollar", dashKeys: "Key prices",
    dashHint: "The Updated column says how fresh each number is: ● live = moves with every trade; \"~N min delay\" = the free source is delayed; \"daily\" = the source publishes once a day. bp = 0.01 percentage point. Live commodities follow Hyperliquid perps with a 24-hour change.",
    ind: "Gauge", value: "Value", change: "Change", meaning: "What it means", fresh: "Updated",
    liveNow: "live", delayed: (m) => `~${m} min delay`, closedAt: (s) => `closed ${s}`, daily: (s) => `daily, ${s}`, perScan: (s) => `scan ${s}`, lastClose: (s) => `close of ${s}`,
    liveOn: "Live prices running", liveOff: "Connecting to live prices…", perp24: "Hyperliquid perp, 24h %",
    k_fed_funds: "Fed funds (effective)", k_us3m: "US 3M yield", k_us2y: "US 2Y yield", k_us5y: "US 5Y yield", k_us10y: "US 10Y yield", k_us30y: "US 30Y yield",
    k_s2s10: "10Y – 2Y spread", k_dxy: "DXY (US dollar index)", k_vix: "VIX (fear gauge)", k_biasM: "USD verdict, medium term", k_biasI: "USD verdict, intraday",
    m_fed_funds: "The Fed's effective overnight rate. Higher = dearer dollar, usually a headwind for gold and crypto.",
    m_us3m: "Tracks where the Fed is expected to be within months.", m_us2y: "Most sensitive to the Fed path over 1–2 years. Above Fed funds = market expects hikes.",
    m_us5y: "Medium-term rate expectations.", m_us10y: "The world's benchmark cost of money. Fast rises usually hurt stocks, gold and crypto.",
    m_us30y: "Long-run inflation and risk expectations.", m_s2s10: "Negative = inverted curve: recession worries. Turning positive often comes with Fed cuts.",
    m_dxy: "Dollar strength against 6 majors. Rising = pressure on EURUSD, GBPUSD, gold, crypto.", m_vix: "Fear priced into the S&P 500. Above 25 = stressed market; size down.",
    m_bias: "The Macro department's verdict: -2 (weak USD) to +2 (strong USD). It adds or removes signal points.",
    srcCol: "Source / delay", synth: "estimated from Kraken",
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
  binance();
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
  renderAge(); renderDash(); renderSetups(); renderMacro(); renderSurvival(); renderRadar();
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

// ---------- live prices and the macro dashboard ----------
// The scan (hourly) stores closed daily bars. Between scans the browser streams prices itself:
// crypto from Binance, FX from Kraken, commodities from Hyperliquid's perps. Rates come from
// live.json (refreshed every 5 minutes on the live-data branch) with the time of each quote.
const KR_PAIRS = { EURUSD: "EUR/USD", GBPUSD: "GBP/USD", AUDUSD: "AUD/USD", USDJPY: "USD/JPY", USDCAD: "USD/CAD", USDCHF: "USD/CHF" };
const HL_COM = { GOLD: "GOLD", SILVER: "SILVER", PLATINUM: "PLATINUM", COPPER: "COPPER", WTI: "CL", BRENT: "BRENTOIL", NATGAS: "NATGAS", CORN: "CORN" };
const DXY_W = { "EUR/USD": -0.576, "USD/JPY": 0.136, "GBP/USD": -0.119, "USD/CAD": 0.091, "USD/CHF": 0.036 };  // ICE weights without SEK
const KEYS = ["BTC", "ETH", "SOL", "GOLD", "SILVER", "WTI", "EURUSD", "GBPUSD", "USDJPY"];
const LV = {}, KRX = {}, BNX = {}, HLX = {};
let MAC = null, lastTick = 0, dxyLive = null;

function fxOpen() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const h = +p.hour;
  return !(p.weekday === "Sat" || (p.weekday === "Sun" && h < 17) || (p.weekday === "Fri" && h >= 17));
}

function quote(m) {
  const l = LV[m.symbol];
  return l ? { price: l.price, chg_pct: l.chg_pct, via: l.via } : { price: m.price, chg_pct: m.chg_pct, bar_t: m.bar_t };
}
function freshText(q) {
  return q.via ? `<span class="live">${t("liveNow")} · ${esc(q.via)}</span>` : t("lastClose")(dateStr(q.bar_t));
}

function liveFor(m) {
  if (m.cls === "crypto") {
    const b = BNX[`${m.symbol}USDT`];
    // the scan's price is the last closed daily close, so today's change is measured from it
    if (b && Math.abs(b / m.price - 1) < 0.5) return { price: b, chg_pct: (b / m.price - 1) * 100, via: "Binance" };
  } else if (m.cls === "forex") {
    const k = KRX[KR_PAIRS[m.symbol]];
    if (k && fxOpen()) return { price: k, chg_pct: (k / m.price - 1) * 100, via: "Kraken" };
  } else if (HL_COM[m.symbol]) {
    const h = HLX[HL_COM[m.symbol]];
    if (h && h.px) return { price: h.px, chg_pct: h.prev ? (h.px / h.prev - 1) * 100 : null, via: t("perp24") };
  }
  return null;
}

function tick() {
  const changed = [];
  for (const m of D.market || []) {
    const l = liveFor(m);
    if (!l || (LV[m.symbol] && LV[m.symbol].price === l.price)) continue;
    LV[m.symbol] = l;
    changed.push(m.symbol);
  }
  // synthetic DXY: Kraken's FX basket moves the last Yahoo DXY quote
  const d = MAC && MAC.dxy;
  if (d && fxOpen() && Object.keys(DXY_W).every((k) => KRX[k])) {
    const syn = Object.entries(DXY_W).reduce((v, [k, w]) => v * KRX[k] ** w, 1);
    if (!dxyLive || dxyLive.base !== d) dxyLive = { base: d, anchor: syn };
    const v = d.value * syn / dxyLive.anchor;
    if (v !== dxyLive.value) { dxyLive.value = v; paintCell("r:dxy", v.toFixed(3), d.prev ? (v / d.prev - 1) * 100 : null, `<span class="live">${t("liveNow")} · ${t("synth")}</span>`); }
  }
  changed.forEach((sym) => { const l = LV[sym]; paintCell(`m:${sym}`, px(l.price), l.chg_pct, freshText(l)); });
}

function flash(el, up) {
  el.classList.remove("fl-up", "fl-down");
  void el.offsetWidth;
  el.classList.add(up ? "fl-up" : "fl-down");
}
function paintCell(key, text, chg, fresh) {
  const q = CSS.escape(key);
  document.querySelectorAll(`[data-k="${q}"]`).forEach((el) => {
    if (el.textContent === text) return;
    const before = parseFloat(el.textContent.replace(/,/g, ""));
    el.textContent = text;
    if (isFinite(before)) flash(el, parseFloat(text.replace(/,/g, "")) > before);
  });
  document.querySelectorAll(`[data-c="${q}"]`).forEach((el) => { el.textContent = pct(chg); el.className = `num ${cl(chg)}`; });
  if (fresh) document.querySelectorAll(`[data-s="${q}"]`).forEach((el) => { if (el.innerHTML !== fresh) el.innerHTML = fresh; });
}

// ---------- feeds ----------
const REPO = (() => {
  const o = location.hostname.match(/^([^.]+)\.github\.io$/), r = location.pathname.split("/").filter(Boolean)[0];
  return o && r ? `${o[1]}/${r}` : "lehoanglong2452004-eng/lai-long-desk";
})();
async function pollLive() {
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${REPO}/live-data/live.json?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    if (j.macro && Object.keys(j.macro).length) { MAC = j.macro; if (D) renderDash(); }
  } catch (e) { /* keep the last values */ }
}
async function pollHL() {
  if (document.hidden) return;
  try {
    const r = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs", dex: "xyz" }) });
    if (!r.ok) return;
    const [meta, ctxs] = await r.json();
    meta.universe.forEach((a, k) => { const c = ctxs[k]; if (c) HLX[a.name.replace(/^xyz:/, "")] = { px: +(c.midPx || c.markPx), prev: +c.prevDayPx }; });
    lastTick = Date.now();
  } catch (e) { /* retry on the next poll */ }
}
function kraken() {
  let ws;
  try { ws = new WebSocket("wss://ws.kraken.com/v2"); } catch (e) { return; }
  ws.onopen = () => ws.send(JSON.stringify({ method: "subscribe", params: { channel: "ticker", symbol: Object.values(KR_PAIRS) } }));
  ws.onmessage = (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.channel !== "ticker" || !Array.isArray(m.data)) return;
    m.data.forEach((x) => { const mid = x.bid && x.ask ? (x.bid + x.ask) / 2 : x.last; if (mid) KRX[x.symbol] = mid; });
    lastTick = Date.now();
  };
  ws.onclose = () => setTimeout(kraken, 5000);
}
let bnWs = null, bnKey = "";
function binance() {
  const syms = (D && D.market || []).filter((m) => m.cls === "crypto").map((m) => `${m.symbol.toLowerCase()}usdt`).filter((s) => /^[a-z0-9]+$/.test(s));
  const key = syms.join("/");
  if (!syms.length || (key === bnKey && bnWs && bnWs.readyState <= 1)) return;
  bnKey = key;
  if (bnWs) { bnWs.onclose = null; bnWs.close(); }
  try { bnWs = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${syms.map((s) => `${s}@miniTicker`).join("/")}`); } catch (e) { return; }
  bnWs.onmessage = (ev) => {
    let m;
    try { m = JSON.parse(ev.data).data; } catch (e) { return; }
    if (m && m.s) { BNX[m.s] = +m.c; lastTick = Date.now(); }
  };
  bnWs.onclose = () => { bnKey = ""; setTimeout(binance, 5000); };
}

// ---------- dashboard ----------
const when = (ms) => new Date(ms).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
function macroFresh(r) {
  if (!r) return "–";
  if (r.source === "FRED") return `${t("daily")(dateStr(r.asOf / 1000))} · FRED`;
  const mins = Math.round((Date.now() - r.asOf) / 60000);
  return `${mins <= 60 ? t("delayed")(Math.max(1, mins)) : t("closedAt")(when(r.asOf))} · ${esc(r.source)}`;
}

function renderDash() {
  const M = MAC || {}, med = D.macro.medium, intr = D.macro.intraday;
  // before live.json arrives, fall back to the hourly scan's FRED values
  const pick = (k, fallback) => M[k] || (fallback != null ? { value: fallback, prev: null, scan: true } : null);
  const rate = (k, fb) => {
    const r = pick(k, fb);
    if (!r) return null;
    const ch = r.prev != null ? (r.value - r.prev) * 100 : null;
    return [k, `${r.value.toFixed(2)}%`, ch != null ? `<span class="${cl(ch)}">${sgn(ch, 1)}bp</span>` : "–", r.scan ? t("perScan")(when(D.generated * 1000)) : macroFresh(r)];
  };
  const rows = [rate("fed_funds", med.fed_funds), rate("us3m"), rate("us2y", med.us2y), rate("us5y"), rate("us10y", med.us10y), rate("us30y")];
  const y2 = pick("us2y", med.us2y), y10 = pick("us10y", med.us10y);
  if (y2 && y10) {
    const sp = (y10.value - y2.value) * 100, spPrev = y2.prev != null && y10.prev != null ? (y10.prev - y2.prev) * 100 : null;
    rows.push(["s2s10", `<span class="${cl(sp)}">${sgn(sp, 0)}bp</span>`, spPrev != null ? `<span class="${cl(sp - spPrev)}">${sgn(sp - spPrev, 1)}bp</span>` : "–", y2.source === "FRED" ? macroFresh(y2) : "–"]);
  }
  const dx = pick("dxy", med.dxy);
  if (dx) {
    const v = dxyLive && dxyLive.base === dx ? dxyLive.value : dx.value, ch = dx.prev ? (v / dx.prev - 1) * 100 : null;
    rows.push(["dxy", `<span data-k="r:dxy">${v.toFixed(3)}</span>`, `<span data-c="r:dxy" class="num ${cl(ch)}">${pct(ch)}</span>`,
      `<span data-s="r:dxy">${dxyLive && dxyLive.base === dx ? `<span class="live">${t("liveNow")} · ${t("synth")}</span>` : dx.scan ? t("perScan")(when(D.generated * 1000)) : macroFresh(dx)}</span>`]);
  }
  const vx = M.vix;
  if (vx) { const ch = vx.prev ? (vx.value / vx.prev - 1) * 100 : null; rows.push(["vix", `<span class="${vx.value >= 25 ? "down" : ""}">${vx.value.toFixed(2)}</span>`, `<span class="${cl(-ch)}">${pct(ch)}</span>`, macroFresh(vx)]); }
  const scanAt = t("perScan")(when(D.generated * 1000));
  rows.push(["biasM", `<b class="${cl(med.bias)}">${biasWord(med.bias)} (${sgn(med.bias, 0)})</b>`, "", scanAt]);
  rows.push(["biasI", `<b class="${cl(intr.bias)}">${biasWord(intr.bias)} (${sgn(intr.bias, 0)})</b>`, "", scanAt]);
  $("t-rates").innerHTML = `<tr><th>${t("ind")}</th><th class="num">${t("value")}</th><th class="num">${t("change")}</th><th>${t("meaning")}</th><th>${t("fresh")}</th></tr>` +
    rows.filter(Boolean).map(([k, v, c, f]) => `<tr><td class="name"><b>${t(`k_${k}`)}</b><small class="sm-only">${t(`m_${k.startsWith("bias") ? "bias" : k}`)}<br>${f}</small></td><td class="num">${v}</td><td class="num">${c}</td>
      <td class="mean">${t(`m_${k.startsWith("bias") ? "bias" : k}`)}</td><td class="src">${f}</td></tr>`).join("");

  const keys = KEYS.map((s) => (D.market || []).find((m) => m.symbol === s)).filter(Boolean);
  $("t-keys").innerHTML = `<tr><th>${t("asset")}</th><th class="num">${t("price")}</th><th class="num">${t("chg")}</th><th>${t("fresh")}</th></tr>` +
    keys.map((m) => { const q = quote(m); return `<tr><td><b>${esc(m.symbol)}</b> <span class="dim">${t(m.cls)}</span></td><td class="num" data-k="m:${esc(m.symbol)}">${px(q.price)}</td>
      <td class="num ${cl(q.chg_pct)}" data-c="m:${esc(m.symbol)}">${pct(q.chg_pct)}</td><td class="src" data-s="m:${esc(m.symbol)}">${freshText(q)}</td></tr>`; }).join("");
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
  const val = (m, k) => (k === "price" || k === "chg_pct" ? quote(m)[k] : m[k]);
  rows.sort((a, b) => ((val(a, key) ?? -1e18) > (val(b, key) ?? -1e18) ? 1 : -1) * dir);
  const cols = [["symbol", "asset"], ["price", "price"], ["chg_pct", "chg"], ["trend", "trend"], ["rvol", "rvol"], ["atr_pct", "atr"], ["funding_apr", "funding"]];
  $("t-market").innerHTML = `<tr>${cols.map(([k, l], n) => `<th class="sort ${n ? "num" : ""}" data-sort="${k}">${t(l)}${key === k ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}<th></th><th>${t("srcCol")}</th></tr>` +
    rows.map((m) => { const q = quote(m); return `<tr><td><b>${esc(m.symbol)}</b> <span class="dim">${t(m.cls)}</span></td><td class="num" data-k="m:${esc(m.symbol)}">${px(q.price)}</td>
      <td class="num ${cl(q.chg_pct)}" data-c="m:${esc(m.symbol)}">${pct(q.chg_pct)}</td><td class="num ${m.trend === "up" ? "up" : m.trend === "down" ? "down" : "dim"}">${t(m.trend)}</td>
      <td class="num ${m.rvol >= 2 ? "amber" : ""}">${m.rvol != null ? m.rvol.toFixed(2) : "–"}</td><td class="num">${m.atr_pct}</td>
      <td class="num ${cl(m.funding_apr)}">${m.funding_apr != null ? sgn(m.funding_apr, 1) : ""}</td>
      <td><canvas class="spark" data-sym="${esc(m.symbol)}" width="90" height="22" style="width:90px;height:22px;margin:0"></canvas></td>
      <td class="src" data-s="m:${esc(m.symbol)}">${freshText(q)}</td></tr>`; }).join("");
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
setInterval(() => {
  $("clock").textContent = new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";
  if (D) { renderAge(); tick(); }
  const on = Date.now() - lastTick < 30000;
  $("live-state").innerHTML = `<span class="ld${on ? "" : " off"}">${on ? t("liveOn") : t("liveOff")}</span>`;
}, 1000);
setInterval(() => D && renderDash(), 30 * 1000);  // keeps the "N min delay" labels current
setInterval(load, 10 * 60 * 1000);
setInterval(pollLive, 60 * 1000);
setInterval(pollHL, 3000);
load();
pollLive();
pollHL();
kraken();
