# BrewLite
Ứng dụng web đặt đồ uống trực tuyến, cho phép người dùng tìm kiếm và lựa chọn đồ uống thông qua giao diện website.

BrewLite là ứng dụng web đặt đồ uống trực tuyến, cho phép khách hàng xem menu, tìm kiếm và lựa chọn sản phẩm, quản lý giỏ hàng và thực hiện đặt hàng thông qua giao diện website.

Dự án được xây dựng theo mô hình Frontend – Backend – Database, sử dụng Next.js, NestJS và PostgreSQL. Hệ thống được tổ chức trong một monorepo nhằm thuận tiện cho việc phát triển, kiểm thử và triển khai.

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 18 |
| Ngôn ngữ lập trình | TypeScript, SQL |
| Quản lý package | npm |
| Kiểm thử Backend | Jest, Supertest |
| Kiểm thử Frontend | Công cụ kiểm thử được cấu hình trong dự án |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Deployment | Render |
| Version Control | Git, GitHub |

## 2. Cấu trúc dự án

```text
BrewLite/
├── apps/
│   ├── api/                         # Backend - NestJS
│   │   ├── src/                     # Mã nguồn Backend
│   │   ├── test/                    # Kiểm thử API
│   │   ├── Dockerfile               # Cấu hình Docker cho API
│   │   └── package.json
│   │
│   └── web/                         # Frontend - Next.js
│       ├── src/                     # Mã nguồn Frontend
│       ├── public/                  # Tài nguyên tĩnh
│       ├── Dockerfile               # Cấu hình Docker cho Web
│       └── package.json
│
├── database/                        # Cơ sở dữ liệu
│   ├── migrations/                  # Các script cập nhật cấu trúc DB
│   ├── Menu.sql
│   ├── TaiKhoanKhachHang.sql
│   ├── NguyenLieu.sql
│   ├── DonHang-ThanhToan.sql
│   ├── GiamGia.sql
│   └── docker-init.sh               # Khởi tạo database cho Docker
│
├── docs/                            # Tài liệu dự án
│   ├── requirements/                # Task 1
│   ├── diagrams/                    # Task 2
│   ├── architecture/                # Task 3
│   ├── releases/
│   └── deployment.md                # Hướng dẫn triển khai
│
├── .github/
│   └── workflows/                   # GitHub Actions workflows
│
├── docker-compose.yml               # Cấu hình chạy toàn bộ hệ thống
├── render.yaml                      # Cấu hình triển khai trên Render
├── .gitignore
└── README.md
```

## 3. Yêu cầu môi trường

Để cài đặt và chạy dự án, cần chuẩn bị các công cụ sau:

- **Node.js:** Phiên bản 24.
- **npm:** Trình quản lý package đi kèm Node.js.
- **PostgreSQL:** Phiên bản 18 nếu chạy database thủ công.
- **Git:** Dùng để quản lý và tải mã nguồn.
- **Docker Desktop:** Cần thiết nếu sử dụng Docker Compose.

Kiểm tra phiên bản các công cụ:

```powershell
node -v
npm -v
psql --version
git --version
docker --version
docker compose version
```

## 4. Cài đặt và chạy dự án

Trước tiên, tải mã nguồn từ GitHub:

```powershell
git clone <repository-url>
cd BrewLite
```

Có hai cách để chạy dự án ở môi trường local.

### 4.1. Cách 1: Chạy toàn bộ hệ thống bằng Docker Compose

**Bước 1.** Cài đặt và khởi động Docker Desktop.

**Bước 2.** Mở terminal tại thư mục gốc của repository và chạy:

```bash
cd apps/web
npm install
npm run dev
```

Lệnh này thực hiện build các Docker Image cần thiết và khởi chạy ba dịch vụ PostgreSQL, Backend và Frontend. Database được khởi tạo theo cấu hình và thứ tự các script SQL đã thiết lập trong dự án.

**Bước 3.** Truy cập hệ thống:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Backend Health Check: http://localhost:3001/health

PostgreSQL được ánh xạ ra cổng `5433` trên máy local để tránh xung đột với PostgreSQL đang sử dụng cổng `5432`.

Nếu cổng `5433` đã được sử dụng, cấu hình cổng khác trước khi khởi chạy:

```powershell
$env:POSTGRES_PORT = "5434"
docker compose up --build
```

Khi đó, sử dụng cổng `5434` cho các kết nối database từ máy local và các bài kiểm thử cần kết nối PostgreSQL.

**Bước 4. Dừng hệ thống**

Nhấn `Ctrl+C` tại terminal đang chạy Docker Compose, sau đó thực hiện:

```powershell
docker compose down
```

Lệnh này dừng và xóa các container nhưng giữ lại volume database để bảo toàn dữ liệu local.

Nếu muốn xóa toàn bộ dữ liệu database local và khởi tạo lại từ đầu:

```powershell
docker compose down -v
docker compose up --build
```

**Lưu ý:** Lệnh `docker compose down -v` sẽ xóa volume và toàn bộ dữ liệu database local hiện có.

### 4.2. Cách 2: Chạy Frontend và Backend riêng với PostgreSQL

