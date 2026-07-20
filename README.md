# 📦 StockInsight - Inventory Management System Backend

> Hệ thống quản lý kho hàng chuyên nghiệp - Đồ án thực tập (Giai đoạn 1 - 7).

Ứng dụng Backend cho nền tảng StockInsight, hỗ trợ quản lý nhập/xuất kho theo phương pháp FEFO (First Expired First Out), theo dõi tồn kho theo thời gian thực và cung cấp hệ thống báo cáo, cảnh báo trực quan.

## ✨ Các tính năng nổi bật (Features)

- **🔐 Xác thực & Phân quyền (Authentication & Authorization):** Sử dụng JWT, hỗ trợ nhiều vai trò (Admin, Manager, Employee).
- **📦 Quản lý Nhập/Xuất kho (Import/Export):** Thuật toán xuất kho thông minh áp dụng nguyên tắc **FEFO** (First Expired First Out) để giảm thiểu hao phí hàng hết hạn.
- **📊 Báo cáo & Cảnh báo:** Dashboard theo thời gian thực, quản lý cảnh báo tồn kho, tích hợp Cron Jobs (`node-cron`) để tự động kiểm tra định kỳ.
- **⚡ Real-time Updates:** Hỗ trợ kết nối real-time (`socket.io`) cho các thông báo và cảnh báo cập nhật trực tiếp đến người dùng.
- **🌐 RESTful API & Swagger:** API chuẩn RESTful, được tài liệu hóa tự động bằng Swagger UI.
- **✅ Unit Testing:** Đảm bảo chất lượng bằng các kịch bản test tự động với Jest và Supertest.
- **🌍 Localization:** Hệ thống hỗ trợ đa ngôn ngữ, tối ưu trải nghiệm (Phase 5).

## 🛠 Tech Stack (Công nghệ sử dụng)

