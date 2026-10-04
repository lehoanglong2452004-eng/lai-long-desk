# Lai Long Desk Terminal

## 👉 [MỞ TERMINAL](https://lehoanglong2452004-eng.github.io/lai-long-desk/) · [TIN TỨC](https://lehoanglong2452004-eng.github.io/lai-long-desk/news/) · [MIDOTI DEPTH](https://lehoanglong2452004-eng.github.io/lai-long-desk/depth/)

Hệ thống cá nhân quét **crypto, forex và hàng hóa phái sinh** để tìm cơ hội ít người chú ý, chấm điểm từng cơ hội và hiển thị trên một trang web dạng terminal. Hệ thống **không bao giờ tự đặt lệnh**: bạn luôn là người quyết định.

Phương châm: **sống sót trước, kiếm vàng sau.** Mọi tín hiệu đều được kiểm chứng sau khi trừ phí và trượt giá. Loại tín hiệu nào lỗ sau chi phí sẽ tự bị hạ xuống hạng C.

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
