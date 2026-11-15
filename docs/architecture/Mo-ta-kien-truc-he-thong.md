# Task 3: Mô tả kiến trúc hệ thống

BrewLite sử dụng kiến trúc phân lớp, gồm ba thành phần chính: Frontend, Backend và Database, được tổ chức trong một monorepo gồm hai ứng dụng apps/web và apps/api.

**Frontend – Next.js:** Cung cấp giao diện cho khách hàng, cho phép xem menu, lựa chọn sản phẩm và quản lý giỏ hàng.

**Backend – NestJS:** Tiếp nhận yêu cầu từ frontend, kiểm tra dữ liệu và xử lý nghiệp vụ thông qua các module chức năng( sản phẩm, người dùng, đơn hàng, thanh toán) đồng thời giao tiếp với PostgreSQL để truy vấn và cập nhật dữ liệu.

**Database – PostgreSQL:** Lưu trữ dữ liệu sản phẩm, người dùng và đơn hàng. Hiện tại cấu trúc dữ liệu được cập nhật thủ công; việc áp dụng migration có phiên bản là định hướng của dự án.

**Dịch vụ thanh toán – VNPay Sandbox:** Hỗ trợ kiểm thử quy trình thanh toán trực tuyến trong môi trường thử nghiệm. Các giao dịch thông qua VNPay Sandbox không phát sinh thanh toán bằng tiền thật.

**Vận hành và cấu hình:** Cấu hình được quản lý bằng biến môi trường, không đưa thông tin bí mật vào mã nguồn; đồng thời sử dụng logging và health check để hỗ trợ theo dõi và kiểm tra trạng thái dịch vụ.

Kiến trúc này tách biệt giao diện, xử lý nghiệp vụ và lưu trữ dữ liệu, giúp các thành phần dễ phát triển, kiểm thử và bảo trì độc lập hơn.