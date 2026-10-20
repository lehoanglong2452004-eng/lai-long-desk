# Lai Long Desk Terminal

## 👉 [MACRO TERMINAL](https://lehoanglong2452004-eng.github.io/lai-long-desk/) · [QUANT](https://lehoanglong2452004-eng.github.io/lai-long-desk/quant/) · [TIN TỨC](https://lehoanglong2452004-eng.github.io/lai-long-desk/news/) · [MIDOTI DEPTH](https://lehoanglong2452004-eng.github.io/lai-long-desk/depth/)

Hệ thống cá nhân quét **crypto, forex và hàng hóa phái sinh** để tìm cơ hội ít người chú ý, chấm điểm từng cơ hội và hiển thị trên một trang web dạng terminal. Hệ thống **không bao giờ tự đặt lệnh**: bạn luôn là người quyết định.

Phương châm: **sống sót trước, kiếm vàng sau.** Mọi tín hiệu đều được kiểm chứng sau khi trừ phí và trượt giá. Loại tín hiệu nào lỗ sau chi phí sẽ tự bị hạ xuống hạng C.

## Macro terminal (trang chủ)

Hệ sinh thái thống kê, tổng hợp dữ liệu kiểu Bloomberg để đánh giá cơ hội trung và dài hạn. Gõ mã vào ô lệnh hoặc bấm F1 đến F10:

| Mã | Màn hình | Dữ liệu |
|---|---|---|
| HOME | Tổng quan | Bản đồ cơ hội (chỉ báo ở cực trị 10 năm, đọc hai mặt), đồng hồ chu kỳ, chỉ báo chính |
| CURV | Đường cong lợi suất | Đường cong Mỹ hôm nay so với 1 tuần, 1 tháng, 6 tháng, 1 năm, 2 năm; 10Y-2Y, 10Y-3M; đường cong Đức, khu vực euro, Anh, Nhật |
| RATE | Lãi suất | Fed, 3M/2Y/10Y/30Y, lợi suất thực, phần bù kỳ hạn, lãi vay mua nhà, USD; lãi suất 10 ngân hàng trung ương |
| INFL | Lạm phát | CPI, CPI lõi, PCE lõi, PPI, lương, lạm phát kỳ vọng |
| GROW | Tăng trưởng | GDP, thất nghiệp, việc làm, trợ cấp thất nghiệp, sản xuất, bán lẻ, niềm tin, nhà ở, CFNAI, quy tắc Sahm |
| LIQ | Thanh khoản, tín dụng, định giá | Bảng cân đối Fed, M2, RRP, TGA, thanh khoản ròng, NFCI, chênh lệch tín dụng, chỉ báo Buffett, tiền mặt trong quỹ tiền tệ |
| ENGY | Năng lượng | Tồn kho EIA (dầu thô, xăng, dầu cất, Cushing, khí đốt) so với mùa vụ 5 năm, sản lượng, lọc dầu, SPR, giá dầu và khí |
| AGRI | Nông sản | Bảng cân đối WASDE (USDA PSD): tồn kho/sử dụng thế giới và Mỹ cho ngô, lúa mì, đậu tương, gạo, cà phê, đường, bông |
| ASST | Tài sản dài hạn | S&P 500 (cả sau lạm phát), Nasdaq, vàng, bạc, đồng, dầu, DXY, Bitcoin, EEM, Nikkei, TLT, các tỷ lệ |
| CYCL | Chu kỳ | Đồng hồ đầu tư (tăng trưởng × lạm phát), bảng kiểm tra suy thoái |

Mỗi chỉ báo có biểu đồ toàn bộ lịch sử (vùng xám là suy thoái Mỹ), phân vị so với 10 năm và toàn bộ lịch sử, và phần **hai mặt**: mặt rủi ro, mặt cơ hội, ai hưởng lợi. Giải thích nằm trong `site/kb.js`. Dữ liệu do `pipeline/macro_desk.py` dựng (chạy trong lịch quét mỗi giờ, nhóm nào chưa cũ thì bỏ qua), ghi vào `site/data/macro/`. Không cần API key. Sản lượng OPEC chưa có vì opec.org chặn tải tự động.

## Cách hệ thống chạy

```
GitHub Actions (mỗi giờ, miễn phí)
  1. Lấy dữ liệu miễn phí  ->  2. Tìm mẫu hình  ->  3. Lọc vĩ mô + đám đông  ->  4. Chấm điểm
  5. Backtest lại đúng quy tắc đó trên dữ liệu quá khứ (sau chi phí)
  6. Ghi nhật ký tín hiệu A/B và tự chấm kết quả thật
  7. Xuất bản trang web Lai Long Desk Terminal (GitHub Pages)  + (tùy chọn) gửi Telegram
```

Không có gì chạy trên laptop của bạn. Bạn chỉ cần mở trang web.

