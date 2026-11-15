# BrewLite – Traceability Matrix (Task 1)

Ma trận liên kết các yêu cầu chức năng, yêu cầu phi chức năng với use case, khu vực hệ thống và các trường hợp kiểm thử nghiệm thu dự kiến. Tên kiểm thử dưới đây là mã đề xuất; nhóm có thể điều chỉnh theo quy ước kiểm thử của dự án nhưng cần giữ liên kết truy vết giữa yêu cầu và kiểm thử

## 1. Ma trận truy vết yêu cầu chức năng (FR)

| Requirement ID | Use case / Khu vực | Kiểm thử nghiệm thu dự kiến | Mức ưu tiên |
|----------------|--------------------|-----------------------------|-------------|
| FR-01 | Menu | `TC-MENU-01`: Menu hiển thị đúng dữ liệu; `TC-MENU-02`: Menu rỗng | Must |
| FR-02 | Menu | `TC-MENU-03`: Tìm kiếm và lọc kết hợp | Should |
| FR-03 | UC-01, Chi tiết sản phẩm | `TC-PRODUCT-01`: Tùy chọn sản phẩm hợp lệ | Must |
| FR-04 | UC-01, Giỏ hàng | `TC-CART-01`: Thêm món và cập nhật số lượng badge | Must |
| FR-05 | UC-01, Giỏ hàng | `TC-CART-02`: Tăng, giảm và xóa dòng hàng | Must |
| FR-06 | UC-01, Giỏ hàng/Checkout | `TC-PRICE-01`: Tính tổng tiền theo bộ dữ liệu chuẩn | Must |
| FR-07 | UC-01, Xác thực | `TC-AUTH-01`: Đăng ký hợp lệ; `TC-AUTH-02`: Email trùng; `TC-AUTH-03`: Đăng nhập sai | Must |
| FR-08 | UC-01, API bảo vệ | `TC-AUTHZ-01`: Truy cập không có token; `TC-AUTHZ-02`: Truy cập đơn hàng của người khác | Must |
| FR-09 | UC-01, Tạo đơn | `TC-ORDER-01`: Tạo đơn hợp lệ và lưu DB | Must |
| FR-10 | UC-01, Validation | `TC-ORDER-02`: Sản phẩm hoặc tùy chọn không hợp lệ | Must |
| FR-11 | UC-01, Thanh toán | `TC-PAY-01`: Lưu phương thức COD/thanh toán giả lập | Must |
| FR-12 | UC-01, Thanh toán | `TC-PAY-02`: Thanh toán thành công; `TC-PAY-03`: Thanh toán thất bại; `TC-PAY-04`: Request lặp | Must |
| FR-13 | UC-01, Xác nhận đơn | `TC-ORDER-03`: Mã đơn, dòng hàng và tổng tiền hiển thị đúng | Must |
| FR-14 | Lịch sử đơn hàng | `TC-HISTORY-01`: Chỉ hiển thị đơn của người dùng đang đăng nhập | Must |
| FR-15 | Theo dõi đơn hàng | `TC-TRACK-01`: Trạng thái đơn đúng; `TC-TRACK-02`: Mã đơn không hợp lệ hoặc không có quyền truy cập | Must |
| FR-16 | Admin – Đơn hàng | `TC-ADMIN-ORDER-01`: Xem danh sách và chi tiết đơn; `TC-ADMIN-ORDER-02`: Cập nhật trạng thái đơn hợp lệ; `TC-ADMIN-ORDER-03`: Từ chối chuyển trạng thái không hợp lệ | Must |
| FR-17 | Menu/Checkout/Admin | `TC-UI-01`: Loading; `TC-UI-02`: Empty; `TC-UI-03`: Error | Must |
| FR-18 | Backend/Health check | `TC-OPS-01`: `GET /health` trả HTTP 200 khi hệ thống sẵn sàng | Must |
| FR-19 | DB/Setup | `TC-SETUP-01`: Migration và seed trên DB mới | Must |
| FR-20 | Logging | `TC-LOG-01`: Log lỗi không chứa secrets hoặc thông tin nhạy cảm | Should |
| FR-21 | Khách hàng – Mã giảm giá | `TC-PROMO-01`: Áp dụng mã hợp lệ; `TC-PROMO-02`: Từ chối mã không hợp lệ hoặc hết hạn | Could |
| FR-22 | Thông báo | Chưa thuộc phạm vi nghiệm thu MVP | Won't (this release) |
| FR-23 | Admin – Tổng quan | `TC-ADMIN-DASH-01`: Hiển thị số liệu tổng quan; `TC-ADMIN-DASH-02`: Xử lý trường hợp chưa có dữ liệu | Must |
| FR-24 | Admin – Tồn kho | `TC-ADMIN-STOCK-01`: Hiển thị thông tin tồn kho; `TC-ADMIN-STOCK-02`: Kiểm tra thao tác cập nhật tồn kho hợp lệ nếu được hỗ trợ | Must |
| FR-25 | Admin – Công thức pha chế | `TC-ADMIN-RECIPE-01`: Hiển thị danh sách và thông tin công thức; `TC-ADMIN-RECIPE-02`: Kiểm tra thao tác thêm, sửa hoặc xóa công thức nếu được hỗ trợ | Must |
| FR-26 | Admin – Mã giảm giá | `TC-ADMIN-PROMO-01`: Hiển thị danh sách và thông tin mã giảm giá; `TC-ADMIN-PROMO-02`: Kiểm tra thao tác thêm, sửa hoặc xóa mã nếu được hỗ trợ | Must |

