# BrewLite – Đặc tả Use Case: Đặt và thanh toán đơn hàng

- **Use case ID:** UC-01
- **Tên:** Đặt và thanh toán đơn hàng
- **Mức độ:** Trọng tâm nghiệp vụ của MVP
- **Phiên bản:** 1.0

## 1. Mục tiêu

Cho phép khách hàng chọn các sản phẩm trong menu, tùy chỉnh món, xác nhận thông tin đơn, chọn phương thức thanh toán được hỗ trợ và nhận kết quả tạo đơn/thanh toán.

## 2. Actor

- **Actor chính:** Khách hàng.
- **Actor phụ:** Dịch vụ thanh toán giả lập.
- **Actor hỗ trợ vận hành:** Nhân viên quầy (tiếp nhận và xử lý đơn sau khi đơn được tạo).

## 3. Trigger

Khách hàng chọn chức năng thanh toán/đặt hàng từ giỏ hàng.

## 4. Tiền điều kiện

1. Hệ thống truy cập được.
2. Menu đã có sản phẩm hợp lệ.
3. Giỏ hàng có ít nhất một dòng hàng.
4. Khách hàng cung cấp thông tin liên hệ/giao nhận bắt buộc.
5. Nếu quy trình yêu cầu đăng nhập, khách hàng đã đăng nhập hợp lệ trước khi tạo đơn.

## 5. Hậu điều kiện

### Thành công
- Đơn hàng được lưu với mã đơn duy nhất.
- Các dòng hàng, tùy chọn, số lượng và tổng tiền đã được lưu nhất quán.
- Kết quả/trạng thái thanh toán được lưu nếu use case có thanh toán điện tử giả lập.
- Khách hàng thấy màn hình xác nhận và có thể tra cứu đơn.

### Thất bại
- Hệ thống hiển thị lỗi có thể hiểu được.
- Không đánh dấu thanh toán thành công nếu dịch vụ trả kết quả thất bại.
- Không để lại đơn hàng thiếu dữ liệu do transaction thất bại.
- Giỏ hàng và thông tin đã nhập được giữ lại nếu có thể để khách hàng sửa và thử lại.

## 6. Luồng chính

1. Khách hàng mở menu và chọn một sản phẩm.
2. Hệ thống hiển thị chi tiết, giá và tùy chọn hợp lệ của sản phẩm.
3. Khách hàng chọn kích cỡ, lượng đường, lượng đá, topping và số lượng.
4. Khách hàng thêm món vào giỏ hàng.
5. Hệ thống cập nhật giỏ và tính tạm tính.
6. Khách hàng mở giỏ, kiểm tra món và điều chỉnh số lượng nếu cần.
7. Khách hàng chọn tiếp tục thanh toán.
8. Hệ thống yêu cầu khách hàng đăng nhập nếu thao tác đặt đơn yêu cầu tài khoản.
9. Khách hàng nhập/xác nhận thông tin liên hệ, địa chỉ giao hàng (nếu áp dụng), ghi chú và phương thức thanh toán.
10. Hệ thống kiểm tra dữ liệu bắt buộc và gửi yêu cầu tạo đơn tới backend.
11. Backend xác thực người dùng, kiểm tra sản phẩm/tùy chọn/giá và tính lại tổng tiền.
12. Backend tạo đơn và các dòng đơn trong transaction.
13. Nếu chọn COD, hệ thống lưu phương thức COD và trạng thái thanh toán phù hợp. Nếu chọn thanh toán giả lập, backend gửi yêu cầu tới dịch vụ giả lập.
14. Dịch vụ thanh toán trả kết quả.
15. Backend lưu kết quả thanh toán và trạng thái đơn phù hợp.
16. Hệ thống trả mã đơn và thông tin tóm tắt.
17. Giao diện hiển thị trang xác nhận đơn hàng.

## 7. Luồng thay thế

