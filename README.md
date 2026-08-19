# Xiaozhi Dashboard Lite (Serverless: Vercel + Supabase)

Phiên bản rút gọn siêu nhẹ của hệ thống giám sát và cấu hình loa thông minh Xiaozhi.
Hệ thống này được thiết kế để chạy hoàn toàn trên nền tảng **Serverless** (Vercel Frontend & Serverless Functions + Supabase Database) nhằm xử lý lượng tải lớn từ **1500+ thiết bị** với chi phí vận hành $0.

## Tính năng chính
1. **Sync thiết bị siêu tốc**: Sử dụng cơ chế lập trình bất đồng bộ (`asyncio.gather` + `httpx`) gọi song song API Xiaozhi để lấy MAC address & status. Sync 1500 thiết bị mất chưa đầy 10 giây (tránh bị timeout trên Vercel).
2. **Đổ cấu hình hàng loạt**: Chọn nhiều thiết bị trên trang Admin, đổi Prompt AI, ngôn ngữ, giọng đọc và áp dụng xuống loa tức thì qua API.
3. **Quét QR Code đổi cấu hình nhanh**: Cho phép người dùng quét QR trên loa để truy cập trang web di động, lựa chọn chế độ học/chơi (English Mode, Kể chuyện tiếng Việt, Trợ lý song ngữ) và cập nhật cấu hình loa ngay lập tức.
4. **Không lưu trữ lịch sử nặng**: Loại bỏ lưu trữ log chat và download file âm thanh để hệ thống hoạt động nhẹ nhàng nhất.

---

## Hướng dẫn Setup & Chạy Local

### 1. Khởi tạo môi trường
```bash
# Di chuyển vào thư mục dự án
cd Xiaozhi_Dashboard_Lite

# Cài đặt thư viện Frontend
npm install

# Khởi tạo môi trường ảo Python và cài đặt Backend dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt
```

### 2. Chạy ứng dụng
Dự án được cấu hình chạy song song cả Frontend và Backend cục bộ:

- **Chạy Backend (FastAPI)**:
  ```bash
  source .venv/bin/activate
  uvicorn api.index:app --host 127.0.0.1 --port 8000 --reload
  ```
  API Health check: `http://127.0.0.1:8000/api/health`

- **Chạy Frontend (Vite + React)** (Mở terminal mới):
  ```bash
  npm run dev
  ```
  Truy cập Dashboard: `http://localhost:5173`

*Lưu ý*: Lần đầu tiên khởi chạy, nếu cơ sở dữ liệu trống, hệ thống sẽ **tự động kích hoạt tài khoản Demo Mock** và sinh ra danh sách 30+ loa ảo để bạn trải nghiệm thử toàn bộ tính năng Đổ cấu hình và quét QR mà không cần token thật.

---

## Cấu hình kết nối Supabase (Khi chạy Production)

1. Tạo một cơ sở dữ liệu PostgreSQL miễn phí trên [Supabase](https://supabase.com/).
2. Tạo file `.env` tại thư mục gốc dự án:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
   ```
3. Khi khởi chạy, SQLAlchemy sẽ tự động khởi tạo các bảng cần thiết (`devices`, `xiaozhi_accounts`) vào Supabase của bạn.

---

## Hướng dẫn Deploy lên Vercel (1-Click)

Dự án đã được cấu trúc dạng Monorepo chuẩn Vercel (Frontend tại root, Serverless Functions tại thư mục `/api`).

1. Cài đặt Vercel CLI hoặc kết nối Github của bạn với Vercel dashboard.
2. Thêm biến môi trường `DATABASE_URL` (trỏ tới Supabase) trong phần thiết lập Environment Variables trên Vercel.
3. Chạy lệnh:
   ```bash
   vercel --prod
   ```
   Vercel sẽ tự động build frontend React và biên dịch thư mục `/api` thành các Serverless Functions chạy Python.
