/* Lailong Macro: what each number means, read from both sides.
   For every indicator: what it is, then when it is HIGH and when it is LOW, the risk side and the
   opportunity side. No number is purely good or bad: it moves money from one group to another.
   hi / lo = [risk, opportunity]. who = who usually wins / loses. */
window.KB = {
  /* ---------------------------------------------------------------- rates */
  fedfunds: {
    what: "Lãi suất qua đêm mà Fed điều hành. Là giá vốn gốc của cả hệ thống đô la: mọi khoản vay, định giá cổ phiếu, bất động sản đều quy về nó.",
    hi: ["Vay nợ đắt lên, doanh nghiệp đòn bẩy cao và người dùng margin bị ép bán, định giá tài sản bị nén, rủi ro gãy ở chỗ yếu nhất (ngân hàng nhỏ, bất động sản thương mại).",
         "Tiền mặt tự nó sinh lãi 4-5%/năm không rủi ro. Người cầm nhiều tiền mặt, không nợ (kiểu Berkshire của Buffett) vừa được trả lãi để chờ, vừa đứng ở vị thế mua khi người dùng đòn bẩy phải bán tháo tài sản tốt giá rẻ."],
    lo: ["Tiền rẻ đẩy giá mọi tài sản lên, dễ thành bong bóng; người tiết kiệm bị lạm phát ăn mòn; ngân hàng trung ương ít đạn để cứu khi khủng hoảng đến.",
         "Vay rẻ để mua tài sản sinh dòng tiền; cổ phiếu tăng trưởng, bất động sản, crypto thường được hưởng lợi mạnh nhất ở giai đoạn đầu tiền rẻ."],
    who: "Lãi cao: lợi cho người gửi tiền, quỹ tiền tệ, người có tiền mặt chờ mua. Thiệt cho con nợ, công ty zombie, nhà đầu tư margin. Lãi thấp thì ngược lại.",
  },
  us3m: {
    what: "Lợi suất tín phiếu Kho bạc Mỹ 3 tháng, gần như bằng lãi suất Fed kỳ vọng trong 3 tháng tới. Đây là \"lãi suất không rủi ro\" của tiền mặt.",
    hi: ["Rào cản cho mọi tài sản rủi ro cao: cổ phiếu phải cho lợi nhuận cao hơn mức này mới đáng giữ.", "Tiền chờ trong tín phiếu hoặc quỹ tiền tệ được trả lãi tốt, không vội phải mua ở giá đắt."],
    lo: ["Tiền mặt gần như không sinh lời, ép người ta chạy theo rủi ro.", "Chi phí cơ hội của việc giữ cổ phiếu, vàng, bất động sản thấp."],
  },
  us2y: {
    what: "Lợi suất trái phiếu Mỹ 2 năm: thị trường đoán Fed sẽ làm gì trong 2 năm tới. Chạy trước Fed.",
    hi: ["Thị trường tin Fed sẽ giữ lãi cao lâu hoặc còn tăng: áp lực lên định giá và USD mạnh.", "Khóa được lợi suất cao 2 năm gần như không rủi ro; nếu kinh tế yếu đi, trái phiếu 2 năm tăng giá mạnh khi Fed phải cắt."],
    lo: ["Thị trường đang đặt cược Fed cắt lãi, thường vì sợ suy thoái.", "Tín hiệu nới lỏng sắp tới, tốt cho tài sản rủi ro khi suy thoái không xảy ra."],
  },
  us10y: {
    what: "Lợi suất trái phiếu Mỹ 10 năm: giá vốn dài hạn của thế giới, chuẩn để định giá cổ phiếu và lãi vay mua nhà.",
    hi: ["Định giá cổ phiếu (nhất là cổ phiếu tăng trưởng) bị nén, lãi vay mua nhà cao, nợ công Mỹ trả lãi đắt hơn.", "Trái phiếu dài hạn rẻ: khóa lợi suất cao 10 năm; nếu chu kỳ đảo chiều, giá trái phiếu tăng mạnh (lợi suất giảm 1% thì giá trái phiếu 10 năm tăng khoảng 8%)."],
    lo: ["Trái phiếu đắt, lợi suất thấp không bù được lạm phát; rủi ro mất giá khi lợi suất bật lên.", "Vốn dài hạn rẻ, đẩy định giá cổ phiếu và bất động sản lên."],
  },
  us30y: {
    what: "Lợi suất 30 năm: phản ánh kỳ vọng lạm phát dài hạn và nỗi lo về nợ công.",
    hi: ["Thị trường đòi phần bù cho rủi ro lạm phát và thâm hụt ngân sách kéo dài.", "Quỹ hưu trí, bảo hiểm có thể khóa lợi suất cao cả đời; độ nhạy giá rất lớn khi lợi suất quay đầu."],
    lo: ["Kỳ vọng tăng trưởng và lạm phát dài hạn yếu.", "Vốn cực dài rẻ, tốt cho dự án hạ tầng và bất động sản."],
  },
  s10y2y: {
    what: "Chênh lệch lợi suất 10 năm trừ 2 năm. Âm (đảo ngược) nghĩa là thị trường tin lãi suất tương lai sẽ thấp hơn hôm nay, thường vì suy thoái sắp đến.",
    hi: ["Đường cong dốc lên do lợi suất dài tăng (dốc kiểu tăng giá) có thể là lo lạm phát hoặc nợ công; nếu dốc lên ngay sau đảo ngược, suy thoái thường đang đến gần.", "Ngân hàng vay ngắn cho vay dài có lãi biên tốt; dốc lên do Fed cắt lãi là giai đoạn đầu chu kỳ mới, tài sản rủi ro thường tăng sau đó."],
    lo: ["Đảo ngược là tín hiệu suy thoái khá đáng tin của Mỹ (đi trước 6-24 tháng); ngân hàng bị bóp lãi biên, tín dụng co lại.", "Lợi suất ngắn hạn cao hơn dài hạn: cầm tiền mặt hoặc trái phiếu ngắn được trả nhiều nhất mà ít rủi ro nhất, chờ cơ hội khi chu kỳ đảo."],
  },
  s10y3m: {
    what: "Chênh lệch 10 năm trừ 3 tháng, thước đo suy thoái Fed New York dùng. Giai đoạn nguy hiểm nhất thường là lúc nó thoát đảo ngược (dốc lên trở lại).",
    hi: ["Nếu vừa thoát vùng âm: lịch sử cho thấy suy thoái hay bắt đầu đúng lúc này, vì Fed cắt lãi gấp.", "Đường cong bình thường, kinh tế mở rộng; ngân hàng cho vay mạnh."],
    lo: ["Đảo ngược sâu: thắt chặt tiền tệ đang cắn vào nền kinh tế.", "Tiền mặt ngắn hạn sinh lãi cao hơn trái phiếu dài: lúc trả tiền cho sự kiên nhẫn."],
  },
  real10y: {
    what: "Lợi suất thực 10 năm (trái phiếu chống lạm phát TIPS) = lợi suất danh nghĩa trừ lạm phát kỳ vọng. Là giá thật của tiền theo thời gian.",
    hi: ["Đối thủ nặng ký của vàng, cổ phiếu tăng trưởng và crypto (tài sản không trả lãi). Lợi suất thực cao kéo dài siết chặt mọi định giá.", "Mua TIPS là khóa được lợi nhuận thực cao không rủi ro tín dụng. Lịch sử: lợi suất thực trên 2% thường là vùng tích lũy trái phiếu dài hạn tốt."],
    lo: ["Lợi suất thực âm là tiền mặt bị đánh thuế bởi lạm phát; tài sản bị thổi phồng.", "Vàng, bất động sản, cổ phiếu được hưởng lợi rõ nhất khi lợi suất thực thấp hoặc âm."],
  },
  termprem: {
    what: "Phần bù kỳ hạn: phần lợi suất thêm mà nhà đầu tư đòi để giữ trái phiếu dài thay vì cuộn tín phiếu ngắn. Tăng khi lo nợ công, lạm phát bất định.",
    hi: ["Lợi suất dài cao lên không phải vì kinh tế mạnh mà vì sợ rủi ro: tác động xấu lên cổ phiếu và nhà đất.", "Trái phiếu dài được trả \"phí bảo hiểm\" cao: điểm vào tốt cho người kiên nhẫn."],
    lo: ["Nhà đầu tư chấp nhận giữ dài hạn mà gần như không đòi bù: trái phiếu đắt.", "Vốn dài hạn rẻ cho doanh nghiệp và chính phủ."],
  },
  mortgage: {
    what: "Lãi vay mua nhà cố định 30 năm (Freddie Mac). Quyết định khả năng mua nhà của người Mỹ.",
    hi: ["Giao dịch nhà đóng băng, người mua mới bị loại; ngành xây dựng, nội thất, môi giới chậm lại.", "Người mua tiền mặt có lợi thế đàm phán; khi lãi giảm, cầu dồn nén bung ra rất nhanh."],
    lo: ["Giá nhà dễ bị đẩy lên quá cao.", "Hoạt động nhà ở, tái cấp vốn, tiêu dùng tăng."],
  },
  dollar: {
    what: "Chỉ số USD rộng của Fed (so với rổ tiền tệ đối tác thương mại). USD là đồng tiền vay nợ của thế giới.",
    hi: ["Thị trường mới nổi có nợ USD bị siết, hàng hóa (tính bằng USD) bị ép giá, lợi nhuận đa quốc gia Mỹ giảm.", "Tài sản ngoài Mỹ trở nên rẻ khi quy đổi; USD mạnh cực đoan thường là đỉnh chu kỳ, sau đó hàng hóa và thị trường mới nổi hồi mạnh."],
    lo: ["Lạm phát nhập khẩu ở Mỹ; dấu hiệu niềm tin vào USD suy yếu.", "Hàng hóa, vàng, cổ phiếu mới nổi thường tăng; dòng vốn chảy ra ngoài nước Mỹ."],
  },
  /* ---------------------------------------------------------------- inflation */
  cpi: {
    what: "Giá tiêu dùng Mỹ so với cùng kỳ năm trước. Fed nhắm khoảng 2% (theo PCE).",
    hi: ["Sức mua bị bào mòn, Fed buộc phải giữ lãi cao; trái phiếu và cổ phiếu định giá cao chịu thiệt.", "Người nợ cố định có lợi (nợ thực giảm); tài sản thực như hàng hóa, đất, doanh nghiệp có quyền định giá giữ được giá trị."],
    lo: ["Dưới 1% hoặc âm: rủi ro giảm phát, nợ thực nặng lên, tiêu dùng trì hoãn.", "Fed có không gian cắt lãi; trái phiếu và cổ phiếu tăng trưởng thường được lợi."],
  },
  corecpi: {
    what: "CPI bỏ thực phẩm và năng lượng (hai thứ biến động mạnh). Cho thấy lạm phát nền, thứ Fed quan tâm.",
    hi: ["Lạm phát đã ngấm vào dịch vụ, tiền thuê, tiền lương: khó hạ, lãi suất phải cao lâu.", "Doanh nghiệp có quyền tăng giá và người sở hữu tài sản thực hưởng lợi."],
    lo: ["Nhu cầu yếu.", "Lạm phát nền dịu là tín hiệu Fed sắp nới lỏng."],
  },
  corepce: {
    what: "Giá chi tiêu cá nhân lõi, thước đo chính thức Fed nhắm mục tiêu 2%.",
    hi: ["Xa mục tiêu 2% thì Fed không thể cắt lãi dù kinh tế chậm.", "Lãi suất thực đang cao trên tiền gửi nếu lạm phát bắt đầu quay đầu giảm."],
    lo: ["Dưới 2% kéo dài thì rủi ro tăng trưởng yếu.", "Đường cho Fed nới lỏng đã mở."],
  },
  ppi: {
    what: "Giá đầu ra của nhà sản xuất. Thường đi trước CPI vài tháng.",
    hi: ["Chi phí đầu vào tăng, sẽ đẩy sang người tiêu dùng hoặc ăn vào biên lợi nhuận.", "Nhà sản xuất hàng hóa cơ bản (dầu, kim loại, phân bón) thu lời."],
    lo: ["Giá sản xuất giảm: cầu toàn cầu yếu.", "Biên lợi nhuận doanh nghiệp hạ nguồn mở rộng; lạm phát tiêu dùng sắp dịu."],
  },
  wages: {
    what: "Lương giờ của lao động sản xuất và phi giám sát, so với cùng kỳ.",
    hi: ["Vòng xoáy lương và giá; biên lợi nhuận doanh nghiệp bị ép.", "Người lao động có sức mua thật nếu lương tăng nhanh hơn lạm phát: hỗ trợ tiêu dùng."],
    lo: ["Thị trường lao động lỏng, sức mua yếu.", "Doanh nghiệp giữ được biên lợi nhuận; lạm phát dịch vụ dễ hạ."],
  },
  be5y: {
    what: "Lạm phát kỳ vọng 5 năm tính từ giá trái phiếu thường trừ TIPS. Đây là thị trường bỏ tiền thật ra cược lạm phát.",
    hi: ["Kỳ vọng lạm phát mất neo: Fed phải cứng rắn hơn.", "Hàng hóa, vàng, TIPS thường đi lên cùng."],
    lo: ["Thị trường lo giảm phát, suy thoái.", "TIPS rẻ so với trái phiếu thường: bảo hiểm lạm phát giá thấp."],
  },
  fwd5y5y: {
    what: "Lạm phát kỳ vọng trung bình 5 năm bắt đầu sau 5 năm nữa. Fed xem đây là độ tin cậy dài hạn của mình.",
    hi: ["Niềm tin vào Fed đang yếu, phần bù kỳ hạn sẽ cao.", "Tài sản thực dài hạn được ưa chuộng."],
    lo: ["Thị trường tin lạm phát sẽ thấp dài lâu.", "Trái phiếu dài có nền tảng tốt."],
  },
  mich: {
    what: "Người tiêu dùng Mỹ đoán lạm phát 1 năm tới (khảo sát Đại học Michigan). Kỳ vọng có thể tự thành hiện thực.",
    hi: ["Người dân tin giá sẽ tăng: mua trước, đòi tăng lương, lạm phát dai dẳng.", "Thường đạt đỉnh khi giá xăng đạt đỉnh: chỉ báo ngược cho tâm lý."],
    lo: ["Tâm lý ổn định.", "Cho Fed thêm không gian."],
  },
  /* ---------------------------------------------------------------- growth */
  gdp: {
    what: "Tổng sản lượng thực của nền kinh tế Mỹ so với cùng kỳ năm trước.",
    hi: ["Tăng trưởng nóng dễ kéo theo lạm phát và lãi cao lâu hơn.", "Lợi nhuận doanh nghiệp tăng; cổ phiếu chu kỳ, hàng hóa được lợi."],
    lo: ["Âm hai quý liên tiếp là suy thoái kỹ thuật; thất nghiệp tăng, lợi nhuận giảm.", "Suy thoái là lúc tài sản tốt bị bán rẻ nhất. Người có tiền mặt và không nợ mua được doanh nghiệp tốt với giá hời (Buffett 2008: Goldman, GE)."],
  },
  gdpq: {
    what: "Tăng trưởng GDP thực theo quý, quy ra tốc độ cả năm. Biến động mạnh hơn số cùng kỳ.",
    hi: ["Có thể là đỉnh chu kỳ.", "Doanh thu doanh nghiệp tăng."],
    lo: ["Hai quý âm liên tiếp: suy thoái kỹ thuật.", "Ngân hàng trung ương sẽ nới lỏng; tài sản rủi ro thường tạo đáy trước khi GDP tạo đáy."],
  },
  unrate: {
    what: "Tỷ lệ thất nghiệp. Chỉ báo trễ: tăng khi suy thoái đã bắt đầu.",
    hi: ["Thu nhập và tiêu dùng giảm; nợ xấu tăng.", "Thất nghiệp đỉnh thường trùng với đáy thị trường cổ phiếu, vì lúc đó Fed đã nới lỏng hết cỡ."],
    lo: ["Thị trường lao động căng, đẩy lương và lạm phát; thất nghiệp thấp nhất thường gần đỉnh chu kỳ.", "Tiêu dùng mạnh, doanh nghiệp có doanh thu tốt."],
  },
  payrolls: {
    what: "Số việc làm mới mỗi tháng ngoài nông nghiệp. Nền kinh tế Mỹ cần khoảng 100-150 nghìn để giữ thất nghiệp ổn định.",
    hi: ["Kinh tế quá nóng, Fed khó cắt lãi.", "Thu nhập tăng, chi tiêu mạnh."],
    lo: ["Âm là dấu hiệu suy thoái rõ ràng.", "Fed buộc phải nới lỏng; trái phiếu tăng giá."],
  },
  claims: {
    what: "Số đơn xin trợ cấp thất nghiệp lần đầu mỗi tuần. Chỉ báo sớm và tần suất cao nhất về sa thải.",
    hi: ["Sa thải đang lan rộng: suy thoái đến gần.", "Dữ liệu sớm nhất để đón đầu Fed cắt lãi."],
    lo: ["Thị trường lao động khỏe.", "Doanh nghiệp giữ người: kinh tế vững."],
  },
  indpro: {
    what: "Sản xuất công nghiệp (nhà máy, mỏ, điện) so với cùng kỳ.",
    hi: ["Có thể là đỉnh chu kỳ sản xuất.", "Cầu kim loại, năng lượng tăng."],
    lo: ["Ngành chế tạo suy giảm.", "Chu kỳ tồn kho thường đảo chiều sau 12-18 tháng giảm: cổ phiếu chu kỳ hay tạo đáy trước số liệu."],
  },
  retail: {
    what: "Doanh số bán lẻ danh nghĩa so với cùng kỳ. Tiêu dùng chiếm khoảng 70% GDP Mỹ.",
    hi: ["Có thể giữ lạm phát cao.", "Doanh nghiệp tiêu dùng có doanh thu tốt."],
    lo: ["Người tiêu dùng thắt lưng buộc bụng.", "Cổ phiếu tiêu dùng bị bán quá đà thường là cơ hội khi chu kỳ sắp quay lại."],
  },
  sentiment: {
    what: "Niềm tin người tiêu dùng (Đại học Michigan). Một chỉ báo tâm lý.",
    hi: ["Hưng phấn quá mức thường gần đỉnh.", "Tiêu dùng ổn."],
    lo: ["Bi quan phổ biến.", "Chỉ báo ngược nổi tiếng: niềm tin chạm đáy lịch sử thường gần đáy thị trường cổ phiếu (2008, 2022). Khi mọi người sợ thì tài sản rẻ."],
  },
  housing: {
    what: "Số nhà khởi công mỗi năm (quy năm). Nhà ở là ngành nhạy lãi suất nhất, thường dẫn dắt chu kỳ.",
    hi: ["Có thể quá đà nếu tín dụng dễ dãi.", "Kéo theo vật liệu, gỗ, đồng, nội thất."],
    lo: ["Lãi suất đang bóp nghẹt; ngành nhà ở là nơi suy thoái thường bắt đầu.", "Thiếu cung nhà kéo dài là nền tảng cho giá nhà và cổ phiếu xây dựng khi lãi suất hạ."],
  },
  cfnai: {
    what: "Chỉ số hoạt động quốc gia Chicago (gộp 85 chỉ tiêu), trung bình 3 tháng. 0 là tăng trưởng đúng xu hướng; dưới -0,7 lịch sử cho thấy suy thoái.",
    hi: ["Trên 0,2: tăng trưởng trên xu hướng, áp lực lạm phát.", "Kinh tế mở rộng mạnh."],
    lo: ["Dưới -0,7: suy thoái theo lịch sử.", "Thường là giai đoạn Fed nới lỏng mạnh; tài sản rẻ."],
  },
  sahm: {
    what: "Quy tắc Sahm: thất nghiệp trung bình 3 tháng cao hơn mức thấp nhất 12 tháng qua bao nhiêu điểm %. Từ 0,5 trở lên: suy thoái đã bắt đầu (đúng gần như mọi lần từ 1970).",
    hi: ["Suy thoái đang diễn ra.", "Lịch sử: thời điểm Sahm kích hoạt thường cách đáy thị trường cổ phiếu vài tháng; người có tiền mặt bắt đầu được trả công."],
    lo: ["Thị trường lao động bình yên.", "Chưa có tín hiệu suy thoái."],
  },
  /* ---------------------------------------------------------------- liquidity, credit */
  fedbs: {
    what: "Tổng tài sản của Fed. Fed mua trái phiếu (QE) là bơm tiền; để trái phiếu đáo hạn không tái đầu tư (QT) là hút tiền.",
    hi: ["Fed đã bơm rất nhiều: phụ thuộc vào tiền rẻ, rủi ro khi rút.", "Thanh khoản dồi dào nâng mọi tài sản."],
    lo: ["Fed đang hút tiền: tài sản rủi ro thiếu lực đỡ.", "QT kết thúc hoặc QE quay lại thường là cú hích lớn cho tài sản."],
  },
  m2: {
    what: "Cung tiền M2 (tiền mặt, tiền gửi, quỹ tiền tệ bán lẻ) so với cùng kỳ.",
    hi: ["Tiền in nhanh hơn kinh tế: lạm phát sau 1-2 năm (2021).", "Tiền dồi dào tìm tài sản: cổ phiếu, nhà, crypto, vàng."],
    lo: ["M2 âm rất hiếm (2023): thanh khoản bị rút, tăng trưởng chậm.", "Lạm phát sẽ dịu; khi M2 quay lại tăng thì tài sản rủi ro thường khởi sắc."],
  },
  m2lvl: { what: "Tổng cung tiền M2 (nghìn tỷ USD). Giúp thấy tài sản đang đắt hay rẻ so với lượng tiền trong hệ thống.", hi: ["", ""], lo: ["", ""] },
  rrp: {
    what: "Tiền các quỹ thị trường tiền tệ gửi qua đêm ở Fed. Là bể thanh khoản thừa: khi giảm, tiền đó chảy vào thị trường (mua tín phiếu).",
    hi: ["Thừa tiền nhưng không ai muốn rủi ro.", "Bể tiền sẵn sàng chảy ra khi có cơ hội."],
    lo: ["Bể đệm đã cạn: QT và phát hành trái phiếu giờ sẽ rút trực tiếp từ dự trữ ngân hàng, dễ gây căng thẳng thanh khoản.", "Báo hiệu Fed sắp phải dừng QT."],
  },
  tga: {
    what: "Tài khoản Kho bạc Mỹ tại Fed. Kho bạc gom tiền về (TGA tăng) là hút thanh khoản khỏi thị trường, chi ra là bơm vào.",
    hi: ["Tiền bị giữ ở Fed, không ở trong thị trường.", "Khi Kho bạc chi bớt xuống, thanh khoản được nhả ra."],
    lo: ["Thường xảy ra khi chạm trần nợ; sau khi giải quyết, Kho bạc sẽ hút mạnh.", "Thanh khoản thị trường được bơm ngắn hạn."],
  },
  netliq: {
    what: "Thanh khoản ròng = tài sản Fed - TGA - RRP. Một thước đo phổ biến cho lượng tiền thật sự trôi nổi; thường đi cùng S&P 500 và Bitcoin.",
    hi: ["Tài sản rủi ro được nâng bởi tiền chứ không bởi lợi nhuận: dễ đảo khi thanh khoản rút.", "Môi trường thuận cho tài sản rủi ro."],
    lo: ["Thanh khoản rút ra: gió ngược cho cổ phiếu và crypto.", "Đáy thanh khoản thường đi trước đáy tài sản."],
  },
  nfci: {
    what: "Điều kiện tài chính Chicago (105 chỉ tiêu: tín dụng, đòn bẩy, rủi ro). Âm là dễ dãi hơn trung bình, dương là căng hơn.",
    hi: ["Tài chính căng: vay khó, bán tháo, khủng hoảng (2008, 2020).", "Căng cực điểm là thời điểm người có tiền mặt mua được tài sản giá hời nhất."],
    lo: ["Quá dễ dãi kéo dài nuôi đòn bẩy và bong bóng.", "Tín dụng dễ, doanh nghiệp vay được, kinh tế mở rộng."],
  },
  hyoas: {
    what: "Chênh lệch lợi suất trái phiếu rác (hạng dưới đầu tư) so với trái phiếu chính phủ. Thước đo nỗi sợ vỡ nợ.",
    hi: ["Thị trường sợ vỡ nợ: tín dụng đóng băng, suy thoái.", "Trên 7-8% lịch sử là vùng mua cực tốt: trái phiếu rác và cổ phiếu được định giá như thảm họa (2009, 2020)."],
    lo: ["Dưới 3%: nhà đầu tư không đòi bù rủi ro, tự mãn; bất kỳ cú sốc nào cũng làm nó bật mạnh.", "Doanh nghiệp vay rẻ, tái cấp vốn dễ."],
  },
  igoas: {
    what: "Chênh lệch trái phiếu doanh nghiệp hạng đầu tư so với trái phiếu chính phủ.",
    hi: ["Kể cả doanh nghiệp tốt cũng vay đắt: căng thẳng hệ thống.", "Trái phiếu doanh nghiệp tốt có lợi suất hấp dẫn."],
    lo: ["Rủi ro bị định giá thấp.", "Vốn rẻ cho doanh nghiệp."],
  },
  lending: {
    what: "Tỷ lệ ngân hàng siết điều kiện cho vay doanh nghiệp (khảo sát quý của Fed). Dương là siết, âm là nới.",
    hi: ["Tín dụng co lại: thường đi trước suy thoái và vỡ nợ.", "Doanh nghiệp có tiền mặt, ít nợ có lợi thế lớn khi đối thủ không vay được."],
    lo: ["Cho vay dễ dãi.", "Tín dụng mở rộng nuôi tăng trưởng."],
  },
  mmf: {
    what: "Tổng tiền nằm trong quỹ thị trường tiền tệ Mỹ. Đây là đống tiền mặt đứng ngoài thị trường.",
    hi: ["Nhà đầu tư thận trọng, tiền chưa vào tài sản rủi ro.", "Nhiên liệu tiềm năng: khi Fed cắt lãi, một phần đống tiền này sẽ tìm sang cổ phiếu, trái phiếu."],
    lo: ["Mọi người đã dồn hết vào tài sản rủi ro: ít người còn để mua thêm.", ""],
  },
  buffett: {
    what: "Chỉ báo Buffett: tổng giá trị cổ phiếu doanh nghiệp Mỹ chia GDP. Buffett gọi là thước đo định giá tốt nhất ở mọi thời điểm.",
    hi: ["Thị trường đắt so với nền kinh tế: lợi nhuận kỳ vọng 10 năm tới thấp; Buffett thường tích tiền mặt ở những giai đoạn này (Berkshire giữ tiền mặt kỷ lục).", "Thường đi cùng xu hướng mạnh; đắt có thể đắt lâu. Cơ hội nằm ở việc kiên nhẫn giữ tiền mặt sinh lãi chờ giá về."],
    lo: ["Thị trường bi quan, có thể còn giảm.", "Cổ phiếu rẻ so với nền kinh tế: lợi nhuận dài hạn kỳ vọng cao. 1982, 2009 là ví dụ."],
  },
  cash_ratio: {
    what: "Tiền quỹ tiền tệ so với tổng vốn hóa cổ phiếu Mỹ. Cao là tiền mặt nhiều so với cổ phiếu, thấp là ai cũng đã mua cổ phiếu.",
    hi: ["Sợ hãi phổ biến.", "Nhiều tiền đứng ngoài: lực mua tiềm năng lớn."],
    lo: ["Tiền mặt ít so với cổ phiếu: thị trường đã \"all-in\", dễ tổn thương.", ""],
  },
  /* ---------------------------------------------------------------- energy */
  crude: {
    what: "Tồn kho dầu thô thương mại Mỹ (không gồm SPR), báo cáo EIA mỗi thứ Tư. So với trung bình 5 năm cùng tuần mới có ý nghĩa vì tồn kho có tính mùa vụ.",
    hi: ["Cao hơn trung bình 5 năm: dư cung, ép giá dầu và lợi nhuận nhà sản xuất.", "Giá dầu thấp là lợi cho hãng hàng không, hóa dầu, người tiêu dùng; dầu dư thừa là lúc tích lũy cổ phiếu năng lượng giá rẻ."],
    lo: ["Thấp hơn trung bình 5 năm: thị trường thiếu, giá dễ tăng vọt khi có cú sốc.", "Nhà sản xuất và công ty dầu khí có biên lợi nhuận cao; đường cong giá dầu backwardation thưởng cho người giữ hợp đồng."],
  },
  spr: {
    what: "Kho dự trữ dầu chiến lược của chính phủ Mỹ.",
    hi: ["Chính phủ có đạn để kìm giá khi khủng hoảng.", ""],
    lo: ["Ít đạn để can thiệp; chính phủ sẽ phải mua lại (tạo cầu).", "Mua bù SPR là cầu nền cho giá dầu."],
  },
  gasoline: {
    what: "Tồn kho xăng Mỹ. Mùa lái xe (tháng 5 đến 9) tồn kho thường giảm.",
    hi: ["Cầu xăng yếu hoặc nhà máy lọc chạy quá nhiều.", "Giá xăng thấp hỗ trợ tiêu dùng."],
    lo: ["Giá xăng dễ tăng, đẩy CPI và kỳ vọng lạm phát.", "Biên lọc dầu (crack spread) tốt cho nhà máy lọc."],
  },
  distillate: {
    what: "Tồn kho dầu cất (diesel, dầu sưởi). Gắn với vận tải, công nghiệp và mùa đông.",
    hi: ["Hoạt động công nghiệp, vận tải chậm.", ""],
    lo: ["Thiếu diesel đẩy chi phí vận tải và lạm phát.", "Nhà máy lọc và hợp đồng dầu sưởi được lợi."],
  },
  cushing: {
    what: "Tồn kho tại Cushing, Oklahoma, nơi giao nhận hợp đồng dầu WTI. Quá thấp làm giá kỳ gần tăng vọt; quá đầy làm giá kỳ gần sụp (tháng 4/2020 âm 37 USD).",
    hi: ["Kho đầy, giá kỳ gần bị ép.", "Cấu trúc contango: người có kho chứa thu lợi."],
    lo: ["Gần mức tối thiểu vận hành (khoảng 20 triệu thùng): rủi ro siết giá kỳ gần.", "Backwardation mạnh thưởng cho người nắm giữ hợp đồng gần."],
  },
  production: {
    what: "Sản lượng dầu thô Mỹ mỗi ngày. Mỹ là nước sản xuất dầu lớn nhất thế giới.",
    hi: ["Cung dồi dào kìm giá dầu; cạnh tranh thị phần với OPEC+.", "Mỹ ít phụ thuộc dầu nhập; thặng dư năng lượng hỗ trợ USD."],
    lo: ["Ngành đá phiến thiếu đầu tư, cung thắt lại về sau.", "Giá dầu có nền tảng tăng dài hạn."],
  },
  refutil: {
    what: "Tỷ lệ công suất lọc dầu đang dùng. Mùa bảo trì (xuân, thu) thấp, mùa hè cao.",
    hi: ["Nhà máy chạy hết công suất, ít dư địa khi có sự cố.", "Cầu dầu thô từ nhà máy lọc mạnh."],
    lo: ["Bảo trì hoặc sự cố: dầu thô ứ lại, sản phẩm lọc thiếu.", ""],
  },
  natgas: {
    what: "Tồn kho khí đốt Mỹ (48 bang), báo cáo EIA mỗi thứ Năm. Bơm vào từ tháng 4 đến 10, rút ra mùa đông.",
    hi: ["Dư cung, giá khí thấp, nhà sản xuất cắt giảm.", "Khí rẻ là lợi thế cho hóa chất, điện, phân bón Mỹ và xuất khẩu LNG."],
    lo: ["Mùa đông lạnh có thể làm giá vọt mạnh.", "Nhà sản xuất khí thu lợi lớn."],
  },
  wti: { what: "Giá dầu WTI giao ngay tại Cushing.", hi: ["Gánh nặng cho tiêu dùng và lạm phát; nguy cơ phá hủy cầu.", "Nhà sản xuất, quốc gia xuất khẩu dầu, cổ phiếu năng lượng hưởng lợi."], lo: ["Ngành dầu cắt đầu tư, cung về sau thắt lại.", "Lạm phát dịu, người tiêu dùng dư tiền; dầu rẻ dài là tiền đề cho chu kỳ giá cao tiếp theo."] },
  brent: { what: "Giá dầu Brent, chuẩn giá dầu thế giới.", hi: ["Lạm phát toàn cầu, nước nhập khẩu dầu (châu Á) chịu thiệt.", "Nước xuất khẩu dầu và đồng tiền của họ mạnh lên."], lo: ["Ngân sách nước dầu mỏ căng, OPEC+ có thể cắt sản lượng.", "Nước nhập khẩu dầu hưởng lợi."] },
  henryhub: { what: "Giá khí tự nhiên Henry Hub (Mỹ).", hi: ["Chi phí điện, phân bón tăng.", "Nhà sản xuất khí hưởng lợi."], lo: ["Nhà sản xuất cắt giàn khoan.", "Công nghiệp Mỹ có chi phí năng lượng rẻ nhất thế giới."] },
  opec: { what: "Giá trung bình rổ dầu của các nước OPEC.", hi: ["Thu nhập OPEC cao, dễ tăng sản lượng giành thị phần.", ""], lo: ["Dưới giá hòa vốn ngân sách của nhiều nước OPEC: áp lực cắt giảm sản lượng, hỗ trợ giá.", ""] },
  /* ---------------------------------------------------------------- assets */
  spx: { what: "Chỉ số S&P 500, 500 doanh nghiệp lớn nhất Mỹ.", hi: ["Định giá cao làm lợi nhuận kỳ vọng tương lai thấp.", "Xu hướng tăng dài hạn: thị trường tăng nhiều thời gian hơn giảm."], lo: ["Giảm sâu đi kèm suy thoái.", "Các đợt giảm 30-50% trong lịch sử luôn là cơ hội mua tốt nhất thập kỷ cho người có tiền mặt."] },
  ndx: { what: "Nasdaq Composite, nặng về công nghệ.", hi: ["Nhạy với lãi suất thực; tập trung vào vài cổ phiếu lớn.", ""], lo: ["", "Cổ phiếu tăng trưởng giảm mạnh khi lãi suất cao, bật mạnh khi lãi suất đảo chiều."] },
  gold: { what: "Vàng. Tài sản không trả lãi, không có rủi ro đối tác; ngân hàng trung ương mua nhiều từ 2022.", hi: ["Đối thủ là lợi suất thực: khi lợi suất thực tăng, vàng hay bị ép.", "Lo ngại về tiền giấy, nợ công, địa chính trị đẩy vàng lên."], lo: ["", "Vàng rẻ khi lợi suất thực cao: vùng tích lũy dài hạn."] },
  silver: { what: "Bạc: nửa kim loại quý, nửa kim loại công nghiệp (pin mặt trời).", hi: ["Biến động gấp 2 lần vàng.", ""], lo: ["", "Tỷ lệ vàng/bạc cao cực đoan thường báo bạc rẻ tương đối."] },
  copper: { what: "Đồng, \"tiến sĩ đồng\": nhạy với sản xuất toàn cầu, xây dựng, điện khí hóa.", hi: ["Chi phí cho điện, xe điện tăng.", "Báo hiệu tăng trưởng toàn cầu mạnh."], lo: ["Báo hiệu kinh tế toàn cầu yếu (Trung Quốc).", "Thiếu đầu tư mỏ mới tạo nền cho chu kỳ tăng dài hạn."] },
  oil: { what: "Hợp đồng tương lai dầu WTI.", hi: ["", ""], lo: ["", ""] },
  dxy: { what: "Chỉ số USD so với 6 đồng tiền lớn (EUR chiếm 58%).", hi: ["Siết tài chính toàn cầu.", "Đỉnh USD thường là điểm vào cho tài sản ngoài Mỹ."], lo: ["", "Hàng hóa và thị trường mới nổi hưởng lợi."] },
  btc: { what: "Bitcoin: tài sản nhạy nhất với thanh khoản toàn cầu.", hi: ["Biến động cực lớn, có thể giảm 70-80% từ đỉnh.", ""], lo: ["", "Các đáy chu kỳ thường trùng với lúc thanh khoản đảo chiều đi lên."] },
  em: { what: "Quỹ cổ phiếu các thị trường mới nổi (EEM).", hi: ["", ""], lo: ["USD mạnh và lãi Mỹ cao gây áp lực.", "Định giá rẻ so với Mỹ trong nhiều năm; hưởng lợi khi USD yếu đi."] },
  nikkei: { what: "Chỉ số Nikkei 225 của Nhật.", hi: ["", ""], lo: ["", ""] },
  tlt: { what: "Quỹ trái phiếu Kho bạc Mỹ trên 20 năm. Giá đi ngược lợi suất dài hạn.", hi: ["Lợi suất thấp, trái phiếu đắt.", ""], lo: ["Giá thấp khi lợi suất cao.", "TLT giảm sâu tức trái phiếu dài đang trả lợi suất cao: nếu suy thoái đến, đây là tài sản tăng giá mạnh nhất."] },
  gold_spx: { what: "Vàng chia S&P 500: tài sản phòng thủ so với tài sản tăng trưởng. Tăng là vàng thắng cổ phiếu.", hi: ["Thị trường sợ hãi, cổ phiếu yếu.", "Có thể là lúc cổ phiếu rẻ tương đối so với vàng (1980, 2011)."], lo: ["Cổ phiếu đã thắng vàng nhiều năm.", "Vàng rẻ tương đối so với cổ phiếu: đáy tỷ lệ năm 1999-2000 là điểm vào vàng của thập kỷ."] },
  vnm: { what: "Quỹ ETF VanEck Vietnam (VNM) niêm yết ở Mỹ, đo bằng USD: gần nhất với VN-Index mà nguồn miễn phí có được. Gồm cả biến động tỷ giá.", hi: ["Dòng tiền nóng dễ rút khi USD mạnh lên.", "Xu hướng tăng: nhà đầu tư ngoại đang quay lại."], lo: ["Thị trường cận biên dễ bị bán tháo khi rủi ro toàn cầu tăng.", "Việt Nam thường rẻ nhất khi ngoại bán ròng kéo dài: vùng gom của người kiên nhẫn."] },
  usdvnd: { what: "Số đồng Việt Nam đổi 1 USD (tỷ giá liên ngân hàng). Tăng là VND mất giá.", hi: ["VND mất giá nhanh: ngoại rút vốn, NHNN phải hút tiền, lãi suất trong nước khó giảm.", "Có lợi cho xuất khẩu và doanh nghiệp có doanh thu USD."], lo: ["", "VND ổn định hoặc lên giá: NHNN có dư địa nới tiền tệ, tốt cho cổ phiếu."] },
  copper_gold: { what: "Đồng chia vàng: tăng trưởng so với sợ hãi. Thường đi cùng lợi suất 10 năm Mỹ.", hi: ["", "Kinh tế lạc quan, lợi suất thường tăng."], lo: ["Kinh tế bi quan, lợi suất thường giảm.", ""] },
  spx_real: { what: "S&P 500 điều chỉnh theo lạm phát (giá hôm nay). Cho thấy có những thập kỷ thị trường không tăng thực (1966-1982, 2000-2013).", hi: ["", ""], lo: ["", ""] },
};