#### Bước 1. Khởi tạo Database

Khởi động PostgreSQL, sau đó tạo database mới:

```powershell
psql -U postgres -h localhost -c "CREATE DATABASE brewlite_db;"
```

Từ thư mục gốc dự án, thực hiện các script SQL theo đúng thứ tự:

```powershell
psql -U postgres -h localhost -d brewlite_db -f database/Menu.sql
psql -U postgres -h localhost -d brewlite_db -f database/TaiKhoanKhachHang.sql
psql -U postgres -h localhost -d brewlite_db -f database/NguyenLieu.sql
psql -U postgres -h localhost -d brewlite_db -f database/DonHang-ThanhToan.sql
psql -U postgres -h localhost -d brewlite_db -f database/GiamGia.sql
psql -U postgres -h localhost -d brewlite_db -f database/migrations/20261027_upgrade_order_details.sql
```

Các script trên dùng để khởi tạo database mới. Không chạy lại trên database đã có cấu trúc và dữ liệu nếu không có chủ đích thiết lập lại database.

#### Bước 2. Cài đặt và chạy Backend

Di chuyển vào thư mục Backend:

```powershell
cd apps/api
npm ci
```

Tạo file `apps/api/.env` và cấu hình các biến môi trường:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/brewlite_db
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=replace_with_a_local_random_secret
```

Thay `YOUR_PASSWORD` bằng mật khẩu PostgreSQL trên máy local và sử dụng một giá trị bí mật riêng cho `JWT_SECRET`.

Khởi chạy Backend:

```powershell
npm run start:dev
```

Backend chạy tại:

- API: http://localhost:3001
- Health Check: http://localhost:3001/health

#### Bước 3. Cài đặt và chạy Frontend

Mở một terminal khác, di chuyển vào thư mục Frontend:

```powershell
cd apps/web
npm ci
```

Tạo file `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Khởi chạy Frontend:

```powershell
npm run dev
```

Truy cập website tại:

http://localhost:3000

## 5. Hướng dẫn truy cập trang Admin

BrewLite cung cấp trang quản trị dành cho Admin để quản lý và theo dõi các hoạt động của hệ thống.

**Địa chỉ truy cập:**

- URL: `http://localhost:3000/admin`

**Tài khoản đăng nhập local:**

- Mật khẩu: `admin123`

**Cách đăng nhập:**

1. Khởi chạy hệ thống BrewLite.
2. Truy cập `http://localhost:3000/admin`.
3. Nhập mật khẩu `admin123`.
4. Nhấn nút **Đăng nhập** để truy cập trang quản trị.

**Lưu ý:**

- Mật khẩu Admin hiện được khai báo trực tiếp trong mã nguồn Frontend.
- Sau khi đăng nhập thành công, hệ thống lưu trạng thái đăng nhập vào `sessionStorage` bằng khóa `brewlite_admin_loggedIn`.
- Trạng thái đăng nhập được duy trì trong phiên tab trình duyệt hiện tại.

**Lưu ý bảo mật:**

- Đây là cơ chế đăng nhập Admin đơn giản phục vụ phiên bản hiện tại.
- Mật khẩu được lưu trực tiếp trong mã nguồn Frontend nên không được xem là cơ chế xác thực an toàn.
- Không sử dụng mật khẩu này làm thông tin bảo mật cho môi trường Production có dữ liệu thực.
- Khi triển khai thực tế, cần chuyển sang xác thực Admin ở Backend và quản lý thông tin đăng nhập bằng cấu hình bảo mật.

## 6. Cấu hình môi trường

Dự án sử dụng biến môi trường để quản lý các thông tin cấu hình giữa môi trường local và Production.

### 6.1. Backend

File cấu hình: `apps/api/.env`

| Biến môi trường | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `PORT` | Cổng chạy Backend |
| `FRONTEND_URL` | Địa chỉ Frontend được phép kết nối |
| `JWT_SECRET` | Khóa bí mật dùng cho xác thực JWT |

### 6.2. Frontend

File cấu hình: `apps/web/.env.local`

| Biến môi trường | Ý nghĩa |
|---|---|
| `NEXT_PUBLIC_API_URL` | Địa chỉ API mà Frontend sử dụng để gửi yêu cầu |

Các giá trị trên là cấu hình mẫu cho môi trường local. Khi triển khai Production, cần thay bằng URL và thông tin tương ứng trên Render.

### 6.3. Lưu ý bảo mật

- Không đưa các file `.env`, `.env.local` hoặc thông tin bí mật lên GitHub.
- Không công khai mật khẩu database, JWT secret hoặc khóa bí mật của dịch vụ thanh toán.
- Các thông tin bí mật Production được quản lý trong phần Environment của Render.
- Không đưa thông tin bí mật vào mã nguồn, file cấu hình mẫu hoặc log CI/CD.
- Database Production chỉ cho phép Backend kết nối thông qua cấu hình kết nối nội bộ của Render.

## 7. Kiểm tra, kiểm thử và build

Các lệnh dưới đây được thực hiện tại thư mục tương ứng của từng ứng dụng.

