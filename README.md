# StockInsight

Hệ thống quản lý kho hàng - Đồ án thực tập (Giai đoạn 1 - 7)

## Các giai đoạn đã hoàn thành

- **Phase 1 & 2**: Khởi tạo dự án, thiết lập CSDL (Prisma + PostgreSQL), JWT Authentication, CRUD cơ bản.
- **Phase 3**: Quản lý Nhập kho (Import) & Xuất kho (Export) với phương pháp FEFO (First Expired First Out).
- **Phase 4**: Cải thiện giao diện với bố cục Dashboard chuẩn (Sidebar, Tabs), chia nhỏ component, tăng trải nghiệm người dùng (UX/UI).
- **Phase 5**: Bản địa hóa (Localization) toàn bộ ứng dụng sang Tiếng Việt.
- **Phase 6**: Tồn kho, cảnh báo và Dashboard trực quan (Chart.js).
- **Phase 7**: Kiểm thử, Tối ưu và Deploy (Hoàn thiện toàn bộ).
  - Viết tài liệu Kịch bản kiểm thử (Test Cases).
  - Hoàn thiện dữ liệu Demo phong phú (6 tháng giao dịch).
  - Cấu hình file triển khai tự động (Render, Vercel).

## Hướng dẫn Triển khai (Deploy lên Production)

Dự án được cấu hình sẵn để dễ dàng deploy miễn phí lên **Render** (cho Backend + DB) và **Vercel** (cho Frontend).

### 1. Triển khai Backend (Render.com)
1. Đăng ký tài khoản tại [Render](https://render.com).
2. Tạo một **PostgreSQL Database** mới (đợi Render tạo xong, lấy chuỗi kết nối - `Internal Database URL`).
3. Tạo một **Web Service**, kết nối với Repository Github `stockinsight-backend`.
4. Render sẽ tự động đọc file `render.yaml` trong repo và cài đặt ứng dụng Node.js.
5. Truy cập phần **Environment** của Web Service, điền giá trị cho các biến:
   - `JWT_SECRET`: Một chuỗi bí mật (ví dụ: `my-super-secret-key-123`).
   - `DATABASE_URL`: Lấy từ bước 2.
   - `CORS_ORIGIN`: Tạm để `*` (Sau khi deploy xong Frontend, hãy quay lại đây cập nhật thành URL của Frontend).
6. Ở bước `Build Command`, Render sẽ tự chạy `npm install` và bạn cần chạy `npm run prisma:generate && npm run db:push && npm run prisma:seed`. (Hoặc truy cập Shell của Render để chạy `npx prisma db push` và `npm run prisma:seed`).

### 2. Triển khai Frontend (Vercel.com)
1. Đăng ký tài khoản tại [Vercel](https://vercel.com).
2. Chọn **Add New Project**, liên kết với Repository Github `stockinsight-frontend`.
3. Vercel tự động nhận diện đây là dự án `Vite` (mặc định Framework Preset là Vite).
4. Mở phần **Environment Variables**, thêm biến:
   - `VITE_API_URL`: Điền URL của Backend vừa deploy ở bước trên (ví dụ: `https://stockinsight-backend.onrender.com/api`).
5. Bấm **Deploy**. Vercel sẽ đọc file `vercel.json` để cấu hình Rewrite URL cho React Router.

---

## Cài đặt và Chạy ứng dụng (Local)

### Yêu cầu
- Node.js
- PostgreSQL
- WSL (Dành cho Windows)

### 1. Cài đặt Backend
```bash
cd stockinsight-backend
npm install
# Tạo file .env và cấu hình DATABASE_URL (Ví dụ: postgresql://user:pass@localhost:5432/stockinsight)
npx prisma migrate dev
npm run prisma:seed # Nạp dữ liệu mẫu
npm run dev
```

### 2. Cài đặt Frontend
```bash
cd stockinsight-frontend
npm install
# Tạo file .env và thiết lập VITE_API_URL=http://localhost:3001/api
npm run dev
```

### 3. Tài khoản Demo
- **Admin**: `admin@stockinsight.local` / `admin123`
- **Manager**: `manager@stockinsight.local` / `admin123`
- **Employee**: `employee@stockinsight.local` / `admin123`
