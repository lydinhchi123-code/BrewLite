# BrewLite – Đặc tả Use Case: Đặt và thanh toán đơn hàng

- **Use case ID:** UC-01
- **Tên:** Đặt và thanh toán đơn hàng
- **Mức độ:** Trọng tâm nghiệp vụ của MVP
- **Phiên bản:** 1.0

## 1. Mục tiêu

Cho phép khách hàng lựa chọn sản phẩm từ menu, tùy chỉnh món, quản lý giỏ hàng, xác nhận thông tin đơn hàng và thực hiện thanh toán trực tuyến thông qua VNPay Sandbox. Sau khi hoàn tất quy trình, hệ thống thông báo kết quả đặt hàng và thanh toán, đồng thời cung cấp thông tin để khách hàng tra cứu đơn hàng.

## 2. Actor

- **Actor chính:** Khách hàng.
- **Actor phụ:** Dịch vụ thanh toán giả lập.

## 3. Trigger

Khách hàng chọn chức năng thanh toán/đặt hàng từ giỏ hàng.

## 4. Tiền điều kiện

1. Hệ thống đang hoạt động và có thể truy cập.
2. Menu đã có sản phẩm hợp lệ để khách hàng lựa chọn.
3. Giỏ hàng có ít nhất một dòng hàng.
4. Khách hàng cung cấp thông tin liên hệ/giao nhận bắt buộc.
5. Khách hàng có thể chưa đăng nhập khi bắt đầu use case, nhưng phải đăng nhập hợp lệ trước khi thực hiện tạo đơn nếu hệ thống yêu cầu tài khoản.

## 5. Hậu điều kiện

### Thành công
- Đơn hàng được lưu với mã đơn duy nhất.
- Các dòng hàng, tùy chọn, số lượng và tổng tiền đã được lưu nhất quán.
- Kết quả thanh toán được ghi nhận thông qua trạng thái đơn hàng tương ứng.
- Khách hàng thấy màn hình xác nhận và có thể tra cứu đơn.

### Thất bại
- Hệ thống hiển thị thông báo lỗi để khách hàng biết nguyên nhân và hướng xử lý.
- Đơn hàng không được ghi nhận là đã thanh toán nếu giao dịch không thành công.
- Không lưu dữ liệu đơn hàng không nhất quán khi transaction thất bại.
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
13. Nếu khách hàng chọn COD, backend lưu phương thức thanh toán COD và trạng thái thanh toán chưa thanh toán. Nếu khách hàng chọn thanh toán giả lập, backend gửi yêu cầu đến dịch vụ thanh toán.
14. Nếu sử dụng thanh toán giả lập, dịch vụ thanh toán trả kết quả giao dịch cho backend.
15. Backend lưu kết quả thanh toán tương ứng và cập nhật trạng thái đơn hàng theo quy tắc nghiệp vụ.
16. Hệ thống trả mã đơn và thông tin tóm tắt.
17. Giao diện hiển thị trang xác nhận đơn hàng.

## 7. Luồng thay thế

- **A1 – Khách hàng chưa đăng nhập:** Tại bước 8, hệ thống thông báo và yêu cầu khách hàng phải đăng nhập/đăng ký để tiếp tục sang bước tiếp theo. Sau khi xác thực thành công, quay lại checkout và giữ giỏ hàng.
- **A2 – Khách hàng sửa giỏ:** Tại bước 6, khách hàng đổi số lượng hoặc xóa món; hệ thống tính lại tổng tiền trước khi tiếp tục.
- **A3 – Có ghi chú hoặc không có ghi chú:** Ghi chú là tùy chọn; các trường bắt buộc khác vẫn phải hợp lệ.
- **A4 – Thanh toán VNPay Sandbox thành công:** Tại bước 15, VNPay Sandbox trả kết quả giao dịch thành công; hệ thống hiển thị thông tin xác nhận đơn hàng.
- **A5 – Khách hàng thực hiện thanh toán lại:** Nếu giao dịch trước đó thất bại, khách hàng có thể thực hiện lại thanh toán theo chức năng được hệ thống hỗ trợ; hệ thống kiểm tra trạng thái đơn hàng trước khi tạo yêu cầu thanh toán mới; kết quả thanh toán mới được xử lý theo quy tắc chuyển trạng thái đơn hàng.
- **A6 – Khách hàng gửi lại yêu cầu do mạng chậm:** Backend dùng mã yêu cầu/idempotency key hoặc cơ chế tương đương để tránh tạo nhiều đơn cho cùng một lần xác nhận.