### 7.1. Backend

```powershell
cd apps/api

npm run lint
npm test -- --runInBand
npm run build
```

### 7.2. Frontend

```powershell
cd apps/web

npm run lint
npm run test
npm run build
```

### 7.3. API End-to-End Testing

Bài kiểm thử API E2E cần một PostgreSQL database mới đã được khởi tạo và seed dữ liệu. Có thể sử dụng PostgreSQL từ Docker Compose.

Từ thư mục gốc dự án:

```powershell
$env:POSTGRES_PORT = "5434"
docker compose up -d --wait db
```

Sau đó chạy kiểm thử tại thư mục Backend:

```powershell
cd apps/api

$env:DATABASE_URL = "postgresql://postgres:brewlite_dev@localhost:5434/brewlite_db"
$env:JWT_SECRET = "local-e2e-only-secret"

npm run test:e2e -- --runInBand

Remove-Item Env:DATABASE_URL
Remove-Item Env:JWT_SECRET

cd ..\..
docker compose down
```

Nếu sử dụng cổng `5433`, thay `5434` trong chuỗi kết nối bằng `5433`.

Bài kiểm thử E2E thực hiện các bước chính: lấy dữ liệu menu, đăng ký và đăng nhập tài khoản khách hàng thử nghiệm, tạo đơn hàng Pickup, thực hiện thanh toán bằng phương thức Mock và truy vấn thông tin xác nhận đơn hàng.

### 7.4. Continuous Integration

GitHub Actions được sử dụng để tự động kiểm tra mã nguồn khi tạo Pull Request vào nhánh `master`.

Quy trình CI bao gồm:

- Chạy lint cho Frontend và Backend.
- Chạy Unit Test.
- Khởi tạo PostgreSQL có dữ liệu seed để thực hiện API End-to-End Test.
- Build Frontend và Backend.

Các kết quả kiểm thử được theo dõi trong mục **Actions** của repository GitHub.

## 8. Trạng thái dự án

### 8.1. Phát triển hệ thống

- [x] Khởi tạo cấu trúc monorepo.
- [x] Xây dựng Frontend bằng Next.js.
- [x] Xây dựng Backend bằng NestJS.
- [x] Tích hợp PostgreSQL.
- [x] Xây dựng các chức năng nghiệp vụ chính.
- [x] Tích hợp Frontend với Backend.
- [x] Xây dựng chức năng giỏ hàng và đặt hàng.
- [x] Tích hợp quy trình thanh toán thử nghiệm.
- [x] Xây dựng chức năng theo dõi và tra cứu đơn hàng.

### 8.2. Kiểm thử và triển khai

- [x] Thiết lập Unit Test cho Backend.
- [x] Thiết lập API End-to-End Test.
- [x] Thiết lập kiểm thử cho Frontend.
- [x] Cấu hình Docker và Docker Compose.
- [x] Thiết lập GitHub Actions.
- [x] Cấu hình triển khai bằng Render Blueprint.
- [x] Triển khai Frontend và Backend trên Render.
- [x] Triển khai PostgreSQL trên Render.
- [x] Kiểm tra API Health Check trên Production.

## 9. Triển khai Production

BrewLite sử dụng Render làm nền tảng triển khai Production, gồm ba dịch vụ chính:

- **Frontend:** Next.js Web Service.
- **Backend:** NestJS Web Service.
- **Database:** PostgreSQL Database.

### 9.1. Địa chỉ truy cập

| Thành phần | Địa chỉ |
|---|---|
| Frontend | https://brewlite-web-ksd1.onrender.com/ |
| Backend | https://brewlite-api-tutb.onrender.com |
| API Health Check | https://brewlite-api-tutb.onrender.com/health |

API Health Check sử dụng phương thức `GET /health` để kiểm tra trạng thái khởi chạy của Backend.

### 9.2. Hướng dẫn triển khai

Cấu hình triển khai được quản lý bằng file `render.yaml` tại thư mục gốc repository.

Chi tiết các bước tạo Render Blueprint, cấu hình biến môi trường, khởi tạo database, kiểm tra Production và rollback được trình bày trong tài liệu:

`docs/deployment.md`

**Lưu ý:** Dịch vụ miễn phí trên Render có thể chuyển sang trạng thái ngủ khi không có yêu cầu trong một khoảng thời gian. Vì vậy, yêu cầu đầu tiên sau thời gian không hoạt động có thể mất thêm thời gian để tải dữ liệu.

## 10. Đóng góp và phát triển

Các thành viên sử dụng Git và GitHub để quản lý mã nguồn, phối hợp phát triển và kiểm soát thay đổi.

Quy trình làm việc cơ bản:

1. Cập nhật mã nguồn từ nhánh chính.
2. Tạo branch riêng cho chức năng hoặc nhiệm vụ cần thực hiện.
3. Phát triển và kiểm thử chức năng.
4. Commit và push thay đổi lên GitHub.
5. Tạo Pull Request để xem xét và tích hợp vào nhánh `master`.

Các thay đổi cần được kiểm tra trước khi tích hợp nhằm đảm bảo tính ổn định của hệ thống.