## 2. Ma trận truy vết yêu cầu phi chức năng (NFR)

| Requirement ID | Use case / Khu vực | Kiểm thử nghiệm thu dự kiến | Mức ưu tiên |
|----------------|--------------------|-----------------------------|-------------|
| NFR-01 | API Menu | `TC-PERF-01`: Kiểm tra 100 sản phẩm và đo p95 trong môi trường thống nhất | Should |
| NFR-02 | Tạo đơn | `TC-PERF-02`: Đo p95 khi tạo đơn với dịch vụ thanh toán giả lập | Should |
| NFR-03 | Bảo mật mật khẩu | `TC-SEC-01`: Kiểm tra DB không lưu mật khẩu dạng rõ | Must |
| NFR-04 | Bảo mật API và quyền riêng tư | `TC-SEC-02`: Kiểm tra token và quyền sở hữu đơn hàng | Must |
| NFR-05 | Git/Config | `TC-SEC-03`: Kiểm tra file `.env` không được track trong Git | Must |
| NFR-06 | UI/API | `TC-RES-01`: Lỗi API và quá thời gian chờ được thông báo; có thể thử lại | Must |
| NFR-07 | Responsive – Khách hàng/Admin | `TC-UI-04`: Kiểm tra giao diện Admin và các luồng chính của Khách hàng trên viewport 375px và 1280px theo phạm vi responsive đã thống nhất | Must |
| NFR-08 | Kiến trúc/Test | Review cấu trúc frontend, backend, tài liệu và test nghiệp vụ | Should |
| NFR-09 | Triển khai | `TC-SETUP-02`: Dựng lại môi trường theo README trên máy phát triển sạch | Must |
| NFR-10 | CI | `TC-CI-01`: Kiểm tra lint, unit test và build khi push/PR | Must |
| NFR-11 | Transaction | `TC-DB-01`: Lỗi giữa chừng không để lại đơn hàng thiếu dữ liệu | Must |
| NFR-12 | Trình duyệt | `TC-COMPAT-01`: Kiểm tra các luồng chính trên Chrome và Edge | Should |

## 3. Ghi chú truy vết

- UC-01 – Đặt và thanh toán đơn hàng là use case trọng tâm cho Task 1.3.
- Các yêu cầu FR-01 đến FR-15 chủ yếu liên quan đến khu vực Khách hàng và quy trình đặt hàng.
- FR-16 và FR-23 đến FR-26 liên quan đến khu vực Admin, bao gồm Tổng quan, Đơn hàng, Tồn kho, Công thức pha chế và Mã giảm giá.
- FR-21 liên quan đến việc khách hàng áp dụng mã giảm giá khi đặt hàng; FR-26 liên quan đến việc Admin quản lý mã giảm giá.
- FR-22 không thuộc phạm vi nghiệm thu của MVP hiện tại.
- Test ID là mã đề xuất để lập kế hoạch kiểm thử. Khi triển khai, nhóm cần ghi nhận vị trí file test thực tế và kết quả thực hiện.
- Những kiểm thử có ghi chú "nếu được hỗ trợ" cần được điều chỉnh theo các thao tác thực tế đã triển khai trong hệ thống.
- Nếu yêu cầu thay đổi, nhóm cần cập nhật đồng bộ SRS, đặc tả Use Case, Traceability Matrix và các test liên quan trong cùng một commit.