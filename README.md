# Lailong Macro Terminal

## 👉 [MỞ TERMINAL](https://lehoanglong2452004-eng.github.io/lai-long-desk/) · [TÌNH TRẠNG HỆ THỐNG](https://lehoanglong2452004-eng.github.io/lai-long-desk/status/)

Hệ sinh thái thống kê, tổng hợp dữ liệu vĩ mô kiểu Bloomberg Terminal để đánh giá cơ hội trung và dài hạn. Mỗi con số được đọc theo **hai mặt**: lãi suất cao không chỉ là kiềm chế lạm phát, mà còn là lúc người cầm nhiều tiền mặt, không dùng margin (như Buffett) được trả lãi để chờ và gom tài sản giá rẻ.

Gõ mã vào ô lệnh (phím `/` để nhảy tới ô lệnh) hoặc bấm F1 đến F12:

| Mã | Màn hình | Dữ liệu |
|---|---|---|
| HOME | Tổng quan | Bản đồ cơ hội (chỉ báo ở cực trị 10 năm, đọc hai mặt), đồng hồ chu kỳ, chỉ báo chính |
| DECI | Bảng quyết định | Cổ phiếu Mỹ, cổ phiếu Việt Nam, vàng, crypto, hàng hóa: mỗi tài sản 8-9 yếu tố vĩ mô chấm gió xuôi/gió ngược theo hướng đi 6 tháng, điểm tổng -100 đến +100, kèm mặt kia và giới hạn dữ liệu (khung 6-18 tháng) |
| CAL | Lịch công bố | 45 ngày tới theo giờ Việt Nam. FOMC, WASDE, GDP, PCE, bán lẻ, nhà khởi công lấy từ lịch chính thức của Fed, USDA, BEA, Census (tự đọc lại mỗi ngày); CPI, việc làm, PPI ước tính theo lịch thường lệ vì BLS chặn truy cập tự động; số liệu hằng tuần |
| CURV | Đường cong lợi suất | Đường cong Mỹ hôm nay so với 1 tuần, 1 tháng, 6 tháng, 1 năm, 2 năm; 10Y-2Y, 10Y-3M; đường cong Đức, khu vực euro, Anh, Nhật |
| RATE | Lãi suất | Fed, 3M/2Y/10Y/30Y, lợi suất thực, phần bù kỳ hạn, lãi vay mua nhà, USD; lãi suất 10 ngân hàng trung ương |
| INFL | Lạm phát | CPI, CPI lõi, PCE lõi, PPI, lương, lạm phát kỳ vọng |
| GROW | Tăng trưởng | GDP, thất nghiệp, việc làm, trợ cấp thất nghiệp, sản xuất, bán lẻ, niềm tin, nhà ở, CFNAI, quy tắc Sahm |
| LIQ | Thanh khoản, tín dụng, định giá | Bảng cân đối Fed, M2, RRP, TGA, thanh khoản ròng, NFCI, chênh lệch tín dụng, chỉ báo Buffett, tiền mặt trong quỹ tiền tệ |
| ENGY | Năng lượng | Tồn kho EIA (dầu thô, xăng, dầu cất, Cushing, khí đốt) so với mùa vụ 5 năm, sản lượng, lọc dầu, SPR, giá dầu và khí |
| AGRI | Nông sản | Bảng cân đối WASDE (USDA PSD): tồn kho/sử dụng thế giới và Mỹ cho ngô, lúa mì, đậu tương, gạo, cà phê, đường, bông |
| ASST | Tài sản dài hạn | S&P 500 (cả sau lạm phát), Nasdaq, vàng, bạc, đồng, dầu, DXY, Bitcoin, EEM, Nikkei, TLT, ETF Việt Nam (VNM), tỷ giá USD/VND, các tỷ lệ |
| CYCL | Chu kỳ | Đồng hồ đầu tư (tăng trưởng × lạm phát), bảng kiểm tra suy thoái |

Mỗi chỉ báo có biểu đồ toàn bộ lịch sử (vùng xám là suy thoái Mỹ), phân vị so với 10 năm và toàn bộ lịch sử, và phần **hai mặt**: mặt rủi ro, mặt cơ hội, ai hưởng lợi. Giải thích nằm trong `site/kb.js`, sửa trực tiếp được.

## Cách hệ thống chạy

```
GitHub Actions (mỗi giờ, miễn phí)
  1. pipeline.global_desk  ->  đường cong lợi suất Mỹ, Đức, khu vực euro, Anh, Nhật; lãi suất 10 NHTW (BIS)
  2. pipeline.macro_desk   ->  FRED, EIA, USDA FAS (WASDE), Yahoo -> site/data/macro/*.json
  3. pipeline.calendar_desk -> lịch công bố chính thức (Fed, USDA, BEA, Census), đọc lại mỗi ngày
  4. pipeline.health       ->  nguồn nào chạy được lần này -> trang Tình trạng
  5. Xuất bản trang web (GitHub Pages)
```

Không có gì chạy trên máy của bạn và không cần API key. Mỗi nhóm dữ liệu chỉ tải lại khi đã cũ (3 đến 24 giờ tùy nhóm), nguồn nào lỗi thì giữ số liệu lần trước và ghi rõ ngày. Sản lượng OPEC chưa có vì opec.org chặn tải tự động.

## Nguồn dữ liệu (miễn phí, công khai)

| Dữ liệu | Nguồn |
|---|---|
| Lãi suất, lợi suất, lạm phát, tăng trưởng, việc làm, thanh khoản, tín dụng, định giá | FRED (Fed St. Louis) |
| Đường cong lợi suất | US Treasury, Bundesbank, ECB, Bank of England, Bộ Tài chính Nhật |
| Lãi suất điều hành 10 ngân hàng trung ương | BIS |
| Tồn kho dầu, xăng, dầu cất, Cushing, khí đốt, sản lượng, lọc dầu | EIA |
| Bảng cân đối cung cầu nông sản (số liệu WASDE) | USDA FAS PSD |
| Giá tài sản dài hạn | Yahoo Finance (mục đích cá nhân) |

## Cài đặt lần đầu (chỉ làm một lần)
1. Vào **Settings → Pages**, mục *Build and deployment → Source*, chọn **GitHub Actions**.
2. Vào **Actions → Lailong Macro scan → Run workflow** để chạy lần đầu.

## Chạy thử trên máy (không bắt buộc)
```
python -m unittest discover -s tests -t .   # kiểm thử offline
python -m pipeline.macro_desk --force        # tải dữ liệu thật vào site/data/macro
python -m http.server -d site 8000           # mở http://localhost:8000
```
Chỉ cần Python 3.10+, không cần cài thư viện nào.

---
*Công cụ cá nhân, không phải lời khuyên đầu tư.*
