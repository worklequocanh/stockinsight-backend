# Tài Liệu Kịch Bản Kiểm Thử (Manual Test Cases)

Dự án: **StockInsight - Quản lý Hàng hóa và Tồn kho**
Môi trường kiểm thử: **Local / Production**

---

## 1. Module Xác thực & Phân quyền (Auth & RBAC)

| ID | Kịch bản kiểm tra (Test Scenario) | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Đăng nhập thành công với tài khoản Admin | 1. Vào `/login`<br>2. Nhập `admin@stockinsight.local` / `admin123`<br>3. Bấm Đăng nhập | - Đăng nhập thành công, chuyển hướng đến `/dashboard`.<br>- Thông tin user hiện `ADMIN`. |
| **AUTH-02** | Đăng nhập sai mật khẩu | 1. Nhập email đúng, mật khẩu sai.<br>2. Bấm Đăng nhập | - Báo lỗi "Tài khoản hoặc mật khẩu không đúng".<br>- Không chuyển trang. |
| **AUTH-03** | Truy cập route cấm (Phân quyền) | 1. Đăng nhập bằng tài khoản `EMPLOYEE`.<br>2. Cố gắng vào route của Admin (ví dụ: User Management - *nếu có*). | - Bị chặn truy cập (báo lỗi 403 Forbidden hoặc ẩn menu tương ứng). |
| **AUTH-04** | Tự động chuyển hướng khi chưa login | 1. Không đăng nhập.<br>2. Truy cập trực tiếp `/dashboard`. | - Bị chuyển hướng về trang `/login`. |

---

## 2. Module Dữ liệu Nền (Sản phẩm, Danh mục, Nhà cung cấp)

| ID | Kịch bản kiểm tra (Test Scenario) | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **PROD-01** | Thêm mới sản phẩm thành công | 1. Vào `/dashboard/products`.<br>2. Nhấn "Thêm sản phẩm".<br>3. Điền đầy đủ thông tin (SKU, Tên, Giá, etc.).<br>4. Lưu | - Thông báo thành công.<br>- Sản phẩm xuất hiện ở đầu danh sách. |
| **PROD-02** | Báo lỗi khi trùng SKU | 1. Thêm mới sản phẩm.<br>2. Dùng lại `SKU` của sản phẩm đã tồn tại.<br>3. Lưu | - Backend trả về lỗi "SKU đã tồn tại".<br>- Giao diện hiển thị lỗi tương ứng. |
| **PROD-03** | Sửa thông tin sản phẩm | 1. Chọn 1 sản phẩm, bấm "Sửa".<br>2. Đổi giá bán.<br>3. Bấm Lưu | - Cập nhật thành công.<br>- Danh sách hiển thị giá mới. |
| **PROD-04** | Bắt lỗi bỏ trống trường bắt buộc | 1. Thêm mới sản phẩm.<br>2. Để trống Tên hoặc Giá bán.<br>3. Lưu | - Nút Lưu bị chặn (bởi HTML5 required) hoặc Backend báo lỗi 400 Bad Request. |

---

## 3. Module Nhập Kho

| ID | Kịch bản kiểm tra (Test Scenario) | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **IMP-01** | Tạo phiếu nhập nháp | 1. Vào `/dashboard/imports`.<br>2. Bấm "Tạo phiếu nhập mới".<br>3. Chọn NCC, thêm 2 SP với số lượng, giá nhập.<br>4. Lưu | - Phiếu nhập được tạo với trạng thái `PENDING`.<br>- Tồn kho của sản phẩm *chưa* tăng. |
| **IMP-02** | Duyệt phiếu nhập | 1. Chọn phiếu nhập ở bước trên.<br>2. Bấm "Duyệt phiếu". | - Trạng thái phiếu thành `APPROVED`.<br>- Tồn kho của 2 sản phẩm tăng tương ứng.<br>- Sinh ra Lô hàng (Stock Batch) mới cho các sản phẩm đó. |
| **IMP-03** | Từ chối phiếu nhập | 1. Tạo phiếu nhập mới (`PENDING`).<br>2. Bấm "Từ chối". | - Trạng thái thành `REJECTED`.<br>- Tồn kho không bị thay đổi. |

---

## 4. Module Xuất Kho (FEFO)

| ID | Kịch bản kiểm tra (Test Scenario) | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **EXP-01** | Chặn xuất kho nếu số lượng = 0 | 1. Vào lập Phiếu xuất.<br>2. Chọn SP có tồn kho = 0.<br>3. Bấm Lưu | - Lỗi hiển thị: "Số lượng xuất không hợp lệ" hoặc "Tồn kho không đủ". |
| **EXP-02** | Xuất kho với tồn kho đủ (FEFO) | 1. Chọn SP A đang có 2 lô (Lô X HSD 2024, Lô Y HSD 2025), mỗi lô 10 cái.<br>2. Tạo phiếu xuất 15 cái cho SP A.<br>3. Duyệt phiếu xuất | - Trạng thái thành `APPROVED`.<br>- Tồn kho tổng giảm đi 15.<br>- Lô X trừ 10, Lô Y trừ 5 (Ưu tiên Lô hết hạn trước). |
| **EXP-03** | Xuất vượt quá tồn kho | 1. SP B có tồn 50.<br>2. Lập phiếu xuất 100 cái.<br>3. Lưu / Duyệt phiếu | - Lỗi Backend: Tồn kho không đủ để xuất.<br>- Giao diện hiển thị cảnh báo đỏ. |

---

## 5. Module Báo cáo & Dashboard

| ID | Kịch bản kiểm tra (Test Scenario) | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **REP-01** | Hiển thị Biểu đồ và KPI | 1. Vào Tổng quan (`/dashboard`).<br>2. Quan sát 4 thẻ KPI và Biểu đồ cột. | - Số liệu tổng quan khớp với dữ liệu thực tế.<br>- Biểu đồ lấy đúng dữ liệu 6 tháng gần nhất. |
| **REP-02** | Báo cáo Lô hàng cận Date | 1. Vào Báo cáo tồn kho (`/dashboard/inventory-reports`).<br>2. Kiểm tra tab "Lô hàng sắp hết hạn". | - Chỉ hiện lô có `HSD <= 30 ngày`.<br>- Lô <= 7 ngày báo đỏ (Danger), <= 14 ngày vàng (Warning). |
| **REP-03** | Cảnh báo tồn kho thấp | 1. Kiểm tra tab "Tồn kho tổng hợp".<br>2. SP có `Current Stock <= Min Stock`. | - Hiển thị nhãn cảnh báo đỏ.<br>- Có cột Gợi ý đặt hàng. |
