# BrewLite – Software Requirements Specification (SRS rút gọn)
- **Phiên bản:** 1.0
- **Liên quan:** Task 1.2 – Yêu cầu chức năng, phi chức năng và tiêu chí chấp nhận.
- **Đối tượng:** Khách hàng, quản trị viên (Admin), nhóm phát triển và giảng viên/khách hàng nghiệm thu.

## 1. Mục đích và quy ước
Tài liệu mô tả hành vi mà MVP BrewLite phải cung cấp. Đây là đặc tả yêu cầu, không khẳng định tất cả chức năng đã được triển khai trong mã nguồn hiện tại.

**MoSCoW**
- **Must:** bắt buộc cho MVP.
- **Should:** quan trọng nhưng có thể lùi nếu thiếu thời gian.
- **Could:** có thể thực hiện khi còn nguồn lực.
- **Won't:** không triển khai trong bản phát hành MVP hiện tại.

## 2. Actor hệ thống
- **Khách hàng:** Xem menu, tùy chỉnh món, quản lý giỏ hàng, đăng ký/đăng nhập, đặt hàng, thanh toán và xem lịch sử đơn hàng.
- **Admin:** Truy cập khu vực quản trị để xem thông tin tổng quan, quản lý đơn hàng, theo dõi tồn kho, quản lý công thức pha chế và mã giảm giá.
- **Dịch vụ thanh toán giả lập:** Nhận yêu cầu thanh toán và trả về kết quả thành công/thất bại.

## 3. Yêu cầu chức năng (FR)

