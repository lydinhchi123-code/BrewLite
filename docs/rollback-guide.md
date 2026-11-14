# Hướng dẫn Rollback BrewLite trên Render

## 1. Mục đích

Tài liệu này hướng dẫn quy trình rollback (khôi phục phiên bản) ứng dụng BrewLite trên nền tảng Render khi phiên bản Production hiện tại gặp lỗi hoặc hoạt động không ổn định.

Rollback cho phép đưa Frontend và Backend về một phiên bản đã triển khai trước đó nhằm khôi phục hoạt động của hệ thống.

**Lưu ý:** Rollback ứng dụng không tự động khôi phục dữ liệu hoặc cấu trúc của PostgreSQL. Database cần được xử lý riêng nếu có thay đổi không tương thích.

## 2. Thông tin môi trường Production

| Thành phần | Render Service | Địa chỉ |
|---|---|---|
| Frontend | `brewlite-web` | https://brewlite-web-ksd1.onrender.com/ |
| Backend | `brewlite-api` | https://brewlite-api-tutb.onrender.com |
| Health Check | — | https://brewlite-api-tutb.onrender.com/health |
| Database | `brewlite-db` | PostgreSQL trên Render |

**Phiên bản rollback dự kiến:**

- Commit: `7470721`
- Nội dung: `Merge pull request #18 from lydinhchi123-code/task-5.4/production-handover fix: configure production deployment urls`.
- Đây là commit xuất hiện trong lịch sử triển khai của cả Frontend và Backend.

Trước khi thực hiện, cần kiểm tra lại trạng thái deploy tương ứng trên Render để xác nhận phiên bản mục tiêu đã triển khai thành công và tương thích với database hiện tại.

## 3. Điều kiện trước khi rollback

Trước khi tiến hành rollback, cần thực hiện các bước sau:

1. Xác định lỗi đang xảy ra trên môi trường Production.
2. Ghi nhận phiên bản hiện tại của Frontend và Backend.
3. Truy cập Render Dashboard và kiểm tra lịch sử triển khai của hai dịch vụ.
4. Xác định một phiên bản trước đó đã triển khai thành công.
5. Kiểm tra những thay đổi liên quan đến database kể từ phiên bản cần rollback.
6. Thông báo cho các thành viên liên quan trước khi thực hiện.

Không nên chọn phiên bản rollback chỉ dựa trên thời gian triển khai. Cần đối chiếu commit ID và nội dung thay đổi để bảo đảm chọn đúng phiên bản.

## 4. Quy trình rollback trên Render

### 4.1. Rollback Frontend

1. Truy cập [Render Dashboard](https://dashboard.render.com/).
2. Mở dịch vụ `brewlite-web`.
3. Chọn tab **Deploys** để xem lịch sử triển khai.
4. Tìm lần triển khai thành công tương ứng với commit `7470721`.
5. Kiểm tra commit ID và thông tin của lần triển khai.
6. Chọn chức năng **Rollback** tại lần triển khai mục tiêu và xác nhận theo hướng dẫn của Render.
7. Chờ Render hoàn tất quá trình triển khai lại.
8. Kiểm tra trạng thái dịch vụ sau khi rollback.

### 4.2. Rollback Backend

1. Quay lại Render Dashboard.
2. Mở dịch vụ `brewlite-api`.
3. Chọn tab **Deploys**.
4. Tìm lần triển khai thành công tương ứng với commit `7470721`.
5. Kiểm tra commit ID để bảo đảm đúng phiên bản cần khôi phục.
6. Chọn **Rollback** và xác nhận thao tác.
7. Chờ Render hoàn tất quá trình triển khai lại.
8. Kiểm tra trạng thái hoạt động của Backend.

**Lưu ý:** Frontend và Backend cần được rollback về các phiên bản tương thích với nhau để tránh lỗi giao tiếp API do khác biệt giữa các phiên bản.

## 5. Kiểm tra sau khi rollback

Sau khi hoàn tất rollback, tiến hành kiểm tra hoạt động của hệ thống:

| STT | Nội dung kiểm tra | Kết quả mong đợi |
|---|---|---|
| 1 | Truy cập Frontend Production | Website hiển thị bình thường |
| 2 | Truy cập API Health Check | API phản hồi HTTP 200 |
| 3 | Tải danh sách sản phẩm | Dữ liệu sản phẩm hiển thị |
| 4 | Đăng nhập tài khoản | Đăng nhập hoạt động bình thường |
| 5 | Kiểm tra giỏ hàng | Các thao tác giỏ hàng hoạt động |
| 6 | Kiểm tra tạo đơn hàng | Đơn hàng được xử lý bình thường |
| 7 | Kiểm tra log trên Render | Không xuất hiện lỗi nghiêm trọng |

Các địa chỉ cần kiểm tra:

- Frontend: https://brewlite-web-ksd1.onrender.com/
- API Health Check: https://brewlite-api-tutb.onrender.com/health

Đối với chức năng thanh toán, chỉ kiểm tra bằng môi trường VNPay Sandbox hoặc phương thức thanh toán thử nghiệm phù hợp.

## 6. Lưu ý khi rollback Database

Rollback Frontend và Backend trên Render không tự động khôi phục PostgreSQL.

Trong trường hợp phiên bản mới có thay đổi cấu trúc database hoặc dữ liệu không tương thích với phiên bản cũ, cần:

1. Kiểm tra các thay đổi schema và dữ liệu đã được thực hiện.
2. Xác định khả năng tương thích của database với phiên bản ứng dụng cần khôi phục.
3. Kiểm tra bản sao lưu database nếu cần phục hồi.
4. Xây dựng phương án khôi phục database riêng trước khi thực hiện.

Không tự ý xóa database, volume hoặc thực hiện các thao tác khôi phục dữ liệu khi chưa xác định rõ ảnh hưởng.

## 7. Kiểm tra Auto-Deploy sau rollback

Sau khi rollback, kiểm tra lại cấu hình Auto-Deploy của các dịch vụ trên Render.

Nếu Auto-Deploy bị tắt trong quá trình rollback, chỉ bật lại sau khi đã xử lý nguyên nhân sự cố và xác nhận branch được cấu hình chính xác.

Cần bảo đảm không có commit lỗi đang chờ được tự động triển khai trở lại Production.

## 8. Ghi nhận kết quả rollback

Sau khi thực hiện, cần ghi nhận các thông tin sau:

| Nội dung | Thông tin |
|---|---|
| Thời gian thực hiện | [Ngày, giờ] |
| Nguyên nhân rollback | [Mô tả sự cố] |
| Commit Frontend được khôi phục | [Commit ID] |
| Commit Backend được khôi phục | [Commit ID] |
| Trạng thái Frontend | [Thành công/Thất bại] |
| Trạng thái Backend | [Thành công/Thất bại] |
| Kết quả Health Check | [HTTP status] |
| Kết quả kiểm tra chức năng | [Đạt/Không đạt] |
| Tình trạng Database | [Bình thường/Cần phục hồi] |
| Người thực hiện | [Tên người thực hiện] |

## 9. Tiêu chí hoàn tất

Quá trình rollback được xem là hoàn tất khi đáp ứng các điều kiện:

- Frontend và Backend đã được khôi phục về các phiên bản tương thích.
- Website Production có thể truy cập bình thường.
- API Health Check phản hồi thành công với HTTP 200.
- Các chức năng chính của hệ thống hoạt động bình thường.
- Database vẫn có thể kết nối và dữ liệu được xác nhận phù hợp.
- Kết quả rollback được ghi nhận và thông báo cho các thành viên liên quan.