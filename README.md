# BrewLite
Ứng dụng web đặt đồ uống trực tuyến, cho phép người dùng tìm kiếm và lựa chọn đồ uống thông qua giao diện website.

## 1. Công nghệ sử dụng

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL
- **Kết nối database:** PostgreSQL (`pg`)
- **Version control:** Git, GitHub

## 2. Cấu trúc dự án

```text
BrewLite/
├── apps/
│   ├── api/              # Backend - NestJS
│   └── web/              # Frontend - Next.js
├── database/             # Tài liệu và dữ liệu cơ sở dữ liệu
├── docs/                 # Tài liệu phân tích và thiết kế
├── .env.example          # File mẫu cấu hình môi trường
├── .gitignore            # Các file không đưa lên Git
└── README.md             # Tài liệu giới thiệu dự án
```

## 3. Yêu cầu môi trường

- Node.js 24 và npm
- Git
- PostgreSQL (phục vụ tích hợp cơ sở dữ liệu)

## 4. Cài đặt và chạy dự án

Từ thư mục gốc, tạo file môi trường local từ mẫu:

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

Trong `apps/api/.env`, thay `DATABASE_URL` bằng kết nối PostgreSQL local và đặt một `JWT_SECRET` chỉ dùng cho máy local. Trong `apps/web/.env.local`, đặt `NEXT_PUBLIC_API_URL=http://localhost:3001`. Không đưa `.env` hoặc `.env.local` lên GitHub.

Trước khi chạy các chức năng dùng database, tạo database và áp dụng các SQL/migration trong `database/`. Hỏi thành viên backend về thứ tự chạy và dữ liệu seed hiện hành; không tự chạy migration production.

### 4.1. Frontend

Mở terminal tại thư mục gốc dự án:

```bash
cd apps/web
npm ci
npm run dev
```

Truy cập: http://localhost:3000

### 4.2. Backend

Mở một terminal khác tại thư mục gốc dự án:

```bash
cd apps/api
npm ci
npm run start:dev
```

Backend chạy tại: http://localhost:3001

## 5. Test và build

Chạy từ thư mục tương ứng:

```bash
# Backend (apps/api)
npm run lint
npm test -- --runInBand
npm run build

# Frontend (apps/web)
npm run lint
npm run test
npm run build
```

## 6. Cấu hình môi trường

Tham khảo file `.env.example` tại thư mục gốc để biết biến môi trường mẫu.

Đối với frontend, tạo file `apps/web/.env.local` và cấu hình:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Các thông tin môi trường khác cần được cấu hình theo yêu cầu thực tế của từng ứng dụng.

Không đưa file `.env`, `.env.local` hoặc thông tin bí mật lên GitHub.

## 7. Deploy và rollback

Production dùng Render theo cấu hình Blueprint ở `render.yaml`. Thành viên có quyền workspace kết nối repository với Render, chọn **New → Blueprint**, rồi kiểm tra cấu hình và gói trước khi deploy. Hướng dẫn chi tiết, URL production, smoke test và giới hạn gói được ghi trong [`docs/deployment.md`](docs/deployment.md).

Sau khi deploy lỗi, dùng trang Events/Deploys của Render để rollback về phiên bản ứng dụng ổn định trước đó. Kiểm tra tương thích schema trước khi khôi phục database; rollback mã nguồn không tự đảo migrations.

## 8. Trạng thái dự án

- [x] Khởi tạo Frontend Next.js
- [x] Khởi tạo Backend NestJS
- [x] Chạy thử hai ứng dụng
- [x] Thiết lập Git và tài liệu cơ bản
- [x] Sắp xếp cấu trúc dự án theo `apps/api` và `apps/web`
- [ ] Hoàn thiện hướng dẫn thứ tự migration/seed PostgreSQL để tái tạo database
- [ ] Xây dựng API và giao diện
- [ ] Kiểm thử và tích hợp các chức năng

## 9. Đóng góp và phát triển

Các thành viên sử dụng Git để quản lý mã nguồn, cập nhật chức năng và phối hợp phát triển dự án thông qua GitHub.
