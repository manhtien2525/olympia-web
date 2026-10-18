# 🏆 Olympia Web Contest Platform (v2.4.3 Web Edition)

Hệ thống thi đấu trực tuyến Đường Lên Đỉnh Olympia đa nền tảng, kế thừa toàn bộ âm thanh, đồ họa và đề thi từ bộ phần mềm **GC App v2.4.3**.

---

## 👥 Danh Sách Tài Khoản & Phân Quyền (Tạo Sẵn)

Hệ thống được thiết lập sẵn các tài khoản đăng nhập tương ứng với 4 vai trò:

| Tài khoản (Username) | Mật khẩu (Password) | Vai trò (Role) | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **`host`** | `123` | **Ban Tổ Chức (Host)** | Nạp đề thi Excel, chuyển vòng, bấm giờ, mở/khóa chuông, cộng trừ điểm, bật âm thanh/trailer |
| **`mc`** | `123` | **MC Dẫn Chương Trình** | Kịch bản câu hỏi, xem đáp án chuẩn, theo dõi thí sinh bấm chuông & đáp án gửi lên |
| **`thisinh1`** | `123` | **Thí Sinh 1** | Màn hình thi đấu, nút bấm chuông buzzer siêu nhạy, ô gõ câu trả lời, xem điểm số |
| **`thisinh2`** | `123` | **Thí Sinh 2** | Tương tự Thí sinh 1 |
| **`thisinh3`** | `123` | **Thí Sinh 3** | Tương tự Thí sinh 1 |
| **`thisinh4`** | `123` | **Thí Sinh 4** | Tương tự Thí sinh 1 |
| **`viewer`** | `123` | **Màn Hình Sân Khấu** | Trình chiếu trường quay, animation câu hỏi, đồng hồ đếm ngược, lật ô chữ VCNV, bảng điểm |

> [!TIP]
> Khán giả cũng có thể xem trực tiếp màn hình sân khấu tại địa chỉ `/viewer` mà không cần đăng nhập.

---

## 🚀 1. Hướng Dẫn Chạy Thử Trên Máy Tính (Local)

1. Mở PowerShell hoặc Terminal tại thư mục `D:\VS\GC_App_Web`.
2. Khởi động máy chủ:
   ```bash
   npm start
   ```
3. Mở trình duyệt web truy cập:
   - **Trang Đăng Nhập**: [http://localhost:3000](http://localhost:3000)
   - **Bàn Điều Khiển Host**: [http://localhost:3000/host](http://localhost:3000/host)
   - **Màn Hình MC**: [http://localhost:3000/mc](http://localhost:3000/mc)
   - **Màn Hình Thí Sinh**: [http://localhost:3000/thisinh](http://localhost:3000/thisinh)
   - **Màn Hình Sân Khấu (Viewer)**: [http://localhost:3000/viewer](http://localhost:3000/viewer)

---

## 🌐 2. Hướng Dẫn Đưa Lên Mạng (Deploy Online Miễn Phí)

### Cách 1: Triển khai lên Render.com (Khuyên dùng - Miễn phí 100%, có link HTTPS)

1. Đăng ký tài khoản miễn phí tại [https://render.com](https://render.com) (đăng nhập bằng GitHub).
2. Tạo một Repository mới trên GitHub của bạn và đẩy thư mục `D:\VS\GC_App_Web` lên:
   ```bash
   git init
   git add .
   git commit -m "Olympia Web Contest initial commit"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/olympia-web.git
   git push -u origin main
   ```
3. Trên giao diện **Render Dashboard**:
   - Nhấn **New +** -> Chọn **Web Service**.
   - Chọn GitHub Repository bạn vừa tạo (`olympia-web`).
   - Cấu hình:
     - **Name**: `olympia-app` (hoặc tên tùy thích)
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free`
   - Nhấn **Deploy Web Service**.
4. Sau 2-3 phút, bạn sẽ nhận được đường link công khai:
   👉 **`https://olympia-app.onrender.com`**
   *(Mọi người ở bất cứ đâu trên thế giới đều có thể truy cập bằng điện thoại, máy tính).*

---

### Cách 2: Phát trực tiếp từ máy tính ra Internet bằng Cloudflare Tunnel (Không cần đẩy lên Git)

Nếu bạn muốn chạy trực tiếp máy chủ từ laptop của mình nhưng gửi link cho bạn bè qua Internet:
1. Tải công cụ **Cloudflare Tunnel (`cloudflared`)**:
   ```bash
   winget install Cloudflare.cloudflared
   ```
2. Chạy server web:
   ```bash
   npm start
   ```
3. Mở một cửa sổ PowerShell khác và gõ:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
4. Cloudflare sẽ tạo cho bạn một đường dẫn HTTPS miễn phí (ví dụ: `https://rapidly-lucky-xyz.trycloudflare.com`). Bạn gửi link này cho MC, Thí sinh và Khán giả là có thể chơi ngay lập tức!
