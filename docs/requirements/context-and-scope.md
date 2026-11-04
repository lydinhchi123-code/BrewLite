# Task 1 – Bối cảnh, Stakeholder và Phạm vi

- **Dự án:** BrewLite – Hệ thống đặt đồ uống trực tuyến cho cửa hàng cà phê.
- **Phiên bản tài liệu:** 1.0
- **Phạm vi:** Task 1.1 – Bối cảnh, stakeholder và phạm vi.
- **Công nghệ dự kiến:** Next.js (frontend), NestJS (backend), PostgreSQL (database), dịch vụ thanh toán giả lập trong môi trường đồ án.

## 1. Bối cảnh và vấn đề nghiệp vụ

BrewLite là hệ thống web hỗ trợ khách hàng xem thực đơn và đặt đồ uống trực tuyến. Nếu cửa hàng chỉ tiếp nhận đơn trực tiếp hoặc thông qua các kênh thủ công, khách hàng có thể gặp khó khăn trong việc tra cứu thông tin sản phẩm, tùy chỉnh đồ uống, tính tổng tiền và theo dõi trạng thái đơn hàng. Nhân viên cũng có thể mất thời gian ghi nhận đơn, kiểm tra thông tin và cập nhật tình trạng xử lý.

BrewLite hướng đến việc tập trung quy trình xem menu, lựa chọn tùy chỉnh đồ uống, quản lý giỏ hàng, tạo đơn, thanh toán và tra cứu đơn hàng trên một hệ thống thống nhất.

Hệ thống gồm hai khu vực chính:
- **Khu vực Khách hàng:** Cho phép khách hàng xem sản phẩm, lựa chọn đồ uống, quản lý giỏ hàng, đặt hàng, thanh toán.
- **Khu vực Admin:** Cho phép quản trị viên quản lý các thông tin và hoạt động của hệ thống như sản phẩm,  đơn hàng, công thức pha chế và quản lý mã giảm giá.

Phạm vi đồ án tập trung vào việc xây dựng MVP có thể kiểm thử và triển khai. Các chức năng nâng cao như tích hợp thanh toán thật, quản lý nhiều chi nhánh hoặc ứng dụng di động riêng không thuộc mục tiêu bắt buộc ban đầu.

## 2. Mục tiêu sản phẩm

1. Cho phép khách hàng xem menu và thông tin sản phẩm rõ ràng.
2. Hỗ trợ khách hàng lựa chọn kích cỡ, lượng đường, lượng đá và topping nếu sản phẩm có hỗ trợ.
3. Tính chính xác tạm tính, phí giao hàng (nếu áp dụng) và tổng thanh toán.
4. Cho phép khách hàng tạo đơn, lựa chọn phương thức thanh toán được hỗ trợ, sửa dụng mã giảm giá có điều kiện hợp lệ và nhận xác nhận đơn hàng.
5. Cho phép khách hàng tra cứu trạng thái và lịch sử đơn hàng.
6. Cung cấp khu vực Admin để quản lý thông tin sản phẩm,  đơn hàng, công thức pha chế và quản lý mã giảm giá.
7. Đảm bảo ứng dụng có thể được cài đặt và chạy lại theo hướng dẫn cấu hình môi trường, migration và dữ liệu mẫu.

## 3. Stakeholder

| Stakeholder | Vai trò / nhu cầu | Mục tiêu và kỳ vọng | Mức ảnh hưởng |
|-------------|-------------------|---------------------|---------------|
| Khách hàng | Người xem menu, tùy chỉnh đồ uống và đặt hàng trực tuyến | Menu dễ hiểu; giá và tổng tiền rõ ràng; thao tác đơn giản; nhận kết quả đặt hàng và theo dõi trạng thái đơn | Cao |
| Nhân viên quầy | Người tiếp nhận và xử lý các đơn hàng của cửa hàng | Nhận được thông tin đơn chính xác; dễ theo dõi và phối hợp xử lý đơn hàng | Trung bình |
| Quản lý cửa hàng | Người theo dõi hoạt động kinh doanh và quản lý cửa hàng | Nắm được tình trạng đơn hàng, thông tin sản phẩm và hoạt động vận hành | Cao |
| Giảng viên / khách hàng nghiệm thu | Người đánh giá sản phẩm theo yêu cầu đồ án | Có tài liệu đầy đủ, tiêu chí nghiệm thu kiểm chứng được, sản phẩm có thể demo và kiểm thử lại | Cao |
| Nhóm phát triển | Nhóm phân tích, thiết kế, lập trình, kiểm thử và triển khai hệ thống | Yêu cầu rõ ràng; mã nguồn có cấu trúc; dễ tích hợp, kiểm thử và bảo trì | Cao |
| Đơn vị / dịch vụ thanh toán | Đơn vị xử lý kết quả thanh toán khi được tích hợp | Nhận đúng dữ liệu giao dịch; trả kết quả thành công/thất bại; hạn chế ghi nhận giao dịch trùng | Trung bình; MVP sử dụng dịch vụ mô phỏng |