| ID | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận kiểm chứng được |
|----|---------|---------|------------------------------------|
| FR-01 | Hệ thống hiển thị danh sách sản phẩm còn được phép bán, gồm tên, ảnh, danh mục, mô tả và giá. | Must | Khi API trả về danh sách có dữ liệu, menu hiển thị đúng các trường của từng sản phẩm; khi danh sách rỗng, hiển thị thông báo rỗng thay vì lỗi. |
| FR-02 | Khách hàng tìm kiếm theo tên và lọc theo danh mục. | Should | Từ khóa không phân biệt hoa/thường; kết quả chỉ gồm sản phẩm khớp từ khóa và danh mục đã chọn; có thể xóa bộ lọc để xem lại toàn bộ. |
| FR-03 | Khách hàng xem chi tiết sản phẩm và tùy chọn kích cỡ, lượng đường, lượng đá, topping theo cấu hình sản phẩm. | Must | Trang chi tiết hiển thị đúng tên, mô tả, giá cơ bản và tùy chọn hợp lệ; tùy chọn không được hỗ trợ không thể gửi lên đơn. |
| FR-04 | Khách hàng thêm sản phẩm đã chọn vào giỏ hàng. | Must | Sau khi thêm, số lượng trong biểu tượng giỏ tăng đúng; các lựa chọn khác nhau được phân biệt thành dòng hàng phù hợp. |
| FR-05 | Khách hàng cập nhật số lượng hoặc xóa dòng hàng khỏi giỏ. | Must | Số lượng được phép là số nguyên dương; khi giảm về 0, dòng hàng bị xóa; tổng tiền cập nhật đúng sau mỗi thay đổi. |
| FR-06 | Hệ thống tính tạm tính, phụ phí và tổng tiền theo quy tắc đã công bố. | Must | Với bộ dữ liệu kiểm thử xác định trước, tổng tiền hiển thị bằng tổng giá từng dòng và các phụ phí hợp lệ; frontend không phải nguồn dữ liệu cuối cùng để xác định giá khi tạo đơn. |
| FR-07 | Khách hàng đăng ký tài khoản bằng các thông tin bắt buộc và đăng nhập bằng email/mật khẩu. | Must | Dữ liệu hợp lệ tạo được tài khoản; email trùng bị từ chối; thông tin sai không đăng nhập được; mật khẩu không lưu dạng rõ. |
| FR-08 | Backend xác thực phiên đăng nhập và kiểm tra quyền truy cập tài nguyên cá nhân. | Must | Request không có token hợp lệ tới endpoint cần đăng nhập nhận 401; người dùng không thể đọc đơn của tài khoản khác và nhận 403 hoặc 404 theo chính sách API. |
| FR-09 | Khách hàng tạo đơn từ giỏ hàng với thông tin liên hệ/giao nhận và ghi chú nếu có. | Must | Dữ liệu hợp lệ tạo một mã đơn; đơn và các dòng hàng được lưu trong DB; dữ liệu thiếu/sai bị từ chối với thông báo có thể hiểu được. |
| FR-10 | Hệ thống kiểm tra giá và tính hợp lệ của sản phẩm ở backend trước khi lưu đơn. | Must | Nếu sản phẩm không tồn tại, ngừng bán hoặc tùy chọn không hợp lệ, API từ chối tạo đơn và không lưu đơn dở dang. |
| FR-11 | Khách hàng chọn phương thức thanh toán được MVP hỗ trợ, tối thiểu COD và/hoặc thanh toán giả lập. | Must | Phương thức đã chọn được lưu đúng; hệ thống không báo đã thanh toán thành công nếu dịch vụ giả lập trả thất bại. |
| FR-12 | Hệ thống ghi nhận kết quả thanh toán thành công/thất bại và liên kết kết quả với đúng đơn. | Must | Khi mô phỏng thành công, trạng thái thanh toán cập nhật đúng; khi thất bại, hệ thống hiển thị lỗi và không đánh dấu đơn là đã thanh toán; request lặp không tạo giao dịch ghi nhận trùng. |
| FR-13 | Sau khi đặt đơn thành công, khách hàng nhận màn hình xác nhận có mã đơn và thông tin tóm tắt. | Must | Màn hình xác nhận hiển thị mã đơn, dòng hàng và tổng tiền tương ứng với dữ liệu đã lưu. |
| FR-14 | Khách hàng xem danh sách lịch sử đơn thuộc tài khoản của mình. | Must | Danh sách chỉ trả về đơn của người dùng đang đăng nhập; đơn mới nhất được hiển thị trước hoặc có thứ tự được công bố. |
| FR-15 | Khách hàng xem trạng thái hiện tại và chi tiết một đơn. | Must | Mã đơn hợp lệ của chính khách hàng hiển thị trạng thái hiện tại; mã không tồn tại hoặc không thuộc quyền truy cập không làm lộ dữ liệu. |
| FR-16 | Admin xem danh sách, chi tiết đơn hàng và cập nhật trạng thái đơn theo quy trình cho phép. | Must | Admin có thể xem thông tin đơn hàng và cập nhật trạng thái theo quyền được cấp; chuyển trạng thái không hợp lệ bị từ chối; trạng thái mới được lưu và phản ánh khi tải lại. |
| FR-17 | Hệ thống hiển thị trạng thái loading, empty và error khi tải dữ liệu. | Must | Khi API đang chờ, lỗi hoặc trả danh sách rỗng, giao diện hiển thị đúng trạng thái tương ứng và không bị treo vô hạn. |
| FR-18 | Hệ thống cung cấp endpoint health check cho việc kiểm tra tình trạng backend. | Must | `GET /health` trả HTTP 200 khi ứng dụng sẵn sàng; nếu có kiểm tra DB thì kết quả phản ánh được DB không khả dụng theo thiết kế. |
| FR-19 | Hệ thống hỗ trợ dữ liệu mẫu và cách khởi tạo cơ sở dữ liệu lặp lại được. | Must | Thành viên mới làm theo README, cấu hình `.env` từ mẫu và chạy migration/seed có thể tạo môi trường phát triển có dữ liệu kiểm thử. |
| FR-20 | Hệ thống ghi nhận lỗi nghiệp vụ và lỗi hệ thống ở mức đủ để chẩn đoán. | Should | Log có thời điểm, mức độ và thông tin lỗi cần thiết; không ghi mật khẩu, token đầy đủ hoặc dữ liệu thanh toán nhạy cảm. |
| FR-21 | Khách hàng áp dụng mã giảm giá hợp lệ khi đặt hàng. | Should | Khi nhập mã giảm giá hợp lệ và đáp ứng điều kiện áp dụng, hệ thống tính lại tổng tiền đơn hàng chính xác; mã không hợp lệ hoặc hết hạn không được áp dụng và hiển thị thông báo phù hợp. |
| FR-22 | Hệ thống gửi email/SMS thông báo trạng thái đơn. | Won't (this release) | Không bắt buộc trong MVP; khi chưa cấu hình nhà cung cấp, hệ thống vẫn đặt đơn và xem trạng thái được. |
| FR-23 | Admin xem thông tin và số liệu tổng quan về hoạt động kinh doanh của hệ thống. | Must | Khi truy cập trang Tổng quan, hệ thống hiển thị các số liệu được tổng hợp từ dữ liệu hiện có; khi không có dữ liệu, giao diện hiển thị giá trị hoặc trạng thái rỗng phù hợp. |
| FR-24 | Admin xem và quản lý thông tin tồn kho nguyên liệu. | Must | Admin có thể xem thông tin nguyên liệu và số lượng tồn kho; các thao tác cập nhật hợp lệ được lưu vào DB và phản ánh khi tải lại. |
| FR-25 | Admin xem và quản lý công thức pha chế của sản phẩm. | Must | Admin có thể xem thông tin công thức pha chế; các thao tác thêm, sửa hoặc xóa công thức được lưu chính xác nếu các chức năng này được hỗ trợ. |
| FR-26 | Admin xem và quản lý mã giảm giá. | Must | Admin có thể xem thông tin mã giảm giá; các thao tác thêm, sửa hoặc xóa mã được lưu chính xác nếu các chức năng này được hỗ trợ. |


