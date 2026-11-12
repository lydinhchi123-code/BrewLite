# BrewLite — triển khai và bàn giao (Task 5.4)

> Nền tảng đã chọn: **Render** cho frontend, API và PostgreSQL. Trạng thái: **chưa triển khai production**; URL và kết quả chỉ điền sau khi deploy thật. Nhóm cần thống nhất người sở hữu tài khoản và gói sử dụng trước khi tạo dịch vụ. Không ghi giá trị secret vào tài liệu này.

## 1. Mục tiêu bàn giao

Người ngoài nhóm có thể mở frontend qua HTTPS, gọi API và health check, chạy dự án theo README, và biết cách khôi phục phiên bản trước nếu deploy lỗi.

| Thành phần | URL / thông tin | Trạng thái |
| --- | --- | --- |
| Frontend production (Render Web Service) | `[CẦN BỔ SUNG sau khi deploy]` | Chưa deploy |
| API production (Render Web Service) | `[CẦN BỔ SUNG sau khi deploy]` | Chưa deploy |
| API health check | `[CẦN BỔ SUNG: https://<api>/health]` | Đã thêm route trong source, chưa deploy |
| GitHub repository | `[CẦN BỔ SUNG]` |  |
| Release/tag | `[CẦN BỔ SUNG]` |  |
| Video/demo end-to-end | `[CẦN BỔ SUNG]` |  |

## 2. Kiến trúc production cần triển khai

```text
Trình duyệt --HTTPS--> Next.js frontend
                          |
                          +--HTTPS--> NestJS API --private connection--> PostgreSQL
```

- Frontend và API phải có URL HTTPS.
- PostgreSQL chỉ cho API (và người quản trị được cấp quyền) kết nối; không mở cổng database ra Internet công khai.
- Dùng dịch vụ quản lý secrets của nền tảng deploy. Không commit `.env`, connection string, JWT secret hay SSH key; không in chúng vào log.
- Frontend cần `NEXT_PUBLIC_API_URL` trỏ tới API production. API cần `PORT`, `DATABASE_URL`, `JWT_SECRET`, và `FRONTEND_URL` đúng domain frontend để cấu hình CORS.

## 3. Các bước triển khai

### 3.1 Chốt và chuẩn bị môi trường

1. Nhóm thống nhất người sở hữu Render workspace. Kiểm tra gói/giới hạn chi tiêu trước khi tạo dịch vụ.
2. Đưa repository lên GitHub và bảo đảm Render được cấp quyền đọc repo. Thêm file `render.yaml` ở thư mục gốc repo.
3. Trong Render Dashboard chọn **New → Blueprint**, kết nối repo/branch chứa `render.yaml`, đọc lại danh sách resources và gói Free trước khi bấm deploy.
4. Blueprint cấu hình 2 Web Service (`apps/api`, `apps/web`) và PostgreSQL cùng region Singapore. Nó tạo `JWT_SECRET`, nối API bằng Internal Database URL, truyền `FRONTEND_URL`/`NEXT_PUBLIC_API_URL` từ URL dịch vụ Render và đặt `ipAllowList: []` cho database.
5. Xác định cách khởi tạo schema và dữ liệu ban đầu. Repo có SQL trong `database/` và migration trong `database/migrations/`; nhờ thành viên backend xác nhận thứ tự chạy trước khi áp dụng lên production. Không chạy migrations tùy ý trên DB production.
6. Sau lần deploy đầu, điền URL thật vào bảng ở mục 1 và kết quả smoke test ở mục 3.2. Không ghi `DATABASE_URL` hay giá trị secret vào tài liệu.

### 3.2 Deploy và kiểm tra

1. Deploy API; xác nhận ứng dụng lắng nghe trên `PORT` do Render cấp và kết nối PostgreSQL bằng private/internal URL.
2. API hiện có `GET /health` trả `{ "status": "ok" }`; Render Blueprint dùng path `/health`. Kiểm tra URL công khai sau khi deploy.
3. Deploy frontend với `NEXT_PUBLIC_API_URL` là URL API HTTPS; cấu hình `FRONTEND_URL` trong API khớp domain frontend.
4. Mở frontend bằng HTTPS; kiểm tra tải menu, đăng nhập/đặt hàng/thanh toán theo phạm vi MVP, rồi kiểm tra API và health check trả về thành công.
5. Thực hiện kiểm tra smoke test sau mỗi lần deploy và lưu kết quả (không chụp hay ghi lộ secrets).

