/* Lai Long Desk Terminal: reads data/*.json written by the scan and renders the desk. */
"use strict";

const T = {
  vi: {
    setups: "CƠ HỘI GIAO DỊCH", macro: "VĨ MÔ · LÃI SUẤT · USD", survival: "SỐNG SÓT · HIỆU QUẢ SAU CHI PHÍ",
    radar: "RADAR KHỐI LƯỢNG BẤT THƯỜNG", crowd: "CRYPTO · ĐÁM ĐÔNG (FUNDING)", cot: "VỊ THẾ ĐẦU CƠ (CFTC COT)",
    journal: "NHẬT KÝ TÍN HIỆU (THEO DÕI THẬT)", backtest: "BACKTEST TỪNG LOẠI TÍN HIỆU", market: "BẢNG THỊ TRƯỜNG",
    showC: "hiện cả tín hiệu yếu (hạng C)",
    setupsHint: "Mỗi tín hiệu được chấm điểm 0–100 rồi xếp hạng. Hạng A (từ 70 điểm): mạnh, đủ chuẩn để cân nhắc vào lệnh. Hạng B (55–69): khá, nên chờ thêm xác nhận. Hạng C (dưới 55, hoặc loại tín hiệu đã lỗ sau chi phí trong backtest): yếu, mặc định được ẩn cho đỡ nhiễu. Tick ô \"hiện cả tín hiệu yếu\" nếu muốn xem để tham khảo. Chỉ dùng nến ngày đã đóng. Bấm vào dòng để xem chi tiết. Bạn luôn là người quyết định.",
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
    index: "CHỈ SỐ MỸ", stock: "CỔ PHIẾU MỸ TOP 7", catalog: "DANH MỤC SẢN PHẨM ĐANG THEO DÕI", hiddenC: (n) => `Đang ẩn ${n} tín hiệu yếu (hạng C).`,
    catalogHint: "Bấm vào một sản phẩm để mở quy trình xử lý của nó trong trang Nhà máy.",
    bonds: "TRÁI PHIẾU TOÀN CẦU · DÂN TRÁI PHIẾU ĐANG LÀM GÌ", cbanks: "10 NGÂN HÀNG TRUNG ƯƠNG · LÃI SUẤT ĐIỀU HÀNH",
    usfut: "CHỈ SỐ MỸ · HỢP ĐỒNG TƯƠNG LAI (CME)", liq: "THANH KHOẢN · LẠM PHÁT KỲ VỌNG · RỦI RO TÍN DỤNG", cderiv: "CRYPTO TOÀN THỊ TRƯỜNG · PHÁI SINH · THANH LÝ",
    bondsHint: "Lợi suất tăng = giá trái phiếu giảm = có người đang bán trái phiếu. Cột \"1 tháng\" so với cùng kỳ tháng trước, đơn vị bp (0,01%). Trạng thái đường cong được đọc từ thay đổi 1 tháng của kỳ hạn ngắn (2 năm, Anh dùng 5 năm) và 10 năm. Số liệu chính thức cuối ngày của Bộ Tài chính / ngân hàng trung ương nên trễ 1 ngày làm việc.",
    tffHint: "CFTC Traders in Financial Futures: \"Quỹ dài hạn\" = quỹ hưu trí, bảo hiểm, quỹ đầu tư (tiền thật, nắm giữ lâu). \"Quỹ đòn bẩy\" = quỹ phòng hộ, thường bán khống hợp đồng tương lai để ăn chênh lệch với trái phiếu thật (basis trade). Phân vị 3 năm: ≥ 90 hoặc ≤ 10 là cực đoan. Số liệu chốt thứ Ba, công bố thứ Sáu.",
    cbHint: "Ngân hàng trung ương tăng lãi suất thì đồng tiền đó thường mạnh lên (gửi tiền lãi cao hơn), giảm lãi suất thì thường yếu đi. \"Chênh lệch với USD\" = lãi suất nước đó trừ lãi suất Fed: dương thì giữ đồng tiền đó được lãi hơn giữ USD (carry). Đồng lãi thấp (JPY, CHF) hay được vay để mua tài sản khác, nên khi thị trường hoảng loạn chúng thường tăng mạnh. Nguồn BIS, cập nhật hằng tuần.",
    usfutHint: "Hợp đồng tương lai chỉ số giao dịch gần 24/5, phản ánh tâm lý trước cả khi sàn chứng khoán mở cửa. \"KL / TB\" = khối lượng phiên này so với trung bình 20 phiên: trên 1,5 lần là bất thường. Giá CME miễn phí trễ ~10 phút; S&P 500 và Nasdaq 100 nhảy trực tiếp theo hợp đồng perp trên Hyperliquid.",
    liqHint: "Thanh khoản ròng = Tài sản Fed − Tài khoản Kho bạc (TGA) − Repo ngược (RRP): tăng thường đỡ cho cổ phiếu và crypto. Số liệu ngày hoặc tuần từ FRED (Fed St. Louis), có ghi ngày ở cột Cập nhật.",
    cderivHint: "Tỷ lệ Long/Short = số tài khoản đang mua chia số tài khoản đang bán trên OKX. Trên 2 = đám đông nghiêng hẳn về mua, dễ bị quét xuống. OI = tổng giá trị hợp đồng đang mở. Thanh lý = lệnh bị sàn đóng cưỡng bức. Binance trực tiếp đếm từ lúc bạn mở trang.",
    country: "Nước", tenor: "Kỳ hạn", m1: "1 tháng", state: "Trạng thái đường cong", contract: "Hợp đồng", am: "Quỹ dài hạn (ròng)", lev: "Quỹ đòn bẩy (ròng)", reading: "Đọc vị",
    bank: "Ngân hàng", rate: "Lãi suất", lastCh: "Lần đổi gần nhất", ch12: "12 tháng", stance: "Xu hướng", carry: "Chênh lệch với USD", fxMean: "Tác động lên đồng tiền",
    volx: "KL / TB", coin: "Coin", lsr: "Long/Short", oiCol: "OI (thay đổi 24h)", vol24: "KL 24h", liqL: "Thanh lý Long", liqS: "Thanh lý Short", window: "Khoảng tính",
    spreads: "Chênh lệch lợi suất 10 năm", verdict: "Kết luận",
  },
  en: {
    setups: "TRADE SETUPS", macro: "MACRO · RATES · USD", survival: "SURVIVAL · EDGE AFTER COSTS",
    radar: "ABNORMAL VOLUME RADAR", crowd: "CRYPTO · CROWDING (FUNDING)", cot: "SPECULATOR POSITIONING (CFTC COT)",
    journal: "SIGNAL JOURNAL (LIVE TRACKING)", backtest: "BACKTEST BY SIGNAL TYPE", market: "MARKET WATCH",
    showC: "also show weak signals (grade C)",
    setupsHint: "Every signal is scored 0–100 and graded. Grade A (70+): strong, good enough to consider. Grade B (55–69): decent, wait for more confirmation. Grade C (under 55, or a signal type that lost money after costs in the backtest): weak, hidden by default to cut noise. Tick \"also show weak signals\" to see them for reference. Closed daily bars only. Click a row for details. You always make the call.",
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
    index: "US INDICES", stock: "US TOP 7 STOCKS", catalog: "PRODUCTS WE FOLLOW", hiddenC: (n) => `${n} weak signal(s) (grade C) hidden.`,
    catalogHint: "Click a product to open its process on the Factory page.",
    bonds: "GLOBAL BONDS · WHAT BOND TRADERS ARE DOING", cbanks: "10 CENTRAL BANKS · POLICY RATES",
    usfut: "US INDICES · FUTURES (CME)", liq: "LIQUIDITY · INFLATION EXPECTATIONS · CREDIT RISK", cderiv: "CRYPTO MARKET-WIDE · DERIVATIVES · LIQUIDATIONS",
    bondsHint: "Rising yield = falling bond price = someone is selling bonds. \"1 month\" compares with a month ago, in bp (0.01%). The curve state reads the 1-month change of the short tenor (2Y; 5Y for the UK) against the 10Y. Official end-of-day data from treasuries and central banks, one business day behind.",
    tffHint: "CFTC Traders in Financial Futures: \"Asset managers\" = pensions, insurers, funds (real money, long holding). \"Leveraged funds\" = hedge funds, often short futures against cash bonds (basis trade). 3-year percentile: ≥ 90 or ≤ 10 is extreme. As of Tuesday, published Friday.",
    cbHint: "A hike tends to strengthen the currency (higher yield on deposits), a cut tends to weaken it. \"Carry vs USD\" = that rate minus the Fed rate: positive means holding the currency earns more than USD. Low-rate currencies (JPY, CHF) are borrowed to fund other trades, so they often jump in a panic. Source BIS, updated weekly.",
    usfutHint: "Index futures trade almost 24/5 and show sentiment before the cash open. \"Vol / avg\" = this session's volume over the 20-session average: above 1.5x is unusual. Free CME prices are ~10 min delayed; S&P 500 and Nasdaq 100 move live with Hyperliquid perps.",
    liqHint: "Net liquidity = Fed assets − Treasury General Account − reverse repo: rising usually supports stocks and crypto. Daily or weekly data from FRED (St. Louis Fed), dated in the Updated column.",
    cderivHint: "Long/Short = accounts long divided by accounts short on OKX. Above 2 = the crowd leans long and is prone to a flush. OI = value of open contracts. Liquidations = positions the exchange closed by force. Binance live counts from when you opened the page.",
    country: "Country", tenor: "Tenor", m1: "1 month", state: "Curve state", contract: "Contract", am: "Asset managers (net)", lev: "Leveraged funds (net)", reading: "Reading",
    bank: "Bank", rate: "Rate", lastCh: "Last change", ch12: "12 months", stance: "Cycle", carry: "Carry vs USD", fxMean: "Effect on the currency",
    volx: "Vol / avg", coin: "Coin", lsr: "Long/Short", oiCol: "OI (24h change)", vol24: "24h volume", liqL: "Long liquidations", liqS: "Short liquidations", window: "Window",
    spreads: "10-year yield spreads", verdict: "Verdict",
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
let D = null, S = null, LOG = [], G = null, LJ = null;
const CLASSES = ["index", "stock", "crypto", "forex", "commodity"];
// full product names, so a symbol is never a riddle
const NAMES = {
  SP500: ["S&P 500 (HĐTL E-mini ES)", "S&P 500 (E-mini ES futures)"], NASDAQ100: ["Nasdaq 100 (HĐTL NQ)", "Nasdaq 100 (NQ futures)"],
  DOW: ["Dow Jones (HĐTL YM)", "Dow Jones (YM futures)"], RUSSELL2000: ["Russell 2000 (HĐTL RTY)", "Russell 2000 (RTY futures)"],
  AAPL: ["Apple"], MSFT: ["Microsoft"], NVDA: ["Nvidia"], GOOGL: ["Alphabet (Google)"], AMZN: ["Amazon"], META: ["Meta (Facebook)"], TSLA: ["Tesla"],
  EURUSD: ["Euro / Đô la Mỹ", "Euro / US dollar"], GBPUSD: ["Bảng Anh / Đô la Mỹ", "Pound / US dollar"], AUDUSD: ["Đô la Úc / Đô la Mỹ", "Aussie / US dollar"],
  NZDUSD: ["Đô la New Zealand / Đô la Mỹ", "Kiwi / US dollar"], USDJPY: ["Đô la Mỹ / Yên Nhật", "US dollar / Yen"], USDCAD: ["Đô la Mỹ / Đô la Canada", "US dollar / Canadian dollar"],
  USDCHF: ["Đô la Mỹ / Franc Thụy Sĩ", "US dollar / Swiss franc"], USDCNY: ["Đô la Mỹ / Nhân dân tệ", "US dollar / Yuan"], USDHKD: ["Đô la Mỹ / Đô la Hồng Kông", "US dollar / HK dollar"],
  USDSGD: ["Đô la Mỹ / Đô la Singapore", "US dollar / Singapore dollar"],
  GOLD: ["Vàng (COMEX GC)", "Gold (COMEX GC)"], SILVER: ["Bạc (COMEX SI)", "Silver (COMEX SI)"], PLATINUM: ["Bạch kim (NYMEX PL)", "Platinum (NYMEX PL)"],
  COPPER: ["Đồng (COMEX HG)", "Copper (COMEX HG)"], WTI: ["Dầu WTI (NYMEX CL)", "WTI crude (NYMEX CL)"], BRENT: ["Dầu Brent (ICE BZ)", "Brent crude (ICE BZ)"],
  NATGAS: ["Khí tự nhiên (NYMEX NG)", "Natural gas (NYMEX NG)"], CORN: ["Ngô (CBOT ZC)", "Corn (CBOT ZC)"], WHEAT: ["Lúa mì (CBOT ZW)", "Wheat (CBOT ZW)"],
  SOYBEAN: ["Đậu tương (CBOT ZS)", "Soybeans (CBOT ZS)"], COFFEE: ["Cà phê Arabica (ICE KC)", "Arabica coffee (ICE KC)"], SUGAR: ["Đường (ICE SB)", "Sugar (ICE SB)"],
  COCOA: ["Ca cao (ICE CC)", "Cocoa (ICE CC)"],
};
const nameOf = (sym, cls) => { const n = NAMES[sym]; return n ? (lang === "vi" ? n[0] : n[1] || n[0]) : cls === "crypto" ? `${sym} / USDT (Binance)` : sym; };
const clsRank = (c) => CLASSES.indexOf(c);
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
const big = (x) => (x == null ? "–" : x >= 1e9 ? (x / 1e9).toFixed(2) + "B" : x >= 1e6 ? (x / 1e6).toFixed(1) + "M" : x >= 1e4 ? (x / 1e3).toFixed(0) + "K" : x.toFixed(0));
const dirTag = (d) => `<span class="${d === "long" ? "up" : "down"}">${d === "long" ? "▲" : "▼"} ${t(d)}</span>`;
const dateStr = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);

async function load() {
  const bust = `?v=${Date.now()}`;
  const get = (f) => fetch(`data/${f}${bust}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  [D, S, LOG, G] = await Promise.all([get("latest.json"), get("scorecard.json"), get("signals_log.json"), get("global.json")]);
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
  renderAge(); renderDash(); renderGlobal(); renderCatalog(); renderSetups(); renderMacro(); renderSurvival(); renderRadar();
  renderCrowd(); renderCot(); renderJournal(); renderBacktest(); renderMarket();
  $("errors").textContent = D.errors && D.errors.length ? `${t("errors")}: ${D.errors.join(" · ")}` : "";
}

function renderTabs() {
  const cnt = (c) => (D ? (D.market || []).filter((m) => c === "all" || m.cls === c).length : 0);
  $("cls-tabs").innerHTML = ["all", ...CLASSES].map((c) =>
    `<button class="tab ${c === clsFilter ? "on" : ""}" data-cls="${c}">${t(c)}${D ? ` <span class="n">${cnt(c)}</span>` : ""}</button>`).join("");
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
const HL_COM = { SP500: "SP500", NASDAQ100: "XYZ100", AAPL: "AAPL", MSFT: "MSFT", NVDA: "NVDA", GOOGL: "GOOGL", AMZN: "AMZN", META: "META", TSLA: "TSLA", GOLD: "GOLD", SILVER: "SILVER", PLATINUM: "PLATINUM", COPPER: "COPPER", WTI: "CL", BRENT: "BRENTOIL", NATGAS: "NATGAS", CORN: "CORN" };
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
  tickUsFut();
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
    LJ = j;
    if (j.macro && Object.keys(j.macro).length) MAC = j.macro;
    if (D) { renderDash(); renderGlobal(); }
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

// ---------- global desk: bonds, central banks, US futures, liquidity, crypto derivatives ----------
// global.json comes from the hourly scan (official daily/weekly data); futuresBoard and
// crypto_derivs come from live.json (every 5 minutes). Every row says where it is from and how old.
const tt = (vi, en) => (lang === "vi" ? vi : en);
const bp = (x, d = 0) => (x == null ? "–" : `<span class="${cl(x)}">${sgn(x, d)}bp</span>`);
const day = (ms) => new Date(ms).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit" });
const usd = (x) => (x == null ? "–" : "$" + (x >= 1e12 ? (x / 1e12).toFixed(2) + "T" : big(x)));
const verdict = (html) => `<div class="verdict"><b>${t("verdict")}:</b> ${html}</div>`;

const CURVE_MEAN = {
  bear_steepener: ["Bán mạnh trái phiếu dài hạn: lợi suất dài tăng nhanh hơn ngắn. Nhà đầu tư đòi bù rủi ro lạm phát / nợ công. Bất lợi cho cổ phiếu định giá cao, vàng và crypto.",
    "Long bonds sold hard: long yields rise faster than short ones. Investors demand more for inflation / debt risk. Bad for richly valued stocks, gold and crypto."],
  bull_steepener: ["Lợi suất ngắn giảm nhanh hơn dài: thị trường chờ ngân hàng trung ương cắt lãi suất, thường khi kinh tế yếu đi.",
    "Short yields fall faster than long ones: the market expects rate cuts, usually as the economy weakens."],
  bear_flattener: ["Lợi suất ngắn tăng nhanh hơn dài: thị trường chờ tăng lãi suất hoặc giữ cao lâu. Đồng tiền nước đó thường mạnh lên.",
    "Short yields rise faster than long ones: the market expects hikes or higher for longer. The currency usually strengthens."],
  bull_flattener: ["Lợi suất dài giảm nhanh hơn ngắn: dòng tiền trú ẩn vào trái phiếu dài, lo tăng trưởng chậm lại.",
    "Long yields fall faster than short ones: money hides in long bonds, growth worries."],
  parallel_up: ["Cả đường cong cùng tăng: bán trái phiếu diện rộng, chi phí vốn tăng.", "The whole curve rises: broad bond selling, money gets dearer."],
  parallel_down: ["Cả đường cong cùng giảm: dòng tiền mua trái phiếu, chi phí vốn giảm.", "The whole curve falls: bonds bought across the board, money gets cheaper."],
  stable: ["Ít thay đổi trong tháng.", "Little change over the month."],
};
const CURVE_NAME = {
  bear_steepener: ["Dốc lên do bán (bear steepener)", "Bear steepener"], bull_steepener: ["Dốc lên do mua (bull steepener)", "Bull steepener"],
  bear_flattener: ["Phẳng đi do bán (bear flattener)", "Bear flattener"], bull_flattener: ["Phẳng đi do mua (bull flattener)", "Bull flattener"],
  parallel_up: ["Tăng song song", "Parallel up"], parallel_down: ["Giảm song song", "Parallel down"], stable: ["Ổn định", "Stable"],
};
const COUNTRY_EN = { US: "United States", DE: "Germany", EA: "Euro area (AAA)", UK: "United Kingdom", JP: "Japan" };
const L = (pair) => (lang === "vi" ? pair[0] : pair[1]);

function renderBonds() {
  const B = G && G.bonds;
  if (!B) { $("t-curves").innerHTML = `<tr><td class="empty">${t("noData")}</td></tr>`; return; }
  const tenors = ["3M", "2Y", "5Y", "10Y", "20Y", "30Y"].filter((k) => Object.values(B.curves).some((c) => c.curve[k]));
  const rows = Object.entries(B.curves).map(([code, c]) => {
    const st = c.state || {}, ten = c.curve["10Y"];
    const cells = tenors.map((k) => {
      const v = c.curve[k];
      return v ? `<td class="num">${v.value.toFixed(2)}%<br><small>${bp(v.prev != null ? (v.value - v.prev) * 100 : null, 1)}</small></td>` : `<td class="num dim">–</td>`;
    }).join("");
    const asOf = Math.max(...Object.values(c.curve).map((v) => v.asOf));
    return `<tr><td class="name"><b>${esc(lang === "vi" ? c.name : COUNTRY_EN[code] || c.name)}</b></td>${cells}
      <td class="num">${ten && ten.month != null ? bp((ten.value - ten.month) * 100) : "–"}</td>
      <td><b>${CURVE_NAME[st.kind] ? L(CURVE_NAME[st.kind]) : "–"}</b><div class="mean">${CURVE_MEAN[st.kind] ? L(CURVE_MEAN[st.kind]) : ""}</div></td>
      <td class="src">${t("daily")(day(asOf))} · ${esc(c.source)}</td></tr>`;
  });
  $("t-curves").innerHTML = `<tr><th>${t("country")}</th>${tenors.map((k) => `<th class="num">${k}</th>`).join("")}<th class="num">10Y ${t("m1")}</th><th>${t("state")}</th><th>${t("fresh")}</th></tr>` + rows.join("");

  const SP = { "US-DE": ["Mỹ – Đức", "US – Germany", "EURUSD"], "US-JP": ["Mỹ – Nhật", "US – Japan", "USDJPY"], "US-UK": ["Mỹ – Anh", "US – UK", "GBPUSD"] };
  $("t-spreads").innerHTML = `<tr><th>${t("spreads")}</th><th class="num">${t("value")}</th><th class="num">${t("m1")}</th><th>${t("meaning")}</th></tr>` +
    Object.entries(B.spreads10y || {}).map(([k, s]) => {
      const p = SP[k] || [k, k, ""], wide = s.month_bp > 0;
      const m = tt(`${wide ? "Nới rộng" : "Thu hẹp"}: lãi suất Mỹ ${wide ? "hấp dẫn hơn" : "kém hấp dẫn đi"}, ${wide ? "hỗ trợ USD" : "bất lợi cho USD"} so với ${p[0].split(" – ")[1]} (${p[2]}).`,
        `${wide ? "Widening" : "Narrowing"}: US yields ${wide ? "more" : "less"} attractive, ${wide ? "supports" : "weighs on"} USD vs ${p[1].split(" – ")[1]} (${p[2]}).`);
      return `<tr><td><b>${L(p)}</b></td><td class="num">${sgn(s.value_bp, 0)}bp</td><td class="num">${bp(s.month_bp)}</td><td class="mean">${m}</td></tr>`;
    }).join("");

  // Treasury futures and MOVE from live.json
  const fb = (LJ && LJ.futuresBoard || []).filter((f) => ["ZT", "ZF", "ZN", "ZB", "MOVE"].includes(f.key));
  $("t-tfut").innerHTML = fb.length ? `<tr><th>${t("contract")}</th><th class="num">${t("price")}</th><th class="num">${t("chg")}</th><th class="num">${t("volx")}</th><th>${t("fresh")}</th></tr>` +
    fb.map((f) => {
      const ch = f.prev ? (f.value / f.prev - 1) * 100 : null, vx = f.avgVolume ? f.volume / f.avgVolume : null;
      const nm = f.key === "MOVE" ? tt("MOVE (biến động trái phiếu)", "MOVE (bond volatility)") : tt(`HĐTL trái phiếu Mỹ ${f.name.replace("UST ", "")}`, f.name + " futures");
      return `<tr><td><b>${esc(nm)}</b></td><td class="num">${f.value.toFixed(f.key === "MOVE" ? 1 : 3)}</td><td class="num ${cl(ch)}">${pct(ch)}</td>
        <td class="num ${vx >= 1.5 ? "amber" : ""}">${vx ? vx.toFixed(2) + "x" : "–"}</td><td class="src">${macroFresh({ asOf: f.asOf, source: "Yahoo (CME/ICE)" })}</td></tr>`;
    }).join("") : "";

  const P = G.bond_positioning || [];
  const read = (r) => {
    const am = r.asset_mgr_chg > 0, lv = r.lev_chg < 0;
    const parts = [am ? tt("quỹ dài hạn mua thêm", "asset managers added") : tt("quỹ dài hạn giảm mua", "asset managers cut")];
    parts.push(lv ? tt("quỹ đòn bẩy bán khống thêm", "leveraged funds sold more") : tt("quỹ đòn bẩy mua lại / giảm bán", "leveraged funds covered"));
    if (r.asset_mgr_pct >= 90 || r.lev_pct <= 10) parts.push(tt("vị thế cực đoan", "extreme positioning"));
    return parts.join(", ");
  };
  $("t-tff").innerHTML = P.length ? `<tr><th>${t("contract")}</th><th class="num">${t("am")}</th><th class="num">${t("netPct")}</th><th class="num">${t("lev")}</th><th class="num">${t("netPct")}</th><th>${t("reading")}</th><th>${t("fresh")}</th></tr>` +
    P.map((r) => `<tr><td><b>${esc(r.contract)}</b></td><td class="num">${big(Math.abs(r.asset_mgr_net))}${r.asset_mgr_net < 0 ? " ▼" : ""} <small class="${cl(r.asset_mgr_chg)}">${sgn(r.asset_mgr_chg / 1000, 0)}k</small></td>
      <td class="num">${r.asset_mgr_pct}</td><td class="num">${r.lev_net < 0 ? "−" : ""}${big(Math.abs(r.lev_net))} <small class="${cl(r.lev_chg)}">${sgn(r.lev_chg / 1000, 0)}k</small></td>
      <td class="num">${r.lev_pct}</td><td class="mean">${read(r)}</td><td class="src">${tt("tuần", "week")} ${day(Date.parse(r.date))} · CFTC</td></tr>`).join("") : "";

  // verdict: how many of the 5 markets saw 10Y yields rise >10bp over the month
  const cs = Object.values(B.curves), up = cs.filter((c) => c.curve["10Y"] && (c.curve["10Y"].value - c.curve["10Y"].month) * 100 > 10).length,
    dn = cs.filter((c) => c.curve["10Y"] && (c.curve["10Y"].value - c.curve["10Y"].month) * 100 < -10).length;
  const amAdd = P.filter((r) => r.asset_mgr_chg > 0).length, mv = fb.find((f) => f.key === "MOVE");
  let v = up >= 3 ? tt(`Lợi suất 10 năm tăng ở ${up}/${cs.length} thị trường trong 1 tháng: dân trái phiếu toàn cầu đang <b class="down">bán</b>, chi phí vốn tăng. Thường gây áp lực lên cổ phiếu tăng trưởng, vàng và crypto.`,
      `10Y yields rose in ${up}/${cs.length} markets over the month: global bond traders are <b class="down">selling</b> and money is getting dearer. Usually a headwind for growth stocks, gold and crypto.`)
    : dn >= 3 ? tt(`Lợi suất 10 năm giảm ở ${dn}/${cs.length} thị trường: dòng tiền đang <b class="up">mua</b> trái phiếu, chi phí vốn giảm, thường có lợi cho tài sản rủi ro (trừ khi do lo suy thoái).`,
      `10Y yields fell in ${dn}/${cs.length} markets: money is <b class="up">buying</b> bonds and getting cheaper, usually good for risk assets (unless driven by recession fears).`)
    : tt("Lợi suất các nước đi lệch nhau, chưa có xu hướng toàn cầu rõ ràng.", "Yields are mixed across countries, no clear global trend.");
  if (P.length) v += " " + tt(`Quỹ dài hạn mua thêm ở ${amAdd}/${P.length} hợp đồng trái phiếu Mỹ tuần qua${amAdd >= 4 ? " (đang tranh thủ gom khi lợi suất cao)" : amAdd <= 2 ? " (đang rút)" : ""}.`,
    `Asset managers added in ${amAdd}/${P.length} US Treasury contracts last week${amAdd >= 4 ? " (buying the high yields)" : amAdd <= 2 ? " (pulling back)" : ""}.`);
  if (mv) v += " " + tt(`MOVE ${mv.value.toFixed(0)}${mv.value >= 120 ? ": trái phiếu đang biến động mạnh, giảm khối lượng giao dịch." : mv.value <= 80 ? ": trái phiếu yên ả." : ": biến động bình thường."}`,
    `MOVE ${mv.value.toFixed(0)}${mv.value >= 120 ? ": bonds are volatile, cut size." : mv.value <= 80 ? ": bonds are calm." : ": normal volatility."}`);
  $("bonds-verdict").innerHTML = verdict(v);
}

const FX_OF = { USD: "DXY", EUR: "EURUSD", JPY: "USDJPY", GBP: "GBPUSD", CNY: "USDCNY", AUD: "AUDUSD", CAD: "USDCAD", CHF: "USDCHF", HKD: "USDHKD", SGD: "USDSGD" };
function renderBanks() {
  const R = (G && G.policy_rates) || [];
  if (!R.length) { $("t-cb").innerHTML = `<tr><td class="empty">${t("noData")}</td></tr>`; return; }
  const fed = R.find((r) => r.area === "US"), now = Date.now();
  const rows = R.map((r) => {
    if (r.rate == null) {
      const why = r.currency === "SGD" ? tt("MAS điều hành bằng tỷ giá (dải SGD NEER), không dùng lãi suất.", "MAS steers the exchange rate (SGD NEER band), not a rate.") : "–";
      return `<tr><td><b>${esc(r.bank)}</b> <span class="dim">${esc(r.currency)}</span></td><td class="num">–</td><td>–</td><td class="num">–</td><td>–</td><td class="num">–</td><td class="mean">${why}</td><td class="src">BIS</td></tr>`;
    }
    const lc = r.lastChange, recent = lc && now - Date.parse(lc.date) < 120 * 864e5;
    const cyc = r.change12m_bp > 0 ? ["thắt chặt", "tightening", "down"] : r.change12m_bp < 0 ? ["nới lỏng", "easing", "up"] : ["đứng yên", "on hold", ""];
    const stance = recent ? (lc.bp > 0 ? tt("vừa tăng", "just hiked") : tt("vừa cắt", "just cut")) : tt("đang giữ", "holding");
    const carry = fed && r.area !== "US" ? (r.rate - fed.rate) * 100 : null;
    const pair = FX_OF[r.currency] || "";
    let mean;
    if (r.area === "US") mean = tt(`Fed ${r.change12m_bp > 0 ? "thắt chặt" : r.change12m_bp < 0 ? "nới lỏng" : "giữ"} trong 12 tháng. Lãi suất Fed cao giữ USD mạnh; mỗi lần Fed cắt thường làm USD yếu, vàng và crypto được hỗ trợ.`,
      `Fed ${r.change12m_bp > 0 ? "tightened" : r.change12m_bp < 0 ? "eased" : "held"} over 12 months. High Fed rates keep USD firm; each cut tends to weaken USD and help gold and crypto.`);
    else if (r.currency === "HKD") mean = tt("HKD neo vào USD, HKMA đi theo Fed. Quan trọng với dòng tiền vào chứng khoán Hồng Kông / Trung Quốc.", "HKD is pegged to USD and HKMA follows the Fed. Matters for flows into Hong Kong / China stocks.");
    else {
      const dirWord = r.change12m_bp > (fed ? fed.change12m_bp : 0) ? tt("12 tháng qua chặt tay hơn Fed → có lợi cho", "tighter than the Fed over 12 months → supports") : r.change12m_bp < (fed ? fed.change12m_bp : 0) ? tt("12 tháng qua nới tay hơn Fed → bất lợi cho", "looser than the Fed over 12 months → weighs on") : tt("đi cùng nhịp Fed → trung tính cho", "moving with the Fed → neutral for");
      mean = `${dirWord} ${esc(r.currency)} (${pair}).` + (carry != null && carry < -150 ? " " + tt("Lãi thấp hơn USD nhiều: hay được vay để đầu tư nơi khác, dễ tăng vọt khi thị trường hoảng loạn.", "Far below USD: a funding currency, prone to jump in a panic.") : "");
    }
    return `<tr><td><b>${esc(r.bank)}</b> <span class="dim">${esc(r.currency)}</span></td><td class="num"><b>${r.rate.toFixed(2)}%</b></td>
      <td>${lc ? `${bp(lc.bp)} <span class="dim">${day(Date.parse(lc.date))}/${lc.date.slice(2, 4)}</span>` : "–"}</td><td class="num">${bp(r.change12m_bp)}</td>
      <td><span class="${cyc[2]}">${tt(cyc[0], cyc[1])}</span> · ${stance}</td><td class="num">${carry != null ? bp(carry) : "–"}</td>
      <td class="mean">${mean}</td><td class="src">${t("daily")(day(r.asOf))} · BIS</td></tr>`;
  });
  $("t-cb").innerHTML = `<tr><th>${t("bank")}</th><th class="num">${t("rate")}</th><th>${t("lastCh")}</th><th class="num">${t("ch12")}</th><th>${t("stance")}</th><th class="num">${t("carry")}</th><th>${t("fxMean")}</th><th>${t("fresh")}</th></tr>` + rows.join("");
  const rest = R.filter((r) => r.area !== "US" && r.area !== "HK" && r.rate != null);
  const hikes = rest.filter((r) => r.change12m_bp > (fed ? fed.change12m_bp : 0)).length, cuts = rest.filter((r) => r.change12m_bp < (fed ? fed.change12m_bp : 0)).length;
  $("cb-verdict").innerHTML = verdict(tt(`So với Fed trong 12 tháng: ${hikes}/${rest.length} ngân hàng chặt tay hơn, ${cuts}/${rest.length} nới tay hơn. ${fed ? `Fed ${fed.rate.toFixed(2)}%${fed.change12m_bp < 0 ? " đang nới lỏng" : fed.change12m_bp > 0 ? " đang thắt chặt" : ""}` : ""}${hikes > cuts ? ": các nước khác thắt chặt nhiều hơn Mỹ, chênh lệch lãi suất thu hẹp, nghiêng về USD yếu dần trung hạn." : cuts > hikes ? ": thế giới nới lỏng nhiều hơn, USD có lợi thế lãi suất." : "."}`,
    `Against the Fed over 12 months: ${hikes}/${rest.length} banks were tighter, ${cuts}/${rest.length} looser. ${fed ? `Fed ${fed.rate.toFixed(2)}%${fed.change12m_bp < 0 ? " easing" : fed.change12m_bp > 0 ? " tightening" : ""}` : ""}${hikes > cuts ? ": the rest of the world is tighter than the US, rate gaps narrow, leaning USD weaker medium term." : cuts > hikes ? ": the world is easing more, USD keeps the rate edge." : "."}`));
}

// US index futures move live with Hyperliquid's index perps, anchored on the delayed CME quote
const HL_IDX = { ES: "SP500", NQ: "XYZ100" };
const futLive = {};
function futQuote(f) {
  const h = HLX[HL_IDX[f.key]];
  if (!h || !h.px) return null;
  const a = futLive[f.key];
  if (!a || a.base !== f) futLive[f.key] = { base: f, anchor: h.px };
  return f.value * h.px / futLive[f.key].anchor;
}
function renderUsFut() {
  const fb = (LJ && LJ.futuresBoard || []).filter((f) => ["ES", "NQ", "YM", "RTY"].includes(f.key));
  if (!fb.length) { $("t-usfut").innerHTML = `<tr><td class="empty">${t("loading")}</td></tr>`; return; }
  const NM = { ES: "S&P 500", NQ: "Nasdaq 100", YM: "Dow Jones", RTY: "Russell 2000" };
  $("t-usfut").innerHTML = `<tr><th>${t("asset")}</th><th class="num">${t("price")}</th><th class="num">${t("chg")}</th><th class="num">${t("volx")}</th><th>${t("fresh")}</th></tr>` +
    fb.map((f) => {
      const lv = futQuote(f), v = lv || f.value, ch = f.prev ? (v / f.prev - 1) * 100 : null, vx = f.avgVolume ? f.volume / f.avgVolume : null;
      const fr = lv ? `<span class="live">${t("liveNow")} · Hyperliquid</span>` : macroFresh({ asOf: f.asOf, source: "Yahoo (CME)" });
      return `<tr><td><b>${NM[f.key]}</b> <span class="dim">${f.key}</span></td><td class="num" data-k="f:${f.key}">${px(v)}</td>
        <td class="num ${cl(ch)}" data-c="f:${f.key}">${pct(ch)}</td><td class="num ${vx >= 1.5 ? "amber" : ""}">${vx ? vx.toFixed(2) + "x" : "–"}</td><td class="src" data-s="f:${f.key}">${fr}</td></tr>`;
    }).join("");
  const es = fb.find((f) => f.key === "ES"), rty = fb.find((f) => f.key === "RTY");
  if (es && rty && es.prev && rty.prev) {
    const a = (es.value / es.prev - 1) * 100, b = (rty.value / rty.prev - 1) * 100;
    $("usfut-verdict").innerHTML = verdict(b - a > 0.5 ? tt("Russell 2000 (cổ phiếu nhỏ) mạnh hơn S&P 500: dòng tiền chấp nhận rủi ro, thường đi cùng kỳ vọng hạ lãi suất.", "Small caps beat the S&P 500: risk-on, often with rate-cut hopes.")
      : a - b > 0.5 ? tt("Russell 2000 yếu hơn S&P 500: dòng tiền rút khỏi cổ phiếu nhỏ, nhạy với lãi suất cao. Thận trọng với tài sản rủi ro.", "Small caps lag the S&P 500: money leaves rate-sensitive names. Be careful with risk assets.")
      : tt("Các chỉ số đi cùng nhịp.", "Indices move together."));
  }
}
function tickUsFut() {
  (LJ && LJ.futuresBoard || []).forEach((f) => {
    if (!HL_IDX[f.key]) return;
    const v = futQuote(f);
    if (v) paintCell(`f:${f.key}`, px(v), f.prev ? (v / f.prev - 1) * 100 : null, `<span class="live">${t("liveNow")} · Hyperliquid</span>`);
  });
}

const LIQ_ROWS = [
  ["real10y", "Lợi suất thực 10 năm (TIPS)", "10Y real yield (TIPS)", "%", "Lợi suất sau lạm phát. Cao và tăng = bất lợi nhất cho vàng và cổ phiếu tăng trưởng.", "Yield after inflation. High and rising is the worst for gold and growth stocks."],
  ["breakeven10y", "Lạm phát kỳ vọng 10 năm", "10Y breakeven inflation", "%", "Thị trường trái phiếu dự đoán lạm phát. Trên 2,5% = Fed khó hạ lãi suất.", "Inflation priced by bonds. Above 2.5% the Fed struggles to cut."],
  ["breakeven5y", "Lạm phát kỳ vọng 5 năm", "5Y breakeven inflation", "%", "Lạm phát kỳ vọng ngắn hơn, nhạy với giá dầu.", "Shorter-run expectations, sensitive to oil."],
  ["termprem10y", "Phần bù kỳ hạn 10 năm", "10Y term premium", "%", "Phần lợi suất nhà đầu tư đòi thêm vì giữ trái phiếu dài. Tăng = lo nợ công / lạm phát, bán trái phiếu dài.", "Extra yield for holding long bonds. Rising = debt / inflation worries, long-end selling."],
  ["hy_oas", "Chênh lệch trái phiếu rác (HY)", "High-yield credit spread", "%", "Phần bù rủi ro vỡ nợ doanh nghiệp. Tăng nhanh = căng thẳng tín dụng, thường đi trước cổ phiếu giảm.", "Default risk premium. Rising fast = credit stress, often ahead of equity drops."],
  ["nfci", "Chỉ số điều kiện tài chính (NFCI)", "Financial conditions (NFCI)", "", "Âm = tiền dễ vay, thuận lợi cho tài sản rủi ro. Dương = thắt chặt.", "Negative = loose money, good for risk. Positive = tight."],
  ["net_liquidity", "Thanh khoản ròng của Fed", "Fed net liquidity", "B$", "Tài sản Fed − TGA − RRP. Tăng thường đỡ cho cổ phiếu và crypto.", "Fed assets − TGA − RRP. Rising usually supports stocks and crypto."],
  ["fed_assets", "Bảng cân đối Fed", "Fed balance sheet", "B$", "Fed đang thu hẹp (QT) hay bơm tiền (QE).", "Whether the Fed is shrinking (QT) or adding (QE)."],
  ["tga", "Tài khoản Kho bạc (TGA)", "Treasury account (TGA)", "B$", "Kho bạc rút tiền về TGA = hút thanh khoản khỏi thị trường.", "Treasury filling the TGA drains market liquidity."],
  ["rrp", "Repo ngược (RRP)", "Reverse repo (RRP)", "B$", "Tiền nhàn rỗi gửi Fed. Đã cạn gần hết, không còn là bộ đệm thanh khoản.", "Idle cash parked at the Fed. Nearly drained, no longer a liquidity buffer."],
  ["copper_gold", "Tỷ lệ Đồng / Vàng (×1000)", "Copper / gold ratio (×1000)", "", "Tăng = thị trường lạc quan về tăng trưởng, thường đi cùng lợi suất tăng.", "Rising = growth optimism, tends to track yields higher."],
];
function renderLiq() {
  const X = G && G.macro_extra;
  if (!X) { $("t-liq").innerHTML = `<tr><td class="empty">${t("noData")}</td></tr>`; return; }
  const fmt = (v, u) => (u === "%" ? v.toFixed(2) + "%" : u === "B$" ? "$" + (v / (v > 1e5 ? 1000 : 1)).toLocaleString("en-US", { maximumFractionDigits: 0 }) + "B" : v.toFixed(3));
  $("t-liq").innerHTML = `<tr><th>${t("ind")}</th><th class="num">${t("value")}</th><th class="num">${t("m1")}</th><th>${t("meaning")}</th><th>${t("fresh")}</th></tr>` +
    LIQ_ROWS.filter((r) => X[r[0]]).map(([k, vi, en, u, mvi, men]) => {
      const x = X[k], d = x.month != null ? x.value - x.month : null;
      const dtxt = d == null ? "–" : u === "%" ? bp(d * 100) : `<span class="${cl(d)}">${u === "B$" ? sgn(d / (Math.abs(x.value) > 1e5 ? 1000 : 1), 0) + "B" : sgn(d, 3)}</span>`;
      return `<tr><td class="name"><b>${tt(vi, en)}</b><small class="sm-only">${tt(mvi, men)}<br>${t("daily")(day(x.asOf))} · FRED</small></td><td class="num">${fmt(x.value, u)}</td><td class="num">${dtxt}</td>
        <td class="mean">${tt(mvi, men)}</td><td class="src">${t("daily")(day(x.asOf))} · FRED</td></tr>`;
    }).join("");
}

// Binance liquidations stream straight to the browser (the server is geo-blocked there)
const BLQ = { long: 0, short: 0, n: 0, since: Date.now(), big: [] };
let blqWs = null;
function binanceLiq() {
  try { blqWs = new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr"); } catch (e) { return; }
  blqWs.onmessage = (ev) => {
    let o;
    try { o = JSON.parse(ev.data).o; } catch (e) { return; }
    if (!o) return;
    const v = +o.q * +o.ap;
    if (o.S === "SELL") BLQ.long += v; else BLQ.short += v;  // a forced SELL closes a long
    BLQ.n += 1;
    if (v >= 100000) { BLQ.big.unshift({ s: o.s.replace(/USDT$/, ""), side: o.S === "SELL" ? "long" : "short", v, t: o.T }); BLQ.big.length = Math.min(BLQ.big.length, 6); }
    paintBlq();
  };
  blqWs.onclose = () => setTimeout(binanceLiq, 10000);
}
function paintBlq() {
  const el = $("blq");
  if (!el) return;
  const mins = Math.max(1, Math.round((Date.now() - BLQ.since) / 60000));
  el.innerHTML = BLQ.n ? `<span class="live">${tt("Binance trực tiếp", "Binance live")}</span> · ${tt(`${mins} phút qua`, `last ${mins} min`)}: ${t("liqL")} <b class="down">${usd(BLQ.long)}</b> · ${t("liqS")} <b class="up">${usd(BLQ.short)}</b> · ${BLQ.n} ${tt("lệnh", "orders")}` +
    (BLQ.big.length ? `<br><span class="dim">${tt("Lệnh lớn", "Large")}: ${BLQ.big.map((b) => `<span class="${b.side === "long" ? "down" : "up"}">${b.s} ${b.side.toUpperCase()} ${usd(b.v)}</span>`).join(" · ")}</span>` : "")
    : `<span class="ld off"></span>${tt("Đang chờ lệnh thanh lý từ Binance… (nếu mạng chặn Binance thì phần này để trống)", "Waiting for Binance liquidations… (blank if your network blocks Binance)")}`;
}

function renderCrypto() {
  const C = G && G.crypto_global, dv = (LJ && LJ.crypto_derivs) || [];
  if (C) {
    const sc = C.stablecoins, hr = C.hashrate_ehs;
    const box = (k, v, sub) => `<div class="kpi"><div class="dim">${k}</div><b>${v}</b><div>${sub}</div></div>`;
    $("cglobal").innerHTML = [
      box(tt("Tổng vốn hóa crypto", "Total crypto market cap"), usd(C.market_cap_usd), `<span class="${cl(C.market_cap_chg24h_pct)}">${pct(C.market_cap_chg24h_pct)} 24h</span> · <span class="src">${macroFresh({ asOf: C.asOf, source: "CoinGecko" })}</span>`),
      box(tt("Tỷ trọng BTC / ETH", "BTC / ETH dominance"), `${C.btc_dominance.toFixed(1)}% / ${C.eth_dominance.toFixed(1)}%`, `<span class="dim">${tt("BTC tăng tỷ trọng = tiền rút khỏi altcoin", "Rising BTC share = money leaving alts")}</span>`),
      sc ? box(tt("Stablecoin lưu hành", "Stablecoin supply"), usd(sc.value), `<span class="${cl(sc.value - sc.week)}">${sgn((sc.value / sc.week - 1) * 100)}% ${tt("tuần", "wk")}</span> · <span class="${cl(sc.value - sc.month)}">${sgn((sc.value / sc.month - 1) * 100)}% ${tt("tháng", "mo")}</span> · <span class="src">DefiLlama ${day(sc.asOf)}</span>`) : "",
      hr ? box(tt("Hashrate Bitcoin", "Bitcoin hashrate"), `${hr.value.toFixed(0)} EH/s`, `<span class="${cl(hr.value - hr.month)}">${sgn((hr.value / hr.month - 1) * 100)}% ${tt("tháng", "mo")}</span> · <span class="src">blockchain.info ${day(hr.asOf)}</span>`) : "",
    ].join("");
  }
  if (!dv.length) { $("t-cderiv").innerHTML = `<tr><td class="empty">${t("loading")}</td></tr>`; paintBlq(); return; }
  $("t-cderiv").innerHTML = `<tr><th>${t("coin")}</th><th class="num">${t("lsr")}</th><th class="num">${t("oiCol")}</th><th class="num">${t("vol24")}</th><th class="num">${t("liqL")}</th><th class="num">${t("liqS")}</th><th>${t("reading")}</th><th>${t("fresh")}</th></tr>` +
    dv.map((r) => {
      const oiCh = r.oi_usd && r.oi_24h_usd ? (r.oi_usd / r.oi_24h_usd - 1) * 100 : null, q = r.liq24h || {};
      const win = q.complete ? "24h" : q.from_ms ? tt(`từ ${when(q.from_ms)}`, `since ${when(q.from_ms)}`) : "";
      const notes = [];
      if (r.long_short >= 2) notes.push(tt("đám đông nghiêng mua, dễ bị quét xuống", "crowd long, flush risk"));
      else if (r.long_short <= 0.8) notes.push(tt("đám đông nghiêng bán, dễ bị ép tăng", "crowd short, squeeze risk"));
      if (q.long_usd > 3 * (q.short_usd || 1)) notes.push(tt("phe mua đang bị thanh lý", "longs being liquidated"));
      else if (q.short_usd > 3 * (q.long_usd || 1)) notes.push(tt("phe bán đang bị thanh lý", "shorts being liquidated"));
      if (oiCh != null && Math.abs(oiCh) >= 5) notes.push(oiCh > 0 ? tt("tiền mới vào hợp đồng", "new money entering") : tt("vị thế đang đóng bớt", "positions closing"));
      return `<tr><td><b>${esc(r.coin)}</b></td><td class="num ${r.long_short >= 2 ? "amber" : ""}">${r.long_short != null ? r.long_short.toFixed(2) : "–"} <small class="dim">${r.long_short_24h != null ? tt("24h trước", "24h ago") + " " + r.long_short_24h.toFixed(2) : ""}</small></td>
        <td class="num">${usd(r.oi_usd)} <small class="${cl(oiCh)}">${pct(oiCh, 1)}</small></td><td class="num">${usd(r.vol_24h_usd)}</td>
        <td class="num down">${usd(q.long_usd)}</td><td class="num up">${usd(q.short_usd)}</td><td class="mean">${notes.join("; ") || "–"}</td>
        <td class="src">${macroFresh({ asOf: r.asOf, source: "OKX" })}${win ? " · " + tt("thanh lý", "liq.") + " " + win : ""}</td></tr>`;
    }).join("");
  const L2 = dv.reduce((a, r) => a + ((r.liq24h || {}).long_usd || 0), 0), S2 = dv.reduce((a, r) => a + ((r.liq24h || {}).short_usd || 0), 0);
  const crowd = dv.filter((r) => r.long_short >= 2).length;
  $("cderiv-verdict").innerHTML = verdict(tt(`Trên OKX, phe ${L2 > S2 ? "mua" : "bán"} bị thanh lý nhiều hơn (${usd(L2)} so với ${usd(S2)}). ${crowd}/${dv.length} coin có đám đông nghiêng mua quá mức${crowd >= 3 ? ": rủi ro còn một nhịp quét xuống nữa, chưa nên bắt đáy vội." : "."}`,
    `On OKX, ${L2 > S2 ? "longs" : "shorts"} were liquidated more (${usd(L2)} vs ${usd(S2)}). ${crowd}/${dv.length} coins have a crowded long side${crowd >= 3 ? ": risk of another flush, no rush to catch the bottom." : "."}`));
  paintBlq();
}

function renderGlobal() {
  renderBonds(); renderBanks(); renderUsFut(); renderLiq(); renderCrypto();
}

function renderCatalog() {
  const groups = CLASSES.map((c) => [c, (D.market || []).filter((m) => m.cls === c)]).filter(([, l]) => l.length);
  $("catalog").innerHTML = groups.map(([c, l]) => `<div class="cat"><h3 class="sub">${t(c)} · ${l.length}</h3>` +
    l.map((m) => `<a href="factory/#${encodeURIComponent(m.symbol)}"><b>${esc(m.symbol)}</b> <span class="dim">${esc(nameOf(m.symbol, m.cls))}</span></a>`).join("") + `</div>`).join("");
}

function filtered(rows) { return clsFilter === "all" ? rows : rows.filter((r) => r.cls === clsFilter); }

function renderSetups() {
  const showC = $("show-c").checked;
  const all = filtered(D.setups || []), rows = all.filter((s) => showC || s.grade !== "C");
  const hid = showC ? 0 : all.length - rows.length, hidTxt = hid ? ` <span class="dim">${t("hiddenC")(hid)}</span>` : "";
  if (!rows.length) { $("t-setups").innerHTML = `<tr><td class="empty">${t("none")}${hidTxt}</td></tr>`; return; }
  const head = ["grade", "asset", "setup", "dir", "entry", "stop", "target", "rr", "rvol", "macroCol", "hist", "score"];
  $("t-setups").innerHTML = `<tr>${head.map((h, k) => `<th class="${k > 3 ? "num" : ""}">${t(h)}</th>`).join("")}</tr>` +
    rows.map((s, k) => `<tr class="click" data-setup="${D.setups.indexOf(s)}">
      <td><span class="grade ${s.grade}">${s.grade}</span></td>
      <td><b>${esc(s.symbol)}</b> <span class="dim">${esc(nameOf(s.symbol, s.cls))}</span></td>
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
  $("survival").innerHTML = CLASSES.filter((c) => S.backtest_class[c]).map((c) =>
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
    `<tr><td colspan="10" class="dim">${t("cost")}: ${CLASSES.filter((c) => S.costs_roundtrip_pct[c] != null).map((c) => `${t(c)} ${S.costs_roundtrip_pct[c]}%`).join(" · ")} · max ${S.rules.max_hold_bars} bars</td></tr>`;
}

function renderMarket() {
  const q = ($("q").value || "").trim().toUpperCase();
  const rows = filtered(D.market || []).filter((m) => !q || m.symbol.includes(q));
  const { key, dir } = marketSort;
  const val = (m, k) => (k === "price" || k === "chg_pct" ? quote(m)[k] : m[k]);
  rows.sort((a, b) => clsRank(a.cls) - clsRank(b.cls) || ((val(a, key) ?? -1e18) > (val(b, key) ?? -1e18) ? 1 : -1) * dir);
  const cols = [["symbol", "asset"], ["price", "price"], ["chg_pct", "chg"], ["trend", "trend"], ["rvol", "rvol"], ["atr_pct", "atr"], ["funding_apr", "funding"]];
  $("t-market").innerHTML = `<tr>${cols.map(([k, l], n) => `<th class="sort ${n ? "num" : ""}" data-sort="${k}">${t(l)}${key === k ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}<th></th><th>${t("srcCol")}</th></tr>` +
    rows.map((m, k) => { const q = quote(m); return (k === 0 || rows[k - 1].cls !== m.cls ? `<tr class="grp"><td colspan="9">${t(m.cls)} · ${rows.filter((x) => x.cls === m.cls).length}</td></tr>` : "") +
      `<tr><td><b>${esc(m.symbol)}</b> <span class="dim">${esc(nameOf(m.symbol, m.cls))}</span></td><td class="num" data-k="m:${esc(m.symbol)}">${px(q.price)}</td>
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
setInterval(() => { if (D) { renderDash(); renderGlobal(); } }, 30 * 1000);  // keeps the "N min delay" labels current
setInterval(load, 10 * 60 * 1000);
setInterval(pollLive, 60 * 1000);
setInterval(pollHL, 3000);
load();
pollLive();
pollHL();
kraken();
binanceLiq();