## 4. Yêu cầu phi chức năng (NFR)

| ID | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận kiểm chứng được |
|---|---|---|---|
| NFR-01 | Hiệu năng: các trang menu thông thường phải phản hồi nhanh với bộ dữ liệu demo. | Should | Trong môi trường nghiệm thu đã thống nhất, 95% request `GET /products` hoàn thành dưới 1 giây với 100 sản phẩm mẫu, không tính thời gian mạng bên ngoài. |
| NFR-02 | Hiệu năng: thao tác tạo đơn phải có phản hồi trong thời gian hợp lý. | Should | Với DB cục bộ và dịch vụ thanh toán giả lập, 95% request tạo đơn hoàn thành dưới 2 giây khi không có lỗi phụ thuộc ngoài. |
| NFR-03 | Bảo mật mật khẩu. | Must | Mật khẩu được băm bằng thuật toán phù hợp như bcrypt/Argon2; kiểm tra DB không thấy mật khẩu dạng rõ. |
| NFR-04 | Bảo mật API và quyền riêng tư dữ liệu. | Must | Endpoint riêng tư yêu cầu xác thực; người dùng A không thể đọc/sửa đơn của người dùng B; lỗi API không trả stack trace cho client ở môi trường production. |
| NFR-05 | Bảo vệ secrets. | Must | `.env` bị loại khỏi Git; repository chỉ chứa `.env.example` không có giá trị bí mật thật. |
| NFR-06 | Tính khả dụng và khả năng phục hồi lỗi giao diện. | Must | Khi API gặp lỗi hoặc phản hồi quá thời gian chờ được cấu hình, giao diện hiển thị thông báo phù hợp và cung cấp khả năng thử lại; không hiển thị màn hình trắng do lỗi tải dữ liệu thông thường. |
| NFR-07 | Khả năng sử dụng và responsive. | Must | Giao diện Khách hàng và Admin sử dụng được trên màn hình desktop 1280px; các luồng chính của khách hàng sử dụng được ở viewport 375px. Không xuất hiện tràn ngang tại các kích thước màn hình kiểm thử. |
| NFR-08 | Khả năng bảo trì. | Should | Frontend, backend, tài liệu và script DB được tổ chức rõ; các quy tắc nghiệp vụ chính có test; thay đổi API được ghi lại. |
| NFR-09 | Khả năng triển khai lặp lại. | Must | README mô tả cấu hình, chạy ứng dụng, migration/seed và kiểm thử; nhóm có thể dựng lại môi trường theo hướng dẫn trên một máy phát triển sạch. |
| NFR-10 | Khả năng kiểm thử. | Must | CI chạy lint, unit test và build; pipeline báo thất bại khi một bước bắt buộc không thành công. |
| NFR-11 | Tính toàn vẹn dữ liệu đơn hàng. | Must | Tạo đơn và các dòng đơn được lưu trong một transaction; nếu một bước bắt buộc thất bại, không để lại đơn thiếu dữ liệu. |
| NFR-12 | Khả năng tương thích. | Should | Kiểm tra các luồng chính trên phiên bản gần đây của Chrome/Edge; lỗi hiển thị nghiêm trọng không được tồn tại trong các luồng nghiệm thu. |