**Lưu ý:** Nhân viên quầy và quản lý cửa hàng là các stakeholder có nhu cầu nghiệp vụ liên quan đến hoạt động của cửa hàng. Hệ thống không xây dựng giao diện riêng cho từng vai trò này; các chức năng quản trị được thực hiện thông qua khu vực Admin theo phạm vi phân quyền được triển khai.

## 4. Phạm vi MVP (In-scope)

### 4.1. Khu vực Khách hàng

- Hiển thị menu sản phẩm: tên, hình ảnh, mô tả, danh mục và giá.
- Tìm kiếm và lọc sản phẩm theo tên hoặc danh mục ở mức cơ bản.
- Xem chi tiết sản phẩm và lựa chọn kích cỡ, lượng đường, lượng đá, topping nếu sản phẩm được hỗ trợ.
- Thêm, xóa, tăng hoặc giảm số lượng sản phẩm trong giỏ hàng.
- Tính tạm tính và tổng đơn theo quy tắc được công bố trong giao diện.
- Đăng ký và đăng nhập bằng tài khoản, mật khẩu.
- Tạo đơn hàng và lưu đơn cùng các dòng sản phẩm vào PostgreSQL.
- Hỗ trợ phương thức thanh toán COD và/hoặc luồng thanh toán giả lập.
- Hiển thị trang xác nhận sau khi tạo đơn thành công.
- Tra cứu trạng thái đơn hàng hiện tại và lịch sử đơn của khách hàng đã đăng nhập.

### 4.2. Khu vực Admin

- Đăng nhập và truy cập khu vực quản trị.
- Xem thông tin tổng quan hoạt động của hệ thống.
- Xem và quản lý đơn hàng, cập nhật trạng thái đơn hàng.
- Theo dõi và quản lý thông tin tồn kho.
- Quản lý công thức pha chế sản phẩm.
- Quản lý mã giảm giá.

### 4.3. Yêu cầu kỹ thuật và triển khai

- API có kiểm tra dữ liệu đầu vào và xử lý lỗi phù hợp.
- Có endpoint health check để kiểm tra tình trạng backend.
- Có dữ liệu mẫu/seed, migration hoặc script khởi tạo database.
- Có README, `.env.example` và hướng dẫn cài đặt, chạy dự án.
- Có kiểm thử đơn vị cho nghiệp vụ chính, kiểm thử tích hợp API và ít nhất một luồng E2E theo yêu cầu đồ án.

## 5. Phạm vi mở rộng (Should/Could – sau MVP)

- Tích điểm thành viên.
- Thông báo qua email/SMS hoặc thông báo đẩy.
- Đánh giá sản phẩm và gợi ý món.
- Dashboard thống kê doanh thu, sản phẩm bán chạy và hiệu suất xử lý đơn.
- Tích hợp cổng thanh toán thật sau khi có tài khoản sandbox/production và được phê duyệt.
- Hỗ trợ nhiều chi nhánh, giờ hoạt động và menu theo chi nhánh.

## 6. Ngoài phạm vi (Out-of-scope)

