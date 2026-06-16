# Kế hoạch Mở rộng Tính năng (Feature Extension Plan)

Tài liệu này phác thảo kế hoạch và thiết kế cơ sở dữ liệu (Prisma Schema) để triển khai các tính năng cơ bản và nâng cao còn thiếu của hệ thống StockInsight, giúp dự án tiến gần hơn với một WMS thực tế.

---

## 1. Quản lý Khách hàng (Customers)
Để phục vụ việc xuất bán, cần biết sản phẩm được xuất cho ai nhằm mục đích theo dõi doanh số, công nợ và hỗ trợ sau bán hàng.

**Cập nhật Prisma Schema:**
```prisma
model Customer {
  id            String          @id @default(uuid())
  name          String
  phone         String?
  email         String?         @unique
  address       String?
  exportReceipts ExportReceipt[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

// Thêm vào model ExportReceipt
model ExportReceipt {
  // ... các field cũ
  customerId    String?         // Dành cho loại xuất SALE
  customer      Customer?       @relation(fields: [customerId], references: [id])
}
```
**Công việc cần làm:**
1. Tạo Controller & Route CRUD cho `Customer`.
2. Sửa đổi API tạo Phiếu Xuất: Cho phép truyền `customerId` nếu `exportType` là `SALE`.

---

## 2. Kiểm kê kho (Stocktake / Inventory Check)
Cho phép tạo phiếu kiểm kê định kỳ. Nhân viên đi đếm số lượng thực tế và đối chiếu với hệ thống.

**Cập nhật Prisma Schema:**
```prisma
enum CheckStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  CANCELED
}

model InventoryCheck {
  id          String               @id @default(uuid())
  code        String               @unique
  status      CheckStatus          @default(DRAFT)
  note        String?
  createdById String
  createdBy   User                 @relation(fields: [createdById], references: [id])
  items       InventoryCheckItem[]
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
}

model InventoryCheckItem {
  id               String         @id @default(uuid())
  inventoryCheckId String
  productId        String
  stockBatchId     String?        // Kiểm kê chi tiết theo lô
  systemQty        Int            // Số lượng trên hệ thống lúc tạo phiếu
  actualQty        Int?           // Số lượng thực tế đếm được
  difference       Int?           // actualQty - systemQty
  inventoryCheck   InventoryCheck @relation(fields: [inventoryCheckId], references: [id])
  product          Product        @relation(fields: [productId], references: [id])
  batch            StockBatch?    @relation(fields: [stockBatchId], references: [id])
}
```
**Công việc cần làm:**
1. Tạo API khởi tạo phiếu kiểm kê (Snaphot số lượng hiện tại).
2. Tạo API cập nhật số lượng thực tế (`actualQty`).
3. Tạo API chốt kiểm kê (Hoàn thành): Tự động sinh ra các phiếu "Nhập điều chỉnh" (nếu thiếu) hoặc "Xuất điều chỉnh" (nếu thừa) để cân bằng `currentStock` và số lượng trong `StockBatch`.

---

## 3. Quản lý Vị trí lưu kho (Locations)
Giúp nhân viên biết chính xác hàng đang nằm ở đâu trong kho (Khu vực, Kệ, Tầng).

**Cập nhật Prisma Schema:**
```prisma
model Location {
  id          String       @id @default(uuid())
  code        String       @unique // VD: A1-R2-S3 (Khu A1, Rack 2, Shelf 3)
  name        String
  description String?
  batches     StockBatch[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

// Thêm vào model StockBatch
model StockBatch {
  // ... các field cũ
  locationId  String?
  location    Location?    @relation(fields: [locationId], references: [id])
}
```
**Công việc cần làm:**
1. Tạo CRUD cho model `Location`.
2. Khi duyệt phiếu Nhập (Import), yêu cầu (hoặc cho phép) chỉ định `locationId` cho từng `StockBatch` được sinh ra.
3. API lấy chi tiết hàng hóa sẽ kèm theo vị trí để nhân viên dễ đi lấy hàng khi xuất.

---

## 4. Quản lý hàng hoàn trả (Returns)
Quy trình riêng biệt để xử lý hàng khách trả lại.

**Cập nhật Prisma Schema:**
```prisma
enum ReturnStatus {
  PENDING
  INSPECTED
  RETURNED_TO_STOCK
  DISCARDED
}

model ReturnReceipt {
  id              String        @id @default(uuid())
  code            String        @unique
  originalExportId String?      // Tham chiếu đến phiếu xuất bán cũ
  status          ReturnStatus  @default(PENDING)
  reason          String
  createdById     String
  createdBy       User          @relation(fields: [createdById], references: [id])
  items           ReturnItem[]
  createdAt       DateTime      @default(now())
}

model ReturnItem {
  id              String        @id @default(uuid())
  returnReceiptId String
  productId       String
  quantity        Int
  qualityStatus   String        // Tình trạng: "Tốt", "Hư hỏng", "Mất niêm phong"
  returnReceipt   ReturnReceipt @relation(fields: [returnReceiptId], references: [id])
  product         Product       @relation(fields: [productId], references: [id])
}
```
**Công việc cần làm:**
1. Tạo API tạo phiếu trả hàng.
2. Xử lý sau kiểm tra (Inspected): Quyết định cộng lại số lượng vào tồn kho (`RETURNED_TO_STOCK`) hoặc xuất hủy (`DISCARDED`).

---

## 5. Nhật ký Hệ thống (Audit Log)
Theo dõi và lưu vết mọi thay đổi dữ liệu quan trọng để truy cứu trách nhiệm.

**Cập nhật Prisma Schema:**
```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?  // Người thực hiện hành động (có thể null nếu hệ thống tự động)
  action     String   // VD: "CREATE_PRODUCT", "UPDATE_STOCK", "APPROVE_IMPORT"
  resource   String   // Bảng/Thực thể bị tác động (VD: "Product", "ImportReceipt")
  resourceId String?  // ID của thực thể bị tác động
  details    Json?    // Chứa thông tin old_value và new_value
  createdAt  DateTime @default(now())
  
  @@index([resource, resourceId])
  @@index([createdAt])
}
```
**Công việc cần làm:**
1. Tạo một hàm Utility hoặc Middleware để ghi log.
2. Chèn hàm ghi log này vào các API nhạy cảm (Tạo, Cập nhật, Xóa, Duyệt phiếu).
3. API cho Admin xem lịch sử hệ thống.

---
## Các bước triển khai đề xuất
1. **Giai đoạn 1:** Ưu tiên triển khai **Quản lý Khách hàng** vì nó liên quan trực tiếp đến luồng xuất kho (SALE) hiện tại, dễ thực hiện và mang lại hiệu quả ngay.
2. **Giai đoạn 2:** Triển khai **Vị trí lưu kho**. Thay đổi cấu trúc dữ liệu lô hàng (`StockBatch`).
3. **Giai đoạn 3:** Triển khai **Kiểm kê kho** và **Hàng hoàn trả**, yêu cầu logic phức tạp để cân bằng lại dữ liệu.
4. **Giai đoạn 4:** Hoàn thiện **Audit Log** để bảo vệ tính toàn vẹn và theo dõi trách nhiệm.
