# Task 1 – Bối cảnh, Stakeholder và Phạm vi

- **Dự án:** BrewLite – Hệ thống đặt đồ uống trực tuyến cho cửa hàng cà phê.
- **Phiên bản tài liệu:** 1.0
- **Phạm vi:** Task 1.1 – Bối cảnh, stakeholder và phạm vi.
- **Công nghệ dự kiến:** Next.js (frontend), NestJS (backend), PostgreSQL (database), dịch vụ thanh toán giả lập trong môi trường đồ án.

## 1. Bối cảnh và vấn đề nghiệp vụ

BrewLite là hệ thống web hỗ trợ khách hàng xem thực đơn và đặt đồ uống trực tuyến. Nếu cửa hàng chỉ tiếp nhận đơn trực tiếp hoặc qua các kênh thủ công, khách hàng có thể khó tra cứu đầy đủ thông tin sản phẩm, tùy chỉnh món, tính tổng tiền và theo dõi trạng thái đơn. Nhân viên cũng có thể mất thời gian ghi nhận đơn, kiểm tra thông tin và cập nhật tình trạng xử lý.

BrewLite hướng đến việc tập trung quy trình xem menu, chọn tùy chọn đồ uống, quản lý giỏ hàng, tạo đơn, thanh toán và tra cứu đơn trên một giao diện thống nhất. Phạm vi đồ án tập trung vào MVP có thể kiểm thử và triển khai; tích hợp thanh toán thật hoặc vận hành đa chi nhánh không thuộc mục tiêu bắt buộc ban đầu.

## 2. Mục tiêu sản phẩm

1. Cho phép khách hàng xem menu và thông tin sản phẩm rõ ràng.
2. Hỗ trợ chọn kích cỡ, lượng đường, lượng đá và topping nếu sản phẩm có hỗ trợ.
3. Tính chính xác tạm tính, phí giao hàng (nếu áp dụng) và tổng thanh toán.
4. Cho phép khách hàng tạo đơn, chọn phương thức thanh toán được hỗ trợ và nhận xác nhận.
5. Cho phép khách hàng tra cứu trạng thái và lịch sử đơn hàng.
6. Cung cấp cho nhân viên/quản lý cách tiếp nhận, cập nhật trạng thái đơn ở mức phù hợp với MVP.
7. Đảm bảo ứng dụng có thể chạy lại được từ hướng dẫn cài đặt, cấu hình môi trường, migration và dữ liệu mẫu.

## 3. Stakeholder

| Stakeholder | Vai trò / nhu cầu | Mục tiêu và kỳ vọng | Mức ảnh hưởng |
|-------------|-------------------|---------------------|---------------|
| Khách hàng | Người xem menu, tùy chỉnh món và đặt hàng | Menu dễ hiểu; giá và tổng tiền rõ ràng; thao tác đơn giản; nhận kết quả đặt hàng và xem trạng thái | Cao |
| Giảng viên / người nghiệm thu | Đánh giá sản phẩm theo yêu cầu đồ án | Có tài liệu, tiêu chí nghiệm thu kiểm chứng được, demo và kiểm thử tái lập | Cao |
| Nhóm phát triển | Phân tích, thiết kế, lập trình, kiểm thử và triển khai | Yêu cầu rõ ràng; phân công được; mã nguồn có cấu trúc; dễ tích hợp và bảo trì | Cao |
| Đơn vị / dịch vụ thanh toán | Xử lý kết quả thanh toán khi được tích hợp | Giao dịch được gửi đúng dữ liệu; nhận kết quả thành công/thất bại; tránh ghi nhận trùng | Trung bình; MVP dùng mô phỏng |

## 4. Phạm vi MVP (In-scope)

- Hiển thị menu sản phẩm: tên, hình ảnh, mô tả, danh mục và giá.
- Tìm kiếm/lọc sản phẩm theo tên hoặc danh mục ở mức cơ bản.
- Xem chi tiết sản phẩm và lựa chọn kích cỡ, đường, đá, topping nếu được hỗ trợ.
- Thêm, xóa, tăng/giảm số lượng sản phẩm trong giỏ.
- Tính tạm tính và tổng đơn theo quy tắc được công bố trong giao diện.
- Đăng ký/đăng nhập bằng tài khoản và mật khẩu; mật khẩu phải được băm ở backend.
- Tạo đơn hàng và lưu đơn cùng các dòng sản phẩm vào PostgreSQL.
- Thanh toán COD và/hoặc luồng thanh toán giả lập; kết quả thành công/thất bại phải được xử lý rõ ràng.
- Hiển thị trang xác nhận sau khi tạo đơn thành công.
- Tra cứu trạng thái đơn hiện tại và lịch sử đơn của khách hàng đã đăng nhập.
- Cho nhân viên/quản lý cập nhật trạng thái đơn ở mức tối thiểu nếu được phân công trong MVP.
- API có kiểm tra dữ liệu đầu vào; có endpoint health check.
- Có dữ liệu mẫu/seed, migration hoặc script khởi tạo DB, README và `.env.example`.
- Có kiểm thử đơn vị cho nghiệp vụ chính, kiểm thử tích hợp API và ít nhất một luồng E2E theo yêu cầu đồ án.