## Nguồn dữ liệu (miễn phí, công khai)

| Dữ liệu | Nguồn | Ghi chú |
|---|---|---|
| Giá và khối lượng crypto (top 40 theo thanh khoản) | Binance public market data (`data-api.binance.vision`) | API công khai chính thức, chỉ dữ liệu thị trường |
| Funding, open interest của mọi hợp đồng perp | Hyperliquid public API | Sàn phi tập trung, dữ liệu công khai |
| Giá forex, hàng hóa, DXY, lợi suất 10 năm theo giờ | Yahoo Finance (biểu đồ công khai) | Dùng cho mục đích cá nhân, không phân phối lại |
| Khối lượng forex | Hợp đồng tương lai tiền tệ CME (6E, 6B, 6J...) | Forex giao ngay không có khối lượng tập trung |
| Lãi suất Fed, lợi suất 2 năm, 10 năm | FRED (Cục Dự trữ Liên bang St. Louis) | Dữ liệu chính phủ Mỹ |
| Vị thế giới đầu cơ | CFTC Commitments of Traders | Dữ liệu chính phủ Mỹ, cập nhật hằng tuần |

## Các loại tín hiệu

| Mẫu hình | Điều kiện | Cắt lỗ / Chốt lời |
|---|---|---|
| **Hồi về hỗ trợ/kháng cự thuận xu hướng** | Xu hướng rõ (giá > EMA50 > EMA200 và EMA50 đang dốc lên, hoặc ngược lại), giá chạm vùng hỗ trợ đã được kiểm định ≥ 2 lần rồi bật lại | Dưới vùng hỗ trợ; chốt ở kháng cự kế tiếp |
| **Phá vỡ kèm khối lượng** | Đóng cửa vượt đỉnh/đáy 20 phiên với khối lượng ≥ 2 lần bình thường | 1,5 ATR; chốt ở kháng cự kế tiếp hoặc 3,5 ATR |
| **Bật lại ở biên vùng đi ngang** | Thị trường đi ngang, giá chạm đáy/đỉnh vùng 40 phiên rồi đảo chiều | Ngoài biên vùng; chốt ở biên đối diện |

Chỉ hiện tín hiệu có R:R ≥ 2. Chỉ dùng nến ngày **đã đóng cửa** để tránh tín hiệu giả.

**Radar khối lượng** (không phải lệnh, chỉ để chú ý): khối lượng lớn bất thường nhưng giá gần như đứng yên (có người đang gom/xả lặng lẽ), và đột biến khối lượng theo giờ.

### Điểm số (0–100)
- Điểm gốc theo mẫu hình, cộng điểm khi khối lượng xác nhận và R:R cao.
- **Vĩ mô ±10**: trung–dài hạn theo chính sách lãi suất Fed, lợi suất 2 năm so với lãi suất Fed và xu hướng DXY (trọng số 75%); trong ngày theo DXY và lợi suất 10 năm 8 giờ gần nhất (25%).
- **Đám đông**: crypto có funding quá cao cùng phía thì trừ điểm, ngược phía thì cộng.
- **COT**: giới đầu cơ đã ở mức cực đoan cùng phía thì trừ điểm.
- **Backtest**: nếu loại tín hiệu này lỗ sau chi phí trong quá khứ thì bị khóa tối đa hạng C.

Hạng A ≥ 70, B ≥ 55.

## Cài đặt lần đầu (chỉ làm một lần)
1. Vào **Settings → Pages**, mục *Build and deployment → Source*, chọn **GitHub Actions**.
2. Vào **Actions → Lai Long Desk scan → Run workflow** để chạy lần đầu.
3. Trang web sẽ có ở `https://<tên-github>.github.io/<tên-repo>/`.

### Telegram (tùy chọn)
1. Nhắn `@BotFather` trên Telegram, tạo bot, lấy token.
2. Nhắn cho bot của bạn một tin bất kỳ, rồi mở `https://api.telegram.org/bot<TOKEN>/getUpdates` để lấy `chat.id`.
3. Vào **Settings → Secrets and variables → Actions**, thêm `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`.

Bot chỉ gửi tín hiệu hạng A mới và kết quả khi tín hiệu đóng.

## Điều chỉnh
Mọi tham số nằm trong `config.json`: danh sách tài sản, chi phí giao dịch, ngưỡng R:R, ngưỡng khối lượng, điểm hạng A/B.

## Chạy thử trên máy (không bắt buộc)
```
python -m unittest discover -s tests -t .   # kiểm thử bằng dữ liệu giả lập
python -m pipeline.run                       # quét thật, ghi vào site/data
python -m http.server -d site 8000           # mở http://localhost:8000
```
Chỉ cần Python 3.10+, không cần cài thư viện nào.

---
*Công cụ cá nhân, không phải lời khuyên đầu tư.*