## 8. Luồng ngoại lệ

- **E1 – Giỏ hàng rỗng:** Tại bước 7, hệ thống không cho tiếp tục checkout và hướng dẫn khách quay lại menu.
- **E2 – Thiếu/sai thông tin:** Tại bước 10, hệ thống chỉ rõ trường cần sửa; không tạo đơn.
- **E3 – Sản phẩm không tồn tại/ngừng bán hoặc tùy chọn không hợp lệ:** Tại bước 11, backend từ chối yêu cầu; không tạo đơn; giao diện yêu cầu khách cập nhật giỏ.
- **E4 – Giá thay đổi:** Nếu giá backend khác giá client hiển thị, backend không âm thầm thu số tiền cũ; trả thông tin giá mới để khách xác nhận lại.
- **E5 – Thanh toán thất bại:** Dịch vụ trả thất bại; hệ thống không đánh dấu đã thanh toán, hiển thị kết quả và cho phép thử lại hoặc chọn phương thức khác theo chính sách.
- **E6 – VNPay Sandbox không phản hồi hoặc kết quả chưa xác định:** Hệ thống thông báo giao dịch chưa thể xác định kết quả; không tự động đánh dấu đơn hàng là đã thanh toán hoặc thanh toán thất bại khi chưa có kết quả hợp lệ, cần kiểm tra lại giao dịch theo mã tham chiếu nếu có.
- **E7 – Lỗi DB khi tạo đơn:** Transaction rollback; hiển thị lỗi chung và cho phép thử lại.
- **E8 – Token hết hạn:** Token không hợp lệ hoặc hết hạn, backend trả về lỗi xác thực tương ứng; giao diện yêu cầu khách hàng đăng nhập lại; giỏ hàng được giữ lại nếu có.
- **E9 – Người dùng gửi request lặp:** Backend không tạo đơn hoặc ghi nhận thanh toán trùng nếu request dùng cùng khóa idempotency.

## 9. Quy tắc nghiệp vụ

- Giá cuối cùng phải được tính/kiểm tra tại backend.
- Số lượng sản phẩm phải là số nguyên dương.
- Tất cả dòng hàng của đơn và tổng tiền phải nhất quán.
- Không lưu mật khẩu dưới dạng văn bản thuần.
- Khách hàng chỉ được xem các đơn hàng thuộc tài khoản của mình; Admin có quyền truy cập và quản lý đơn hàng theo chức năng được phân quyền.
- Trạng thái đơn và thanh toán là hai trạng thái riêng biệt.
- Mọi chuyển trạng thái phải tuân theo tập trạng thái hợp lệ của hệ thống.
- VNPay Sandbox được sử dụng để thử nghiệm quy trình thanh toán trực tuyến; các giao dịch trong môi trường này không phát sinh giao dịch tiền thật.

## 10. Yêu cầu liên quan

- **FR:** FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-17.
- **NFR:** NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-09, NFR-11.

## 11. Tiêu chí nghiệm thu UC-01

1. Với giỏ hàng hợp lệ và thông tin bắt buộc hợp lệ, hệ thống tạo một đơn và hiển thị mã đơn duy nhất.
2. Giá/tổng tiền lưu trong DB khớp với phép tính backend theo quy tắc giá đã thống nhất.
3. Với giỏ rỗng hoặc dữ liệu sai, hệ thống không tạo đơn.
4. Với sản phẩm ngừng bán hoặc tùy chọn không hợp lệ, backend từ chối yêu cầu tạo đơn.
5. Với giao dịch VNPay Sandbox thành công và kết quả được xác thực hợp lệ, trạng thái đơn hàng được cập nhật thành PAID.
6. Với giao dịch VNPay Sandbox thất bại và kết quả được xác thực hợp lệ, trạng thái đơn hàng được cập nhật thành PAYMENT_FAILED; đơn hàng không được ghi nhận là đã thanh toán.
7. Request lặp có cùng idempotency key không tạo đơn/thanh toán trùng.
8. Khách hàng không thể truy cập thông tin đơn hàng thuộc tài khoản của khách hàng khác.
9. Lỗi API/DB được hiển thị bằng thông báo phù hợp và không làm giao diện treo vô hạn.
10.	Các giao dịch trong môi trường VNPay Sandbox không phát sinh giao dịch tiền thật.