## 5. Phạm vi mở rộng (Should/Could – sau MVP)

- Áp dụng mã khuyến mãi và tích điểm thành viên.
- Quản lý tồn kho nguyên liệu hoặc số lượng bán theo thời gian thực.
- Thông báo qua email/SMS hoặc thông báo đẩy.
- Đánh giá sản phẩm, yêu thích và gợi ý món.
- Dashboard thống kê doanh thu, sản phẩm bán chạy và hiệu suất xử lý đơn.
- Tích hợp cổng thanh toán thật sau khi có tài khoản sandbox/production và được phê duyệt.
- Hỗ trợ nhiều chi nhánh, giờ hoạt động và menu theo chi nhánh.

## 6. Ngoài phạm vi (Out-of-scope)

- Ứng dụng native iOS/Android riêng; MVP là ứng dụng web responsive.
- Bản đồ và định vị giao hàng.
- Tích hợp trực tiếp với hệ thống kế toán, ERP hoặc POS thương mại.
- Xử lý thẻ thanh toán thật hoặc lưu số thẻ/CVV trong hệ thống.
- Tự động tối ưu tuyến giao hàng hoặc quản lý đội ngũ tài xế.
- Chatbot AI, dự báo nhu cầu bằng machine learning.
- Hệ thống phân quyền doanh nghiệp phức tạp hoặc đa tenant.
- Cam kết vận hành production ở quy mô lớn, SLA thương mại hoặc chứng nhận bảo mật chuyên ngành.
- Các chức năng không được mô tả trong SRS hoặc không được nhóm và giảng viên thống nhất.

## 7. Giả định

1. Người dùng có trình duyệt hiện đại và kết nối Internet.
2. Giá, danh mục, hình ảnh và thông tin sản phẩm được nhóm cung cấp bằng dữ liệu mẫu hoặc quản lý qua DB.
3. Cửa hàng có một điểm xử lý đơn trong phạm vi MVP.
4. Dịch vụ thanh toán có thể được mô phỏng; không cần giao dịch tiền thật để nghiệm thu.
5. Khi sử dụng tài khoản, mỗi khách hàng có email duy nhất và mật khẩu được xử lý an toàn ở backend.
6. Nhóm có môi trường Node.js và PostgreSQL để phát triển, kiểm thử.
7. Phí giao hàng, chính sách hủy đơn và các quy tắc giá được xác định thống nhất trước khi viết test.
8. Dữ liệu demo không chứa thông tin cá nhân thật hoặc dữ liệu thanh toán thật.

## 8. Ràng buộc

- Frontend sử dụng Next.js; backend sử dụng NestJS; cơ sở dữ liệu sử dụng PostgreSQL theo đề bài.
- Mã nguồn và tài liệu phải được quản lý trong Git; thay đổi cần có lịch sử commit rõ ràng.
- Không commit `.env`, mật khẩu, JWT secret hoặc thông tin thanh toán thật; cung cấp `.env.example`.
- Cần hỗ trợ giao diện trên màn hình máy tính.
- Các luồng nghiệp vụ phải có tiêu chí chấp nhận và có thể kiểm thử.
- Cấu trúc hiện tại của repository dùng `frontend/` và `backend/`; nếu giảng viên yêu cầu chính xác `apps/web` và `apps/api`, nhóm cần thống nhất việc đổi cấu trúc trước khi tích hợp cuối.
- Thời gian và nhân lực có giới hạn; ưu tiên chức năng Must trước Should/Could.
- Dịch vụ bên ngoài có thể không khả dụng; cần có xử lý lỗi và chế độ thanh toán giả lập.

## 9. Rủi ro ban đầu

| Rủi ro | Ảnh hưởng | Biện pháp giảm thiểu |
|--------|-----------|----------------------|
| Frontend và backend không thống nhất API/data contract | Tích hợp chậm, sai dữ liệu | Chốt schema request/response và mã lỗi trước khi chia việc |
| Quy tắc giá/topping/ship thay đổi muộn | Sai tổng tiền, test phải sửa | Viết rõ công thức tính tiền và tạo test nghiệp vụ |
| Trạng thái đơn không nhất quán | Khách và nhân viên thấy thông tin khác nhau | Định nghĩa enum và các chuyển trạng thái hợp lệ |
| Thanh toán giả lập không xử lý callback/lặp yêu cầu | Tạo đơn hoặc thanh toán trùng | Dùng mã tham chiếu/idempotency key và kiểm thử lặp request |
| Máy thành viên khác nhau về môi trường | Không chạy được khi nghiệm thu | README, `.env.example`, migration/seed, Docker Compose |
| Phạm vi quá lớn so với thời gian | Không hoàn thành MVP | Dùng MoSCoW, khóa phạm vi Must và ghi chức năng mở rộng riêng |

