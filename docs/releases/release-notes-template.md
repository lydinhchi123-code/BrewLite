# BrewLite v1.0.0

- **Release date:** 2026-11-14
- **Frontend URL:** https://brewlite-web-ksd1.onrender.com/
- **API URL:** https://brewlite-api-tutb.onrender.com
- **Health check:** https://brewlite-api-tutb.onrender.com/health

## Included

### 1. Triển khai hệ thống lên môi trường Production

- Triển khai ứng dụng BrewLite lên môi trường Production sử dụng nền tảng Render.
- Frontend được xây dựng bằng Next.js, Backend sử dụng NestJS và dữ liệu được lưu trữ trên PostgreSQL.
- Tổ chức hệ thống theo mô hình Frontend – Backend – Database, cho phép các thành phần giao tiếp và xử lý dữ liệu độc lập.
- Cấu hình các biến môi trường cần thiết để kết nối Frontend, Backend và Database trong môi trường Production.

### 2. Các chức năng chính của hệ thống

#### a. Chi tiết sản phẩm, Size và Topping

- Xây dựng giao diện chi tiết sản phẩm, hiển thị hình ảnh, tên món, danh mục và mô tả.
- Hỗ trợ lựa chọn ba kích cỡ S, M, L với mức phụ thu tương ứng.
- Cho phép tùy chỉnh độ ngọt, lượng đá và lựa chọn nhiều loại topping.
- Tự động cập nhật giá sản phẩm theo kích cỡ và topping được lựa chọn.

#### b. Quản lý giỏ hàng và tính toán đơn hàng

- Lưu trữ giỏ hàng trên `localStorage`, đồng bộ số lượng sản phẩm trên giao diện.
- Phân biệt các dòng sản phẩm dựa trên Size, độ ngọt, lượng đá và topping.
- Hỗ trợ tăng, giảm số lượng và xóa sản phẩm khỏi giỏ hàng.
- Tính toán tạm tính, phí giao hàng, chiết khấu và tổng thanh toán.

#### c. Đăng ký, Đăng nhập và xác thực người dùng

- Hỗ trợ đăng ký và đăng nhập tài khoản khách hàng.
- Kiểm tra thông tin đăng ký và ngăn chặn trùng lặp email, số điện thoại.
- Sử dụng bcrypt để băm mật khẩu trước khi lưu vào PostgreSQL.
- Áp dụng JWT để xác thực người dùng và bảo vệ các API yêu cầu đăng nhập.

#### d. Tạo và quản lý đơn hàng

- Hỗ trợ tạo đơn hàng và lưu thông tin đơn hàng, chi tiết sản phẩm vào PostgreSQL.
- Backend kiểm tra thông tin sản phẩm và đối soát giá từ cơ sở dữ liệu.
- Kiểm tra tính hợp lệ của mã giảm giá theo các điều kiện áp dụng.
- Sử dụng Database Transaction để đảm bảo tính nhất quán khi tạo đơn hàng và chi tiết đơn hàng.

#### e. Thanh toán VNPay Sandbox và Mock Payment

- Tích hợp quy trình thanh toán thử nghiệm thông qua VNPay Sandbox.
- Xây dựng giao diện thanh toán Sandbox riêng, thông báo rõ ràng giao dịch không sử dụng tiền thật.
- Xử lý kết quả thanh toán và cập nhật trạng thái đơn hàng tương ứng.
- Áp dụng cơ chế Idempotency-Key nhằm hạn chế việc xử lý trùng lặp yêu cầu thanh toán.

#### f. Xác nhận và theo dõi đơn hàng

- Xây dựng trang xác nhận đơn hàng, hiển thị mã đơn, thông tin sản phẩm và tổng tiền.
- Quản lý trạng thái đơn hàng theo các giai đoạn: PENDING, PAID, PREPARING, READY, COMPLETED, PAYMENT_FAILED và CANCELLED.
- Cung cấp chức năng xem lịch sử đơn hàng và theo dõi trạng thái các đơn đã đặt.

#### g. Kiểm tra dữ liệu và xử lý lỗi

- Kiểm tra dữ liệu đầu vào tại Frontend trước khi gửi yêu cầu.
- Sử dụng ValidationPipe và class-validator tại Backend để kiểm tra dữ liệu từ API.
- Chuẩn hóa việc xử lý lỗi và trả về các mã HTTP phù hợp.
- Bổ sung health check tại API thông qua endpoint `GET /health` để hỗ trợ kiểm tra trạng thái dịch vụ.

## Verification

## Verification

- **CI:** [GitHub Actions – BrewLite CI](https://github.com/lydinhchi123-code/BrewLite/actions/runs/43566841591) – **Success**. Hai jobs Backend (NestJS) và Frontend (Next.js) hoàn thành thành công.

- **End-to-end demo flow:** Đã thực hiện kiểm tra các luồng nghiệp vụ chính của hệ thống, bao gồm:
  - Truy cập website Production và kiểm tra khả năng tải dữ liệu sản phẩm.
  - Tùy chỉnh sản phẩm, thêm vào giỏ hàng và kiểm tra thông tin đơn hàng.
  - Sử dụng voucher giảm giá và mã Freeship trong quá trình đặt hàng.
  - Thực hiện quy trình thanh toán thử nghiệm thông qua VNPay Sandbox.
  - Kiểm tra cập nhật trạng thái đơn hàng, bao gồm chuyển đơn hàng sang trạng thái CANCELED.
  - Kiểm tra thông tin và trạng thái đơn hàng sau khi cập nhật.

## Known issues

- Các dịch vụ sử dụng gói miễn phí trên Render có thể chuyển sang trạng thái ngủ khi không có truy cập trong một khoảng thời gian. Vì vậy, lần truy cập đầu tiên sau thời gian không hoạt động có thể mất thêm thời gian để khởi động.
- Dữ liệu menu và sản phẩm có thể tải chậm trong lần truy cập đầu tiên do thời gian khởi động của dịch vụ Backend.
- Thanh toán VNPay hiện sử dụng môi trường Sandbox phục vụ kiểm thử, chưa triển khai thanh toán bằng tiền thật trên môi trường Production.

## Rollback

- <Rollback commit/tag and instructions>



