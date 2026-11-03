# API menu cho BrewLite

Backend này bổ sung 2 endpoint đọc dữ liệu menu từ PostgreSQL:

- `GET http://localhost:3001/menu/categories`
- `GET http://localhost:3001/menu/products`

## Cài đặt

1. Sao lưu backend hiện tại, rồi chép các file trong thư mục này vào backend của bạn (giữ các file khác).
2. Trong terminal, chuyển vào thư mục backend và chạy:

   ```bash
   npm install
   ```

3. Tạo file `.env` ở thư mục gốc backend, dựa trên `.env.example`. Thay `YOUR_PASSWORD` bằng mật khẩu PostgreSQL thực tế.
4. Đảm bảo SQL tạo các bảng `menu_categories` và `menu_products` đã chạy trong database `brewlite_db` và các bảng có dữ liệu.
5. Chạy:

   ```bash
   npm run start:dev
   ```

6. Mở `http://localhost:3001/menu/products` để kiểm tra JSON.

## Lưu ý

- Mã này chỉ đọc menu, không sửa/xóa các bảng khác.
- Cần có các cột như trong SQL menu đã tạo: `menu_categories(id, name, slug, description, image_url, display_order, is_active)` và `menu_products(id, category_id, name, slug, description, image_url, base_price, is_featured, is_available, display_order)`.
- Frontend cần đặt `NEXT_PUBLIC_API_URL=http://localhost:3001` trong `.env.local` nếu backend chạy cổng 3001.
- CORS mặc định cho frontend ở `http://localhost:8443`; nếu frontend chạy cổng khác, đổi `FRONTEND_URL`.
