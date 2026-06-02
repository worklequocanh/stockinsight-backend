# StockInsight Backend

Dự án Backend cho hệ thống quản lý hàng hóa và phân tích bán hàng StockInsight, được xây dựng bằng Node.js, Express, và Prisma.

## Công nghệ sử dụng
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database ORM**: Prisma (PostgreSQL)
- **Authentication**: JWT, bcryptjs
- **Middleware**: Cors, Helmet, Morgan, Error Handler

## Cấu trúc thư mục chính
```text
├── prisma/               # Cấu hình Prisma schema và Database seed
├── src/
│   ├── config/           # Cấu hình môi trường và kết nối DB
│   ├── controllers/      # Xử lý logic nghiệp vụ cho các API route
│   ├── middleware/       # Bộ lọc xử lý request và handle lỗi
│   ├── routes/           # Định tuyến các API endpoint
│   ├── utils/            # Các hàm tiện ích (ApiResponse, v.v.)
│   ├── app.js            # Cấu hình Express app
│   └── server.js         # Entry point khởi tạo server
```

## Yêu cầu môi trường
Tạo file `.env` ở thư mục gốc dự án dựa trên file `.env.example`:
```ini
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockinsight?schema=public"
JWT_SECRET="your-secret-key"
CORS_ORIGIN="http://localhost:5173"
```

## Cài đặt và Khởi chạy

1. **Cài đặt các gói phụ thuộc**:
   ```bash
   npm install
   ```

2. **Cấu hình Database và sinh Client**:
   Chạy các lệnh Prisma để thiết lập database:
   ```bash
   # Tạo migrations và cập nhật cơ sở dữ liệu
   npm run prisma:migrate

   # Sinh Prisma Client
   npm run prisma:generate

   # Nạp dữ liệu mẫu ban đầu (seeding)
   npm run prisma:seed
   ```

3. **Khởi chạy ứng dụng**:
   - Ở chế độ Development (tự động tải lại khi đổi code):
     ```bash
     npm run dev
     ```
   - Ở chế độ Production:
     ```bash
     npm run start
     ```