- **A1 – Khách hàng chưa đăng nhập:** Tại bước 8, hệ thống chuyển khách hàng tới đăng nhập/đăng ký. Sau khi xác thực thành công, quay lại checkout và giữ giỏ hàng.
- **A2 – Khách hàng sửa giỏ:** Tại bước 6, khách hàng đổi số lượng hoặc xóa món; hệ thống tính lại tổng tiền trước khi tiếp tục.
- **A3 – Chọn COD:** Tại bước 13, không gọi dịch vụ thanh toán điện tử; lưu phương thức COD và trạng thái thanh toán chưa thu tiền/thu khi nhận hàng.
- **A4 – Có ghi chú hoặc không có ghi chú:** Ghi chú là tùy chọn; các trường bắt buộc khác vẫn phải hợp lệ.
- **A5 – Dịch vụ thanh toán báo thành công:** Lưu trạng thái thanh toán thành công và trả trang xác nhận.
- **A6 – Khách hàng gửi lại yêu cầu do mạng chậm:** Backend dùng mã yêu cầu/idempotency key hoặc cơ chế tương đương để tránh tạo nhiều đơn cho cùng một lần xác nhận.

## 8. Luồng ngoại lệ

- **E1 – Giỏ hàng rỗng:** Tại bước 7, hệ thống không cho tiếp tục checkout và hướng dẫn khách quay lại menu.
- **E2 – Thiếu/sai thông tin:** Tại bước 10, hệ thống chỉ rõ trường cần sửa; không tạo đơn.
- **E3 – Sản phẩm không tồn tại/ngừng bán hoặc tùy chọn không hợp lệ:** Tại bước 11, backend từ chối yêu cầu; không tạo đơn; giao diện yêu cầu khách cập nhật giỏ.
- **E4 – Giá thay đổi:** Nếu giá backend khác giá client hiển thị, backend không âm thầm thu số tiền cũ; trả thông tin giá mới để khách xác nhận lại.
- **E5 – Thanh toán thất bại:** Dịch vụ trả thất bại; hệ thống không đánh dấu đã thanh toán, hiển thị kết quả và cho phép thử lại hoặc chọn phương thức khác theo chính sách.
- **E6 – Dịch vụ thanh toán không phản hồi:** Hệ thống đánh dấu kết quả chưa xác định/thất bại theo thiết kế, không gửi lại giao dịch không an toàn; hỗ trợ tra cứu bằng mã tham chiếu.
- **E7 – Lỗi DB khi tạo đơn:** Transaction rollback; hiển thị lỗi chung và cho phép thử lại.
- **E8 – Token hết hạn:** Backend trả 401; giao diện yêu cầu đăng nhập lại và không làm mất giỏ hàng nếu có thể.
- **E9 – Người dùng gửi request lặp:** Backend không tạo đơn hoặc ghi nhận thanh toán trùng nếu request dùng cùng khóa idempotency.

## 9. Quy tắc nghiệp vụ

- Giá cuối cùng phải được tính/kiểm tra tại backend.
- Số lượng phải là số nguyên dương.
- Tất cả dòng hàng của đơn và tổng tiền phải nhất quán.
- Không lưu mật khẩu dạng rõ và không lưu số thẻ/CVV.
- Chỉ chủ đơn hoặc nhân viên/quản lý có quyền mới được truy cập đơn.
- Trạng thái đơn và thanh toán là hai trạng thái riêng biệt.
- Mọi chuyển trạng thái phải tuân theo tập trạng thái hợp lệ của hệ thống.

## 10. Yêu cầu liên quan

- **FR:** FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-17.
- **NFR:** NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-09, NFR-11.

## 11. Tiêu chí nghiệm thu UC-01

1. Với giỏ hàng hợp lệ và thông tin bắt buộc hợp lệ, hệ thống tạo một đơn và hiển thị mã đơn.
2. Giá/tổng tiền lưu trong DB khớp với phép tính backend theo quy tắc giá đã thống nhất.
3. Với giỏ rỗng hoặc dữ liệu sai, hệ thống không tạo đơn.
4. Với sản phẩm ngừng bán hoặc tùy chọn không hợp lệ, backend từ chối đơn.
5. Với thanh toán giả lập thành công, trạng thái thanh toán được cập nhật đúng.
6. Với thanh toán giả lập thất bại, đơn không bị đánh dấu đã thanh toán.
7. Request lặp có cùng idempotency key không tạo đơn/thanh toán trùng.
8. Khách hàng không thể đọc đơn của tài khoản khác.
9. Lỗi API/DB được hiển thị bằng thông báo phù hợp và không làm giao diện treo vô hạn.