/* Generic reading of a crop balance sheet (WASDE). */
window.KB_AGRI = {
  what: "Tỷ lệ tồn kho cuối vụ trên tổng sử dụng (stocks-to-use) là con số quan trọng nhất của báo cáo WASDE: còn lại bao nhiêu phần trăm nhu cầu một năm khi vụ mới đến. Giá nông sản đi ngược tỷ lệ này.",
  hi: ["Dư thừa: giá thấp, nông dân thua lỗ.", "Giá thấp là thuốc chữa giá thấp: diện tích trồng sẽ giảm, nhà chăn nuôi, chế biến có đầu vào rẻ. Thường là vùng tích lũy dài hạn cho nông sản."],
  lo: ["Thiếu hụt: một vụ mất mùa có thể làm giá tăng vọt; lạm phát thực phẩm, nước nhập khẩu lương thực chịu thiệt.", "Nông dân và nước xuất khẩu hưởng lợi; giá cao kéo theo mở rộng diện tích vụ sau."],
};

/* Investment-clock phases (growth momentum x inflation momentum). */
window.KB_PHASE = {
  recovery: { name: "PHỤC HỒI", sub: "tăng trưởng ↑, lạm phát ↓", best: "Cổ phiếu", txt: "Kinh tế tăng tốc trong khi lạm phát còn dịu, ngân hàng trung ương chưa vội siết. Lịch sử: cổ phiếu cho lợi nhuận tốt nhất. Mặt trái: dễ chủ quan, định giá tăng nhanh." },
  overheat: { name: "QUÁ NÓNG", sub: "tăng trưởng ↑, lạm phát ↑", best: "Hàng hóa", txt: "Kinh tế chạy trên công suất, lạm phát lên, ngân hàng trung ương tăng lãi. Hàng hóa và tài sản thực thường dẫn đầu; trái phiếu kém nhất. Mặt trái: đây là pha cuối của mở rộng." },
  stagflation: { name: "ĐÌNH LẠM", sub: "tăng trưởng ↓, lạm phát ↑", best: "Tiền mặt", txt: "Tăng trưởng chậm lại nhưng lạm phát còn cao, ngân hàng trung ương khó cắt lãi. Tiền mặt (lãi cao) thường thắng. Mặt cơ hội: đây là lúc người cầm tiền chuẩn bị đạn để mua khi pha tiếp theo đến." },
  reflation: { name: "SUY GIẢM", sub: "tăng trưởng ↓, lạm phát ↓", best: "Trái phiếu", txt: "Kinh tế yếu, lạm phát giảm, ngân hàng trung ương cắt lãi. Trái phiếu dài thường thắng; cổ phiếu tạo đáy ở cuối pha này, trước khi số liệu kinh tế tốt lên. Đây là pha tài sản tốt bị bán rẻ nhất." },
};
