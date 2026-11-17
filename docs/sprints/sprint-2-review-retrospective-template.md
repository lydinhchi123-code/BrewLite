# Sprint 2 Review and Retrospective

- Date: 14/11/2026
- Participants: Lý Dinh Chi, Lê Anh Kiệt, Đỗ Thị Ngọc Ánh, Huỳnh Nhựt Minh, Ngô Tiến Hiếu, Phạm Thanh Giản
- Sprint duration: 25/10/2026 – 15/11/2026 (3 tuần)
- Sprint goal: Hoàn thiện luồng mua hàng của khách từ trang chủ, menu, giỏ hàng, thanh toán đến xác nhận và xem lại lịch sử đơn hàng, kèm quy trình CI/CD để kiểm tra và triển khai tự động.

## Sprint Review

- Demonstrated end-to-end flow: trang chủ → menu và chi tiết sản phẩm → giỏ hàng → thanh toán → xác nhận đơn hàng → lịch sử đơn hàng
- Accepted work:
  - Trang chủ (Lý Dinh Chi)
  - Menu, chi tiết sản phẩm (Đỗ Thị Ngọc Ánh)
  - Giỏ hàng (Phạm Thanh Giản)
  - Thanh toán (Ngô Tiến Hiếu)
  - Xác nhận đơn hàng (Huỳnh Nhựt Minh)
  - Lịch sử đơn hàng (Lê Anh Kiệt)
  - Phần lớn các hạng mục được giao đã hoàn thành đúng hạn.
- Incomplete work: [điền hạng mục chưa hoàn thành hoặc để lại sprint sau, nếu có]
- Stakeholder feedback: [điền phản hồi và người theo dõi, nếu có]

## Sprint Retrospective

### What went well

- Công việc được phân công trước theo từng trang nên mỗi thành viên biết rõ phần của mình, ít bị trùng việc.
- Các thành viên cố gắng hoàn thành đúng hạn, phần lớn các task được giao đã xong.
- Quy trình CI/CD hoạt động đủ các bước (kiểm tra lint, test, build, đẩy image, triển khai và kiểm tra sau triển khai), giúp phát hiện lỗi sớm.

### What was difficult

- Cách làm "người trước đẩy code lên GitHub, người sau lấy về" dễ gây xung đột và lỗi khi đẩy code, nhất là khi có file được thêm trực tiếp trên GitHub.
- Có nhiều lần phải sửa lại (lỗi E2E, lỗi build image, lỗi lint) vì chưa kiểm tra kỹ ở máy trước khi đẩy code.
- Tài liệu có lúc không khớp với cấu hình thực tế của hệ thống.

### Actions for the next sprint

| Action | Owner | Due date |
| --- | --- | --- |
| Làm việc trên nhánh riêng cho từng task và gộp bằng Pull Request, có người xem lại | Cả nhóm | Từ đầu sprint sau |
| Chạy lint, test, build ở máy trước khi đẩy code | Cả nhóm | Mỗi lần đẩy code |
| Lấy code mới về (git pull) trước khi bắt đầu sửa, không thêm file trực tiếp trên GitHub khi đang làm ở máy | Cả nhóm | Từ đầu sprint sau |
| Đối chiếu tài liệu với cấu hình thực tế trước khi nộp | Cả nhóm | Cuối sprint sau |