## 5. Quy tắc nghiệp vụ và dữ liệu

1. Giá sản phẩm và các khoản phụ phí phải được backend xác minh trước khi tạo đơn; không sử dụng giá do client gửi lên làm dữ liệu cuối cùng.
2. Tổng tiền đơn hàng được tính từ giá sản phẩm hiện hành, tùy chọn hợp lệ, số lượng và các khoản phụ phí theo quy tắc nghiệp vụ đã thống nhất.
3. Mỗi đơn hàng có mã đơn duy nhất và thời điểm tạo.
4. Đơn hàng thuộc về một khách hàng; khách hàng chỉ được xem đơn hàng thuộc tài khoản của mình. Admin được xem và quản lý đơn hàng theo quyền được cấp.
5. Các trạng thái đơn hàng phải được định nghĩa thống nhất, gồm: `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`. Không cho phép chuyển trạng thái tùy ý.
6. Trạng thái thanh toán được quản lý riêng với trạng thái xử lý đơn hàng, ví dụ: `UNPAID`, `PAID`, `FAILED`, `REFUNDED`.
7. Với thanh toán giả lập, kết quả chỉ phục vụ mục đích học tập và kiểm thử, không đại diện cho giao dịch tiền thật.
8. Các chức năng quản trị tồn kho, công thức pha chế và mã giảm giá chỉ được thực hiện thông qua tài khoản có quyền Admin.
9. Thông tin tồn kho phải được lưu trữ và cập nhật nhất quán theo các thao tác quản lý được hệ thống hỗ trợ.
10. Công thức pha chế phải được liên kết với sản phẩm tương ứng để phục vụ việc quản lý thông tin pha chế.
11. Mã giảm giá phải đáp ứng các điều kiện áp dụng đã được cấu hình trước khi được sử dụng cho đơn hàng (nếu chức năng áp dụng mã giảm giá được triển khai).

## 6. Use-case tổng quát của toàn hệ thống

Sơ đồ Use Case tổng quát mô tả các chức năng chính mà hai nhóm người dùng Khách hàng và Admin có thể thực hiện trong hệ thống BrewLite, cùng với sự tương tác của dịch vụ thanh toán giả lập.

**Các nhóm chức năng của Khách hàng:**
- Xem menu, tìm kiếm và lọc sản phẩm.
- Xem chi tiết và tùy chỉnh sản phẩm.
- Quản lý giỏ hàng.
- Đăng ký và đăng nhập.
- Đặt và thanh toán đơn hàng.
- Xem lịch sử và trạng thái đơn hàng.

**Các nhóm chức năng của Admin:**
- Xem thông tin tổng quan.
- Quản lý đơn hàng.
- Quản lý tồn kho.
- Quản lý công thức pha chế.
- Quản lý mã giảm giá.

**Dịch vụ thanh toán giả lập:** Tham gia xử lý yêu cầu thanh toán khi khách hàng lựa chọn phương thức thanh toán giả lập.

Sơ đồ PlantUML được lưu tại `docs/diagrams/use-case-overview.png`.

## 7. Điều kiện nghiệm thu SRS

- Mọi FR/NFR có ID duy nhất, mức ưu tiên và tiêu chí chấp nhận kiểm chứng được.
- Mỗi FR có liên kết trong `traceability-matrix.md` tới use case hoặc kiểm thử dự kiến.
- Các yêu cầu Must là cơ sở lập kế hoạch MVP; Should/Could/Won't không được ngầm hiểu là đã triển khai.
- Quy tắc giá, trạng thái đơn, trạng thái thanh toán và API contract phải được nhóm thống nhất trước khi triển khai tích hợp.
- Các chức năng thuộc khu vực Admin phải được đặc tả đầy đủ, bao gồm: Tổng quan, Đơn hàng, Tồn kho, Công thức pha chế và Mã giảm giá.
- Các yêu cầu chức năng phải thống nhất với phạm vi giao diện thực tế của hệ thống, không đặc tả giao diện riêng cho nhân viên quầy hoặc quản lý cửa hàng trong MVP.