# Kế hoạch Triển khai Chi tiết - StockInsight Backend

Tài liệu này phác thảo các công việc cần thực hiện ở phía máy chủ (Backend) nhằm khắc phục các thiếu sót nghiệp vụ, hỗ trợ đầy đủ các phân hệ giao diện (Frontend) và đảm bảo tính nhất quán dữ liệu.

---

## 1. Khắc phục Luồng Xuất Kho & Khách Hàng (Exports & Customers)
Hiện tại, bảng `ExportReceipt` yêu cầu trường `customerId` khi loại xuất kho là `SALE` (Bán hàng).
* **Công việc:**
  * Đảm bảo API `GET /api/exports` và `GET /api/exports/:id` trả về đầy đủ các trường của `customer` (tên, số điện thoại, địa chỉ) để frontend hiển thị.
  * Kiểm tra và tối ưu hóa hiệu năng truy vấn bằng cách bổ sung index trên cột `customerId` nếu lượng dữ liệu lớn.

---

## 2. Nâng cấp Nghiệp Vụ Vị Trí Kho (Locations) vào Luồng Nhập Kho
Hiện tại, khi duyệt phiếu Nhập kho (`approveImport`), hệ thống sinh ra các `StockBatch` nhưng không gán vị trí (`locationId`), khiến trường này luôn có giá trị `null`.
* **Công việc:**
  * **Sửa API Tạo Phiếu Nhập (`POST /api/imports`):**
    * Chấp nhận trường `locationId` (tùy chọn) trong mỗi đối tượng của mảng `items`.
    * Ví dụ payload:
      ```json
      {
        "supplierId": "supplier-uuid",
        "note": "Nhập hàng lô mới",
        "items": [
          {
            "productId": "prod-uuid",
            "quantity": 100,
            "unitPrice": 15000,
            "lotNumber": "LOT2026-01",
            "expiryDate": "2026-12-31",
            "locationId": "loc-uuid"
          }
        ]
      }
      ```
    * Cập nhật schema lưu trữ tạm thời `locationId` trên bảng `ImportItem`. Để làm điều này, ta cần bổ sung trường `locationId String?` vào model `ImportItem` trong `prisma/schema.prisma` và chạy migration.
  * **Sửa API Duyệt Phiếu Nhập (`POST /api/imports/:id/approve`):**
    * Khi tạo bản ghi `StockBatch` từ `ImportItem`, lấy `locationId` từ `ImportItem` để gán vào `StockBatch`.
  * **Bổ sung API Cập Nhật Vị Trí Lô Hàng Trực Tiếp:**
    * Tạo endpoint `PATCH /api/products/batches/:batchId/location` cho phép thủ kho thay đổi vị trí của một lô hàng đang có sẵn trong kho mà không cần tạo lại phiếu nhập.

---

## 3. Hoàn thiện API Báo cáo & Nhật Ký Hoạt Động (Audit Logs)
Bảng `AuditLog` đã được định nghĩa trong cơ sở dữ liệu nhưng chưa có API cho quản trị viên truy vấn.
* **Công việc:**
  * **Tạo Route & Controller cho AuditLog:**
    * Tạo route `GET /api/audit-logs` (chỉ cho phép `Role.ADMIN` truy cập).
    * Hỗ trợ phân trang (`page`, `limit`), tìm kiếm theo hành động (`action`) hoặc tài nguyên bị ảnh hưởng (`resource`).
  * **Tích hợp ghi Log tự động (Helper/Middleware):**
    * Tạo hàm tiện ích `writeAuditLog(userId, action, resource, resourceId, details)`.
    * Tích hợp gọi hàm này tại:
      * Duyệt phiếu nhập kho (`approveImport`)
      * Duyệt phiếu xuất kho (`approveExport`)
      * Hoàn thành kiểm kê kho (`completeInventoryCheck`)
      * Cập nhật trạng thái trả hàng (`updateReturnStatus`)

---

## 4. Kiểm Thử Hệ Thống (Testing)
* **Kiểm thử Tự động:**
  * Viết các ca kiểm thử tích hợp (Integration tests) mới trong thư mục `tests/` để xác nhận:
    * Thao tác tạo phiếu nhập kho có truyền `locationId` hoạt động đúng và tạo ra `StockBatch` đúng vị trí.
    * Thao tác tạo phiếu xuất kho loại `SALE` bắt buộc phải có `customerId` hợp lệ.
    * Quyền truy cập API `/api/audit-logs` bị chặn đối với `WAREHOUSE_MANAGER` và `EMPLOYEE`.