Kết quả kiểm tra:

| Kiểm tra | Kết quả / ngày | Minh chứng |
| --- | --- | --- |
| Frontend HTTPS mở được | `[CẦN BỔ SUNG]` | `[link ảnh/log đã che thông tin nhạy cảm]` |
| API phản hồi được | `[CẦN BỔ SUNG]` |  |
| Health check thành công | `[CẦN BỔ SUNG]` |  |
| Luồng end-to-end thành công | `[CẦN BỔ SUNG]` | `[link video/demo]` |
| Database không public trực tiếp | `[CẦN BỔ SUNG]` | `[mô tả cấu hình mạng, không ghi credential]` |

## 4. Release, rollback và bàn giao

### Release

1. Chỉ phát hành commit đã được nhóm review và CI chấp nhận.
2. Tạo tag phiên bản theo quy ước nhóm, ví dụ `v1.0.0`, và tạo GitHub Release.
3. Release notes ghi phiên bản/ngày, thay đổi chính, migrations cần chạy, và vấn đề đã biết. Không đưa secrets vào release notes.

### Rollback

1. Dừng phát hành tiếp theo và ghi nhận phiên bản production đang lỗi.
2. Dùng trang Events/Deploys của Render để rollback về deploy ổn định trước đó, hoặc deploy lại commit ổn định. Render Free giới hạn rollback về các deploy gần nhất.
3. Kiểm tra lại frontend, API và health check; xác nhận tương thích database trước khi rollback migration. Không tự động xóa/đảo migration dữ liệu nếu chưa có kế hoạch phục hồi.
4. Ghi kết quả và nguyên nhân vào release/incident notes.

Chi tiết deploy ID và commit đã rollback: `[CẦN BỔ SUNG sau khi deploy]`.

### Giới hạn cần biết trước khi dùng gói miễn phí

- Render Free Web Service có thể spin down sau 15 phút không có request và cần khoảng một phút để khởi động lại; lần truy cập đầu có thể chậm.
- Render Free PostgreSQL hết hạn sau 30 ngày và không có backup. Nếu cần database tồn tại lâu hơn hoặc cần backup, nhóm cần hạ tầng trường cấp hoặc gói phù hợp (có thể phát sinh phí).
- Kiểm tra billing/spend limit trước khi tạo dịch vụ. Không nhập phương thức thanh toán hoặc nâng gói nếu nhóm chưa thống nhất ngân sách.

## 5. Hướng dẫn chạy local, test và build

Hướng dẫn chi tiết cho thành viên mới đặt trong `README.md`. Tối thiểu cần nêu:

- phiên bản Node.js và PostgreSQL yêu cầu;
- cách tạo `.env` local từ `.env.example` và cách tạo database/schema/seed;
- lệnh cài dependency, chạy frontend và API;
- lệnh lint, test, build;
- nơi cấu hình secrets và các bước deploy/rollback theo Render như hướng dẫn bên trên.

Lệnh hiện có trong từng ứng dụng:

```bash
cd apps/api && npm ci && npm run build
cd apps/web && npm ci && npm run build
```

Các lệnh trên chỉ build ứng dụng; chúng không tự deploy production.

## 6. Demo và Sprint Review/Retrospective

- Demo video cần thể hiện luồng từ mở menu tới xác nhận đơn trên phiên bản production, và hiển thị các URL đã bàn giao.
- Sprint Review: ghi người tham gia, nội dung đã demo, phản hồi và các việc tiếp theo.
- Sprint Retrospective: ghi điều làm tốt, khó khăn, bài học và hành động cải thiện cho sprint sau.

Biên bản/link: `[CẦN BỔ SUNG]`.

## 7. Checklist nghiệm thu Task 5.4

- [ ] Frontend production mở được qua HTTPS.
- [ ] API production và health check truy cập được.
- [ ] PostgreSQL không public trực tiếp.
- [ ] Secrets không có trong repository hoặc log CI.
- [ ] Có release/tag và release notes.
- [ ] README hướng dẫn local, test, build, deploy và rollback.
- [ ] Có video/demo luồng end-to-end.
- [ ] Có Sprint Review và Sprint Retrospective.
- [ ] Người ngoài nhóm làm theo README được và truy cập được production.
