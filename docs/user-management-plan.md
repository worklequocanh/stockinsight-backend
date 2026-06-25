# Kế hoạch Quản lý Tài khoản (User Management)

Tài liệu này phác thảo thiết kế và các bước triển khai phân hệ quản lý tài khoản người dùng cho StockInsight, bao gồm cả Backend và Frontend.

---

## 1. Tổng quan phân quyền

| Role | Mô tả | Quyền tiêu biểu |
|------|-------|----------------|
| ADMIN | Quản trị viên hệ thống | Toàn quyền: quản lý user, xem audit log, duyệt phiếu, CRUD tất cả |
| WAREHOUSE_MANAGER | Quản lý kho | Duyệt/từ chối nhập/xuất, CRUD master data, xem báo cáo |
| EMPLOYEE | Nhân viên kho | Tạo phiếu nhập/xuất, kiểm kê, trả hàng. Không được duyệt |

Không thêm role mới — 3 role hiện tại đã đủ cho WMS.

---

## 2. Backend — Cập nhật Schema & API

### 2.1. Prisma Schema — bổ sung field `isActive`

```prisma
model User {
  id                     String           @id @default(uuid())
  name                   String
  email                  String           @unique
  password               String
  role                   Role             @default(EMPLOYEE)
  isActive               Boolean          @default(true)       // ← THÊM MỚI
  // ... các relation giữ nguyên
}
```

Migration: `npx prisma migrate dev --name add_is_active_to_user`

### 2.2. API mới cần tạo

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/users` | ADMIN | Danh sách user (phân trang, search) |
| GET | `/api/users/:id` | ADMIN | Chi tiết 1 user |
| POST | `/api/users` | ADMIN | Tạo user mới (set password ban đầu) |
| PUT | `/api/users/:id` | ADMIN | Sửa user (name, email, role, isActive) |
| PUT | `/api/users/:id/reset-password` | ADMIN | Admin reset password user |
| PUT | `/api/auth/profile` | ALL | User tự sửa tên hiển thị |
| PUT | `/api/auth/change-password` | ALL | User tự đổi password (cần old password) |

### 2.3. Chi tiết từng endpoint

**POST /api/users** — Tạo user mới
```
Body: { name, email, password, role }
Response: { success, data: { item } }
Validation: email unique, password min 6 chars, role hợp lệ
```

**PUT /api/users/:id** — Cập nhật user
```
Body: { name?, email?, role?, isActive? }
Không được sửa password qua endpoint này
Không cho phép admin tự khóa chính mình
```

**PUT /api/users/:id/reset-password** — Reset password
```
Body: { password }
Admin đặt lại mật khẩu cho user bất kỳ
```

**PUT /api/auth/profile** — Tự sửa profile
```
Body: { name }
User tự sửa tên hiển thị của chính mình
```

**PUT /api/auth/change-password** — Tự đổi password
```
Body: { oldPassword, newPassword }
Phải xác thực oldPassword đúng
newPassword min 6 chars, khác oldPassword
```

### 2.4. Audit Log

Ghi log cho các hành động:
- `CREATE_USER` — khi admin tạo user mới
- `UPDATE_USER` — khi admin sửa user
- `RESET_USER_PASSWORD` — khi admin reset password
- `CHANGE_PASSWORD` — khi user tự đổi password

---

## 3. Backend — Cấu trúc file cần tạo/sửa

### Tạo mới:
```
src/controllers/userController.js   — list, getById, create, update, resetPassword
src/routes/users.js                  — /api/users (ADMIN only)
src/utils/auditLog.js               — đã có, dùng lại
```

### Sửa:
```
prisma/schema.prisma                 — thêm isActive + migration
src/controllers/authController.js    — thêm changePassword, updateProfile
src/routes/auth.js                   — thêm PUT /auth/profile, PUT /auth/change-password
src/routes/index.js                  — đăng ký /api/users
```

---

## 4. Frontend — Giao diện

### 4.1. Trang Quản lý Tài khoản (`UsersPage.jsx`)

Route: `/dashboard/users` — chỉ hiển thị với ADMIN

**Giao diện:**
- Layout giống SuppliersPage: bảng trái + form panel phải
- **Bảng:** Tên, Email, Role (badge màu), Trạng thái (Active/Inactive), Ngày tạo, Thao tác
- **Form panel:**
  - Tên, Email, Role (dropdown), Password (chỉ khi tạo mới)
  - Toggle Active/Inactive
  - Nút Reset Password (chỉ khi sửa) — mở prompt nhập password mới
- Badge role: ADMIN = tím, WAREHOUSE_MANAGER = xanh dương, EMPLOYEE = xám

### 4.2. Trang Hồ sơ cá nhân (`ProfilePage.jsx`)

Route: `/dashboard/profile` — tất cả user đều truy cập được

**Giao diện:**
- Panel đơn giản, không cần sidebar form
- Section 1: **Thông tin cá nhân** — Tên (editable), Email (readonly), Role (readonly)
- Section 2: **Đổi mật khẩu** — Old password, New password, Confirm new password

### 4.3. Sidebar cập nhật

Thêm 2 mục mới:
```
───
Quản lý tài khoản     ← ADMIN only, route /dashboard/users
Nhật ký hệ thống      ← ADMIN only
───
Hồ sơ cá nhân         ← tất cả user, route /dashboard/profile
```

Đặt "Hồ sơ cá nhân" ở gần cuối sidebar, trên phần Đăng xuất.

---

## 5. Frontend — Cấu trúc file cần tạo/sửa

### Tạo mới:
```
src/pages/UsersPage.jsx       — Quản lý tài khoản
src/pages/ProfilePage.jsx     — Hồ sơ cá nhân
```

### Sửa:
```
src/App.jsx                    — thêm 2 route
src/layouts/DashboardLayout.jsx — thêm 2 link sidebar
src/management.css             — thêm badge--role styles
```

---

## 6. Thứ tự triển khai

1. **Backend trước:**
   - Thêm `isActive` vào schema + migration
   - Tạo `userController.js` + `routes/users.js`
   - Thêm `changePassword` + `updateProfile` vào auth controller
   - Ghi audit log cho các hành động
   - Test API bằng Jest

2. **Frontend sau:**
   - `UsersPage.jsx`
   - `ProfilePage.jsx`
   - Cập nhật `App.jsx` + `DashboardLayout.jsx`
   - Build kiểm tra

---

## 7. Tiêu chí hoàn thành

- [ ] Migration `isActive` chạy thành công
- [ ] API users CRUD hoạt động, phân quyền ADMIN
- [ ] API change-password hoạt động, xác thực old password
- [ ] Audit log ghi nhận các hành động user management
- [ ] Test backend pass
- [ ] Giao diện UsersPage: bảng + form CRUD + reset password
- [ ] Giao diện ProfilePage: sửa tên + đổi mật khẩu
- [ ] Sidebar hiển thị đúng theo role
- [ ] Build frontend không lỗi