- Xây dựng ứng dụng native iOS/Android riêng; MVP tập trung vào ứng dụng web responsive.
- Bản đồ và định vị giao hàng.
- Tích hợp trực tiếp với hệ thống kế toán, ERP hoặc POS thương mại.
- Xử lý thẻ thanh toán thật hoặc lưu số thẻ/CVV trong hệ thống.
- Tự động tối ưu tuyến giao hàng hoặc quản lý đội ngũ tài xế.
- Chatbot AI và dự báo nhu cầu bằng machine learning.
- Xây dựng giao diện riêng cho nhân viên quầy và quản lý cửa hàng ngoài khu vực Admin.
- Hệ thống phân quyền doanh nghiệp phức tạp hoặc đa tenant.
- Cam kết vận hành production ở quy mô lớn, SLA thương mại hoặc chứng nhận bảo mật chuyên ngành.
- Các chức năng không được mô tả trong SRS hoặc không được nhóm và giảng viên thống nhất.

## 7. Giả định

1. Người dùng có trình duyệt hiện đại và kết nối Internet.
2. Giá, danh mục, hình ảnh và thông tin sản phẩm được nhóm cung cấp bằng dữ liệu quản lý qua database.
3. Cửa hàng có một điểm xử lý đơn trong phạm vi MVP.
4. Dịch vụ thanh toán có thể được mô phỏng; không cần giao dịch tiền thật để nghiệm thu.
5. Khi sử dụng tài khoản, mỗi khách hàng có email duy nhất và mật khẩu được xử lý an toàn ở backend.
6. Nhóm có môi trường Node.js và PostgreSQL để phát triển, kiểm thử.
7. Phí giao hàng và các quy tắc giá được xác định thống nhất trước khi viết test.
8. Dữ liệu demo không chứa thông tin cá nhân thật hoặc dữ liệu thanh toán thật.
9. Các chức năng quản trị được thực hiện thông qua khu vực Admin; quyền truy cập được kiểm soát theo tài khoản và quyền được cấp.

## 8. Ràng buộc

- Frontend sử dụng Next.js; backend sử dụng NestJS; cơ sở dữ liệu sử dụng PostgreSQL theo định hướng công nghệ của dự án.
- Mã nguồn và tài liệu phải được quản lý trong Git; thay đổi cần có lịch sử commit rõ ràng.
- Không commit `.env`, mật khẩu, JWT secret hoặc thông tin thanh toán thật; cung cấp `.env.example`.
- Giao diện cần hỗ trợ màn hình máy tính và các kích thước màn hình phù hợp với ứng dụng web responsive.
- Các luồng nghiệp vụ phải có tiêu chí chấp nhận và có thể kiểm thử.
- Cấu trúc hiện tại của repository sử dụng `apps/web` và `apps/api`
- Thời gian và nhân lực có giới hạn; ưu tiên chức năng Must trước Should/Could.
- Dịch vụ bên ngoài có thể không khả dụng; cần có xử lý lỗi và phương án thanh toán giả lập.

## 9. Rủi ro ban đầu

| Rủi ro | Ảnh hưởng | Biện pháp giảm thiểu |
|--------|-----------|----------------------|
| Frontend và backend không thống nhất API/data contract | Tích hợp chậm, sai dữ liệu | Chốt schema request/response và mã lỗi trước khi chia việc |
| Quy tắc giá, topping và phí giao hàng thay đổi muộn | Sai tổng tiền, test phải sửa | Viết rõ công thức tính tiền và tạo test nghiệp vụ |
| Trạng thái đơn không nhất quán | Khách hàng và Admin thấy thông tin khác nhau | Định nghĩa enum và các chuyển trạng thái hợp lệ |
| Thanh toán giả lập không xử lý callback hoặc request lặp | Tạo đơn hoặc ghi nhận thanh toán trùng | Dùng mã tham chiếu/idempotency key và kiểm thử request lặp |
| Môi trường phát triển giữa các thành viên khác nhau | Không chạy được khi nghiệm thu | Cung cấp README, `.env.example`, migration/seed và Docker Compose nếu cần |
| Phạm vi quá lớn so với thời gian | Không hoàn thành MVP | Sử dụng MoSCoW, ưu tiên chức năng Must và ghi chức năng mở rộng riêng |
| Phân quyền khu vực Admin chưa rõ ràng | Người không có quyền có thể truy cập chức năng quản trị | Xác định quyền truy cập và kiểm thử các API quản trị |

