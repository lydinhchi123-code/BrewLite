# BrewLite
Ứng dụng web đặt đồ uống trực tuyến, cho phép người dùng tìm kiếm và lựa chọn đồ uống thông qua giao diện website.

## 1. Công nghệ sử dụng

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma (dự kiến tích hợp)
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

- Node.js và npm
- Git
- PostgreSQL (phục vụ tích hợp cơ sở dữ liệu)

## 4. Cài đặt và chạy dự án

### 4.1. Frontend

Mở terminal tại thư mục gốc dự án:

```bash
cd apps/web
npm install
npm run dev
```

Truy cập: http://localhost:3000

### 4.2. Backend

Mở một terminal khác tại thư mục gốc dự án:

```bash
cd apps/api
npm install
npm run start:dev
```

Backend chạy tại: http://localhost:3001

## 5. Cấu hình môi trường

Tham khảo file `.env.example` tại thư mục gốc để biết biến môi trường mẫu.

Đối với frontend, tạo file `apps/web/.env.local` và cấu hình:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Các thông tin môi trường khác cần được cấu hình theo yêu cầu thực tế của từng ứng dụng.

Không đưa file `.env`, `.env.local` hoặc thông tin bí mật lên GitHub.

## 6. Trạng thái dự án

- [x] Khởi tạo Frontend Next.js
- [x] Khởi tạo Backend NestJS
- [x] Chạy thử hai ứng dụng
- [x] Thiết lập Git và tài liệu cơ bản
- [x] Sắp xếp cấu trúc dự án theo `apps/api` và `apps/web`
- [ ] Tích hợp PostgreSQL và Prisma
- [ ] Xây dựng API và giao diện
- [ ] Kiểm thử và tích hợp các chức năng

## 7. Đóng góp và phát triển

Các thành viên sử dụng Git để quản lý mã nguồn, cập nhật chức năng và phối hợp phát triển dự án thông qua GitHub.