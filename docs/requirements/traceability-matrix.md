# BrewLite – Traceability Matrix (Task 1)

Ma trận liên kết yêu cầu với use case và kiểm thử dự kiến. Tên test dưới đây là mã đề xuất; nhóm có thể đổi theo quy ước trong thư mục `tests/` nhưng cần giữ liên kết truy vết.

| Requirement ID | Use case / khu vực | Kiểm thử nghiệm thu dự kiến | Mức ưu tiên |
|----------------|--------------------|-----------------------------|-------------|
| FR-01 | UC-01, Menu | `TC-MENU-01`: menu hiển thị đúng dữ liệu; `TC-MENU-02`: menu rỗng | Must |
| FR-02 | Menu | `TC-MENU-03`: tìm kiếm và lọc kết hợp | Should |
| FR-03 | UC-01, Chi tiết | `TC-PRODUCT-01`: tùy chọn sản phẩm hợp lệ | Must |
| FR-04 | UC-01, Giỏ hàng | `TC-CART-01`: thêm món và cập nhật số lượng badge | Must |
| FR-05 | UC-01, Giỏ hàng | `TC-CART-02`: tăng/giảm/xóa dòng hàng | Must |
| FR-06 | UC-01, Giỏ hàng/Checkout | `TC-PRICE-01`: tính tổng theo bộ dữ liệu chuẩn | Must |
| FR-07 | UC-01, Xác thực | `TC-AUTH-01`: đăng ký hợp lệ; `TC-AUTH-02`: email trùng; `TC-AUTH-03`: đăng nhập sai | Must |
| FR-08 | UC-01, API bảo vệ | `TC-AUTHZ-01`: không token; `TC-AUTHZ-02`: truy cập đơn người khác | Must |
| FR-09 | UC-01, Tạo đơn | `TC-ORDER-01`: tạo đơn hợp lệ và lưu DB | Must |
| FR-10 | UC-01, Validation | `TC-ORDER-02`: sản phẩm/tùy chọn không hợp lệ | Must |
| FR-11 | UC-01, Thanh toán | `TC-PAY-01`: lưu phương thức COD/giả lập | Must |
| FR-12 | UC-01, Thanh toán | `TC-PAY-02`: thành công; `TC-PAY-03`: thất bại; `TC-PAY-04`: request lặp | Must |
| FR-13 | UC-01, Xác nhận | `TC-ORDER-03`: mã đơn và tổng tiền hiển thị đúng | Must |
| FR-14 | Lịch sử đơn | `TC-HISTORY-01`: chỉ hiện đơn của người dùng | Must |
| FR-15 | Theo dõi đơn | `TC-TRACK-01`: trạng thái đơn đúng; `TC-TRACK-02`: mã không hợp lệ | Must |
| FR-16 | Quản lý đơn | `TC-STAFF-01`: cập nhật trạng thái đúng quyền | Should |
| FR-17 | Menu/Checkout | `TC-UI-01`: loading; `TC-UI-02`: empty; `TC-UI-03`: error | Must |
| FR-18 | Triển khai/Health | `TC-OPS-01`: `GET /health` trả 200 khi sẵn sàng | Must |
| FR-19 | DB/Setup | `TC-SETUP-01`: migration/seed trên DB mới | Must |
| FR-20 | Logging | `TC-LOG-01`: log lỗi không chứa secrets | Should |
| FR-21 | Khuyến mãi/tích điểm | `TC-PROMO-01`: mã hợp lệ/không hợp lệ nếu triển khai | Could |
| FR-22 | Thông báo | Chưa thuộc nghiệm thu MVP | Won't (this release) |
| NFR-01 | API menu | `TC-PERF-01`: 100 sản phẩm, đo p95 trong môi trường thống nhất | Should |
| NFR-02 | Tạo đơn | `TC-PERF-02`: đo p95 với payment giả lập | Should |
| NFR-03 | Bảo mật | `TC-SEC-01`: DB không lưu mật khẩu dạng rõ | Must |
| NFR-04 | Bảo mật | `TC-SEC-02`: kiểm tra token và quyền sở hữu đơn | Must |
| NFR-05 | Git/config | `TC-SEC-03`: `.env` không được track trong Git | Must |
| NFR-06 | UI/API | `TC-RES-01`: lỗi API có thông báo và retry | Must |
| NFR-07 | Responsive | `TC-UI-04`: kiểm tra viewport 375px và 1280px | Must |
| NFR-08 | Kiến trúc/test | Review cấu trúc và test nghiệp vụ | Should |
| NFR-09 | Triển khai | `TC-SETUP-02`: dựng lại theo README trên máy sạch | Must |
| NFR-10 | CI | `TC-CI-01`: lint/test/build chạy khi push/PR | Must |
| NFR-11 | Transaction | `TC-DB-01`: lỗi giữa chừng không để lại đơn dở dang | Must |
| NFR-12 | Trình duyệt | `TC-COMPAT-01`: luồng chính trên Chrome/Edge | Should |

## Ghi chú truy vết

- UC-01 là use case trọng tâm cho Task 1.3.
- Test ID là đề xuất để lên kế hoạch; khi triển khai test cần ghi vị trí file test thực tế.
- Nếu yêu cầu thay đổi, cập nhật SRS, use case, ma trận và test liên quan cùng một commit.
