# BrewLite

Ứng dụng web đặt đồ uống trực tuyến.

## Công nghệ sử dụng

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL
- **ORM dự kiến:** Prisma
- **Version control:** Git

## Cấu trúc dự án

```text
BrewLite/
├── frontend/       # Next.js
├── backend/        # NestJS
├── .gitignore
├── .env.example
└── README.md
```

## Yêu cầu môi trường

- Node.js và npm
- Git
- PostgreSQL (phục vụ các bước tích hợp cơ sở dữ liệu sau này)

## Chạy Frontend

Mở terminal tại thư mục gốc:

```bash
cd frontend
npm install
npm run dev
```

Truy cập: http://localhost:3000

## Chạy Backend

Mở một terminal khác tại thư mục gốc:

```bash
cd backend
npm install
npm run start:dev
```

Truy cập: http://localhost:3001

## Cấu hình môi trường

Tham khảo `.env.example` để biết các biến môi trường cần thiết.

Khi triển khai các chức năng cơ sở dữ liệu và xác thực, hãy tạo file `.env` riêng và điền các giá trị phù hợp. Không commit thông tin bí mật lên Git.

## Trạng thái hiện tại

- [x] Khởi tạo Frontend Next.js
- [x] Khởi tạo Backend NestJS
- [x] Chạy thử hai ứng dụng
- [x] Thiết lập Git và tài liệu cơ bản
- [ ] Tích hợp PostgreSQL và Prisma
- [ ] Xây dựng API và giao diện
- [ ] Kiểm thử và tích hợp các chức năng