- **Runtime Environment:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Testing:** [Jest](https://jestjs.io/), Supertest
- **Tiện ích khác:** `socket.io` (Realtime), `node-cron` (Jobs), `exceljs` (Xuất file Excel), `jsonwebtoken` (Auth), `bcryptjs` (Mã hóa mật khẩu), `helmet` & `cors` (Bảo mật).

## 📂 Cấu trúc dự án (Project Structure)

```text
stockinsight-backend/
├── prisma/             # Schema của Prisma & scripts seed dữ liệu
├── src/                # Source code chính
│   ├── config/         # Cấu hình (Database, Swagger, v.v.)
│   ├── controllers/    # Xử lý logic API (Request/Response)
│   ├── jobs/           # Cron jobs chạy ngầm (ví dụ cảnh báo hàng sắp hết hạn)
│   ├── middleware/     # Các middlewares (Auth, Error handling, Validation)
│   ├── routes/         # Định nghĩa routing API
│   ├── utils/          # Các hàm helper tiện ích
│   ├── app.js          # Khởi tạo Express app và apply middlewares
│   └── server.js       # Khởi động server
├── tests/              # Các bài Unit Test / Integration Test (Jest)
├── .env.example        # Mẫu file biến môi trường
├── package.json        # Định nghĩa dependencies và scripts
└── render.yaml         # Cấu hình deploy tự động trên Render.com
```

## 🚀 Hướng dẫn Cài đặt & Chạy ứng dụng (Local Development)

### Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/) (Khuyến nghị v18+)
- [PostgreSQL](https://www.postgresql.org/) (Đang chạy local hoặc dùng remote database)
- [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) (Khuyến nghị dành cho Windows)

### 1. Cài đặt dependencies

Mở terminal (WSL) và chạy:

```bash
git clone <repository_url>
cd stockinsight-backend
npm install
```

### 2. Thiết lập biến môi trường
Copy file `.env.example` thành `.env` và tùy chỉnh cho phù hợp với môi trường của bạn:

```bash
cp .env.example .env
```

Nội dung file `.env` tham khảo:
```env
PORT=3001
NODE_ENV=development
# Thay đổi thông tin user, pass, db cho đúng với PostgreSQL local của bạn
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockinsight?schema=public"
JWT_SECRET="my-super-secret-key"
CORS_ORIGIN="http://localhost:5173"
```

### 3. Khởi tạo Database với Prisma

```bash
# Đẩy schema vào database để tạo các bảng
npm run db:push

# (Tùy chọn) Hoặc dùng lệnh migrate nếu bạn muốn theo dõi lịch sử schema thay vì push trực tiếp
# npm run prisma:migrate

# Chạy seed để nạp dữ liệu mẫu (Admin, Demo data) vào cơ sở dữ liệu
npm run prisma:seed
```

### 4. Khởi động server

```bash
# Chạy ở chế độ dev (sử dụng nodemon, tự reload khi có thay đổi)
npm run dev

# Hoặc chạy chế độ production
npm start
```
Server backend sẽ chạy mặc định ở `http://localhost:3001`.

## 📜 Tài khoản Demo

Dữ liệu seed cung cấp sẵn các tài khoản sau để bạn đăng nhập thử (mật khẩu chung: `admin123`):
- **Admin**: `admin@stockinsight.local`
- **Manager**: `manager@stockinsight.local`
- **Employee**: `employee@stockinsight.local`

## 📖 Tài liệu API (Swagger UI)

Hệ thống được tích hợp sẵn Swagger để tra cứu và test API một cách trực quan.
Sau khi khởi động server, hãy mở trình duyệt và truy cập:

👉 **[http://localhost:3001/api-docs](http://localhost:3001/api-docs)**

**Cách test API cần xác thực (Protected Routes):**
1. Gọi API `POST /api/auth/login`.
2. Truyền vào email và mật khẩu của tài khoản Demo ở trên, gửi request để nhận về `token`.
3. Nhấn nút **Authorize** có hình ổ khóa ở góc phải trên cùng màn hình Swagger, dán `token` vào, và chọn lưu. Các request tiếp theo sẽ tự động được gửi kèm header Authorization.

## 🧪 Kiểm thử (Testing)

Dự án dùng Jest và Supertest để viết các Unit Tests và API Integration Tests.

```bash
# Thiết lập db test trước (nếu cần thiết)
npm run test:setup

# Chạy tất cả bài test 1 lần
npm run test

# Chạy test ở chế độ theo dõi (phù hợp khi code)
npm run test:watch

# Chạy test và tạo báo cáo độ phủ mã nguồn (coverage report)
npm run test:coverage
```

## ☁️ Hướng dẫn Triển khai (Deploy lên Production với Fly.io & Neon DB)

Dự án đã được thiết lập chuẩn hóa đầy đủ `Dockerfile`, `.dockerignore` và `fly.toml` giúp bạn triển khai Backend lên nền tảng **Fly.io** kết hợp với cơ sở dữ liệu **Neon PostgreSQL** siêu tốc.

### 🚀 Cách 1: Triển khai lên Fly.io (Khuyên dùng - Chuản Enterprise)

**Yêu cầu:** Đã cài đặt [Fly CLI (flyctl)](https://fly.io/docs/hands-on/install-flyctl/) và đăng nhập (`fly auth login`).

1. **Chuản bị Database trên Neon:**
   - Đăng ký/đăng nhập tại [Neon.tech](https://neon.tech), tạo một project PostgreSQL mới.
   - Copy chuỗi kết nối (`Connection String`), ví dụ: `postgresql://neondb_owner:secret@ep-cool-snowflake-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.

2. **Khởi tạo và cấu hình Secrets trên Fly.io:**
   Mở terminal tại thư mục `stockinsight-backend` và chạy các lệnh:
   ```bash
   # Khởi tạo app trên Fly.io (đã có sẵn fly.toml nên không cần ghi đè cấu hình)
   fly launch --no-deploy

   # Cài đặt các biến môi trường bảo mật (Secrets)
   fly secrets set DATABASE_URL="chuỗi_kết_nối_neon_db_của_bạn"
   fly secrets set JWT_SECRET="mật_khẩu_jwt_siêu_bảo_mật_của_bạn"
   fly secrets set CORS_ORIGIN="https://stockinsight.vercel.app,https://stockinsight-frontend.fly.dev,*"
   ```

3. **Triển khai ứng dụng:**
   ```bash
   fly deploy
   ```
   > 💡 **Lưu ý nghiệp vụ:** Trong file `fly.toml` đã thiết lập lệnh `release_command = "npx prisma migrate deploy"`. Mỗi khi `fly deploy` được chạy, hệ thống sẽ tự động cập nhật schema database trên Neon trước khi khởi động container mới!
   > Đồng thời `auto_stop_machines = false` giúp cho **Socket.io** (Realtime) và **Node-cron** (cảnh báo tồn kho tự động) hoạt động liên tục 24/7 không bị gián đoạn.

4. **(Tùy chọn) Nạp dữ liệu mẫu (Seed Data) lần đầu:**
   Nếu đây là lần đầu tiên triển khai lên Neon DB trống, hãy chạy seed qua SSH console của Fly.io:
   ```bash
   fly ssh console -C "npm run prisma:seed"
   ```

---

### 📦 Cách 2: Triển khai lên Render.com (Dự phòng)
Dự án vẫn giữ cấu hình `render.yaml` nếu bạn muốn duy trì trên Render:
1. Tạo Web Service kết nối với Github Repo.
2. Thêm các biến `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` trong mục Environment.
3. Chạy `npx prisma db push` và `npm run prisma:seed` trong mục Shell của Render sau khi build xong.

---
*Ghi chú: Đồ án thực tập (Giai đoạn 1 - 7 - Enterprise WMS & BI).*
