# StockInsight Backend

Backend cho hệ thống quản lý hàng hóa và phân tích bán hàng StockInsight.

## Tech Stack
- Node.js
- Express
- Prisma
- PostgreSQL
- JWT
- bcryptjs

## Cấu trúc chính
```text
prisma/          schema, migration, seed
src/config/      env, prisma client
src/controllers/ business logic
src/middleware/  auth, error handler
src/routes/      API routes
src/utils/       helper functions
```

## Cài đặt môi trường
Tạo file `.env` trong thư mục backend:
```ini
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockinsight?schema=public"
JWT_SECRET="change-me-in-production"
CORS_ORIGIN="http://localhost:5173"
```

## Chạy project
```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Phase 2 Auth APIs
- `POST /api/auth/login`
- `GET /api/auth/me`

## Route kiểm tra phân quyền
- `GET /api/protected/auth`
- `GET /api/protected/admin`
- `GET /api/protected/warehouse`
- `GET /api/protected/employee`

## Tài khoản seed
- `admin@stockinsight.local` / `admin123`
- `manager@stockinsight.local` / `admin123`
- `employee@stockinsight.local` / `admin123`

## Health check
- `GET /api/health`

## Ghi chú
- Backend dùng chuẩn response:
  - `success`
  - `message`
  - `data`
- Token JWT được gửi qua header:
  - `Authorization: Bearer <token>`
