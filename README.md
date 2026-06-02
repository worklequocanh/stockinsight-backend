# StockInsight

Hệ thống quản lý kho hàng - Đồ án thực tập (Giai đoạn 1 - 5)

## Các giai đoạn đã hoàn thành

- **Phase 1 & 2**: Khởi tạo dự án, thiết lập CSDL (Prisma + PostgreSQL), JWT Authentication, CRUD cơ bản.
- **Phase 3**: Quản lý Nhập kho (Import) & Xuất kho (Export) với phương pháp FEFO (First Expired First Out).
- **Phase 4**: Cải thiện giao diện với bố cục Dashboard chuẩn (Sidebar, Tabs), chia nhỏ component, tăng trải nghiệm người dùng (UX/UI).
- **Phase 5**: Bản địa hóa (Localization) toàn bộ ứng dụng sang Tiếng Việt.
  - Chuyển đổi dữ liệu mẫu (Seed Data) sang Tiếng Việt.
  - Dịch toàn bộ thông báo lỗi và thành công từ API Backend sang Tiếng Việt.
  - Dịch toàn bộ giao diện Frontend (Pages, Components) sang Tiếng Việt.

## Cài đặt và Chạy ứng dụng

### Yêu cầu
- Node.js
- PostgreSQL
- WSL (Dành cho Windows)

### 1. Cài đặt Backend
```bash
cd stockinsight-backend
npm install
# Cấu hình .env với DATABASE_URL
npx prisma migrate dev
npx prisma db seed # Nạp dữ liệu mẫu
npm run dev
```

### 2. Cài đặt Frontend
```bash
cd stockinsight-frontend
npm install
npm run dev
```

### 3. Tài khoản Demo
- **Admin**: `admin@stockinsight.local` / `admin123`
- **Manager**: `manager@stockinsight.local` / `admin123`
- **Employee**: `employee@stockinsight.local` / `admin123`
