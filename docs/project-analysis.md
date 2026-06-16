# Phân tích Tổng quan Dự án StockInsight Backend

Dưới đây là bản phân tích chi tiết về kiến trúc, công nghệ và cơ sở dữ liệu của dự án StockInsight Backend.

## 1. Thông tin chung
- **Tên dự án:** StockInsight (Hệ thống quản lý kho hàng)
- **Vai trò:** Backend API server cung cấp dữ liệu và xử lý nghiệp vụ cho Frontend.
- **Trạng thái:** Dự án đồ án thực tập (đã phát triển đến Phase 7 - Giai đoạn kiểm thử, tối ưu và deploy).
- **Phương pháp quản lý kho:** FEFO (First Expired First Out - Hết hạn trước xuất trước).

## 2. Công nghệ sử dụng (Tech Stack)
- **Ngôn ngữ / Môi trường:** Node.js
- **Framework:** Express.js (`express` v5.2.1)
- **Cơ sở dữ liệu:** PostgreSQL (kết nối qua thư viện `pg`)
- **ORM (Object-Relational Mapping):** Prisma (`@prisma/client` v7.8.0)
- **Xác thực & Bảo mật:** 
  - `jsonwebtoken` (JWT) cho Authentication.
  - `bcryptjs` để mã hóa mật khẩu.
  - `helmet` để bảo mật các HTTP headers.
  - `cors` để xử lý Cross-Origin Resource Sharing.
- **Tài liệu API:** `swagger-ui-express` và `swagger-jsdoc` để tự động tạo Swagger UI.
- **Công cụ hỗ trợ:** `dotenv` (quản lý biến môi trường), `morgan` (log HTTP request), `nodemon` (hot-reload khi quá trình development).

## 3. Cấu trúc Cơ sở dữ liệu (Prisma Schema)
Hệ thống được thiết kế chặt chẽ với các thực thể (models) chính phục vụ quản lý kho:

- **`User` (Người dùng):** Phân quyền hệ thống theo `Role` (`ADMIN`, `WAREHOUSE_MANAGER`, `EMPLOYEE`). Lưu trữ thông tin đăng nhập và liên kết trực tiếp với các phiếu nhập/xuất mà user đó tạo hoặc duyệt.
- **`Category` (Danh mục):** Phân loại sản phẩm.
- **`Supplier` (Nhà cung cấp):** Thông tin các đơn vị cung cấp hàng hóa cho kho.
- **`Product` (Sản phẩm):** Chứa thông tin cơ bản của hàng hóa (SKU, barcode, giá vốn, giá bán, số lượng tồn kho hiện tại, tồn kho tối thiểu). Liên kết với `Category` và `Supplier`.
- **`StockBatch` (Lô hàng):** Quản lý chi tiết tồn kho theo lô, bao gồm `lotNumber` (số lô) và `expiryDate` (ngày hết hạn). Đây là bảng cốt lõi để phục vụ cho thuật toán xuất kho FEFO.
- **`ImportReceipt` & `ImportItem` (Phiếu nhập & Chi tiết nhập):** Quản lý quá trình nhập hàng từ nhà cung cấp. Trạng thái phiếu bao gồm `PENDING`, `APPROVED`, `REJECTED`.
- **`ExportReceipt` & `ExportItem` (Phiếu xuất & Chi tiết xuất):** Quản lý quá trình xuất hàng, hỗ trợ nhiều loại xuất (`SALE`, `INTERNAL`, `DAMAGED`, `TRANSFER`). Trạng thái phiếu tương tự phiếu nhập. Đặc biệt, chi tiết xuất sẽ trừ thẳng số lượng vào các `StockBatch` (lô hàng) cụ thể dựa trên FEFO.

## 4. Cấu trúc Mã nguồn
Thư mục `src/` được tổ chức theo mô hình chuẩn MVC / Controller-Service-Route, giúp dễ dàng bảo trì và mở rộng:
- `config/`: Chứa các file cấu hình hệ thống (ví dụ: cấu hình Swagger, Database).
- `controllers/`: Nơi chứa logic xử lý request/response cho từng API (nghiệp vụ).
- `middleware/`: Chứa các hàm can thiệp vào request (ví dụ: kiểm tra xác thực JWT, phân quyền user, xử lý lỗi chung).
- `routes/`: Định nghĩa các endpoint API và điều hướng (routing) tới các controllers tương ứng.
- `utils/`: Các hàm tiện ích, helper function dùng chung cho toàn bộ dự án.
- `app.js` & `server.js`: File điểm vào (entry point) khởi tạo ứng dụng Express và lắng nghe kết nối server.

## 5. Triển khai (Deployment)
Dự án đã được tích hợp sẵn các cấu hình để dễ dàng triển khai lên môi trường Production:
- Tích hợp file `render.yaml` giúp triển khai tự động (CI/CD cơ bản) lên nền tảng **Render.com**.
- File `package.json` định nghĩa sẵn các scripts cần thiết cho quy trình build và deploy như `prisma:generate`, `db:push`, và `prisma:seed` để thiết lập CSDL và nạp dữ liệu mẫu trên production.
