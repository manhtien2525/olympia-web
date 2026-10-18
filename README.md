# 🏆 GC App - Olympia Web Edition (v2.4.3)

> Bản chuyển đổi Web trực tuyến được tái hiện **100% bám sát theo bộ phần mềm gốc GC App v2.4.3** (Tác giả: Nguyễn Văn Giang).

---

## 🌟 Các Tính Năng & UI/UX Bám Sát Bản Gốc GC App v2.4.3

### 1. Đồ Họa & Tài Nguyên Gốc Được Trích Xuất 100%:
- **Hình nền từng phần thi**: `background.jpg` (Sảnh chờ & Khởi Động), `backgroundv2.jpg` (VCNV), `backgroundv3.png` (Tăng Tốc), `backgroundv4.jpg` (Về Đích), `backgroundpractice.jpg` (Câu Hỏi Phụ).
- **Bộ 5 miếng ghép VCNV**: `topleft.png`, `topright.png`, `bottomleft.png`, `bottomright.png`, `center.png` và số `1.png`, `2.png`, `3.png`, `4.png`.
- **Hiệu ứng Ngôi sao hy vọng**: `star.gif` nguyên bản.
- **Toàn bộ kho âm thanh**: `MainTime.mp3`, `Claim.mp3`, `CorrectAnswer.mp3`, `WrongAnswer.mp3`, `15Seconds.mp3`, `StarChoose.mp3`, `EndSound.mp3`,...

---

### 2. Bàn Điều Khiển Host (Đầy đủ 8 Tab theo GC App gốc):
1. **Sảnh Chờ (Lobby)**: Tắt toàn bộ âm thanh, màn hình Viewer trở về sảnh chờ, hiển thị trạng thái kết nối các Client (Host, MC, 4 Thí Sinh, Viewer).
2. **Xem Đề Thi (Preview Question)**: Xem trước toàn bộ dữ liệu đề thi đã nạp của cả 4 phần thi và câu hỏi phụ.
3. **Bảng Điểm Hình Ảnh (Scoreboard Image)**: Tổng kết điểm kèm ảnh chân dung 4 thí sinh, tên trường học, điểm số, nút phát nhạc tổng kết và kết thúc.
4. **Khởi Động**: Dropdown chọn lượt thi (Thí sinh 1, 2, 3, 4 hoặc Lượt chung), nút `...` (âm khoảng trống), nút nhạc mở màn, nhạc hết lượt, nút "Mở giành quyền", nút "Đúng" (+10đ), "Sai" (-5đ lượt chung).
5. **Vượt Chướng Ngại Vật**: Nút "Hiện/Ẩn hàng ngang", "Hiện câu hỏi", "Lật ô" (mở từng miếng ghép), "Đếm thời gian (15s)", "Hiện/Ẩn câu trả lời thí sinh", "Ghi điểm CNV" (+60/40/30/20/10), nút "Loại" thí sinh trả lời sai CNV.
6. **Tăng Tốc**: Nút câu 1, 2, 3, 4, đếm giờ (20s/30s/40s), "Hiện câu trả lời", nút "Tự động ghi điểm" (tự tính 40-30-20-10 điểm theo thời gian gửi nhanh nhất).
7. **Về Đích**: Chọn thí sinh thi, "Giao diện chọn gói" (20, 30 điểm), nút "Ngôi sao hy vọng", đếm giờ câu hỏi, "Đếm giờ giành quyền (5s)", tính điểm đúng/sai theo luật Sao và cướp điểm.
8. **Câu Hỏi Phụ**: Chọn thí sinh hòa điểm tham gia, đếm giờ 15s. Nếu thí sinh bấm chuông trước khi Host đếm giờ thì bị tính **Phạm Quy** và cảnh báo trên màn hình; khi có hiệu lệnh, ai bấm trước sẽ tạm dừng giờ để trả lời.

---

### 3. Màn Hình Thí Sinh:
- Nút bấm chuông **Giành Quyền** to, nhạy, rung điện thoại khi mở.
- Ô nhập và gửi đáp án trong phần thi VCNV & Tăng Tốc.
- **Tính năng Bảng điểm cá nhân**: Cho phép mở cửa sổ pop-up điểm số riêng biệt để kéo sang màn hình phụ (theo mục II.3.I trong sách hướng dẫn).
- Cảnh báo phạm quy khi bấm chuông trước giờ ở phần thi Câu hỏi phụ.

---

### 4. Màn Hình MC:
- Xem kịch bản câu hỏi, đáp án chi tiết, chú thích gợi ý.
- Theo dõi thứ tự bấm chuông thời gian thực.
- Xem câu trả lời thí sinh gửi lên theo từng mili-giây.

---

### 5. Màn Hình Viewer / Sân Khấu:
- Tự động đổi hình nền theo từng vòng thi chuẩn phong cách GC App.
- Animation lật 5 miếng ghép VCNV che giấu bức tranh trung tâm.
- Màn hình chọn gói câu hỏi Về Đích.
- Bảng podium 4 thí sinh với điểm số to rõ, hiệu ứng ngôi sao hy vọng `star.gif` và highlight khi bấm chuông.

---

## 👥 Danh Sách Tài Khoản Mặc Định

| Tài khoản | Mật khẩu | Quyền hạn |
| :---: | :---: | :--- |
| **`host`** | `123` | Ban Tổ Chức (Host) |
| **`mc`** | `123` | MC Dẫn Chương Trình |
| **`thisinh1`** &rarr; **`thisinh4`** | `123` | Thí Sinh 1, 2, 3, 4 |
| **`viewer`** | `123` | Màn Hình Sân Khấu (Khán giả) |

---

## 🚀 Khởi Động Nhanh

```bash
cd "D:\VS\GC_App_Web"
npm start
```

- Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để sử dụng.
