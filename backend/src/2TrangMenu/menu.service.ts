import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';

export interface MenuCategoryRow {
  id: number | string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
}

export interface MenuSizeRow {
  id: number | string;
  size_code: string;
  size_name: string;
  price: number | string;
}

export interface MenuToppingRow {
  id: number | string;
  name: string;
  price: number | string;
}

export interface MenuProductRow {
  id: number | string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  base_price: number | string;
  is_featured: boolean;
  is_available: boolean;
  display_order: number;
  category_id: number | string | null;
  category_name: string | null;
  category_slug: string | null;
  sizes: MenuSizeRow[];
  toppings: MenuToppingRow[];
}

@Injectable()
export class MenuService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'Thiếu DATABASE_URL. Hãy khai báo chuỗi kết nối PostgreSQL trong file .env.',
      );
    }

    try {
      await this.pool.query('SELECT 1');
    } catch (error: unknown) {
      throw new Error(
        `Không thể kết nối PostgreSQL. Hãy kiểm tra DATABASE_URL và trạng thái PostgreSQL. Chi tiết: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Lấy danh sách danh mục đang hoạt động.
   */
  async getCategories(): Promise<MenuCategoryRow[]> {
    try {
      const result = await this.pool.query<MenuCategoryRow>(`
        SELECT
          id,
          name,
          slug,
          description,
          image_url,
          display_order
        FROM menu_categories
        WHERE is_active = TRUE
        ORDER BY display_order ASC, name ASC
      `);

      return result.rows;
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * Lấy danh sách sản phẩm, size và topping.
   *
   * Quy tắc:
   * - Tất cả sản phẩm không thuộc danh mục Bánh đều có toàn bộ
   *   topping đang hoạt động trong bảng menu_toppings.
   * - Sản phẩm thuộc danh mục Bánh luôn có toppings = [].
   * - Size lấy theo từng sản phẩm từ menu_product_sizes.
   */
  async getProducts() {
    try {
      const result = await this.pool.query<MenuProductRow>(`
        SELECT
          p.id,
          p.name,
          p.slug,
          p.description,
          p.image_url,
          p.base_price,
          p.is_featured,
          p.is_available,
          p.display_order,

          c.id AS category_id,
          c.name AS category_name,
          c.slug AS category_slug,

          -- Lấy size của từng sản phẩm
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', s.id,
                  'size_code', s.size_code,
                  'size_name', s.size_name,
                  'price', s.price
                )
                ORDER BY s.display_order ASC, s.id ASC
              )
              FROM menu_product_sizes s
              WHERE s.product_id = p.id
                AND s.is_available = TRUE
            ),
            '[]'::json
          ) AS sizes,

          -- Tất cả món nước lấy toàn bộ topping đang hoạt động.
          -- Món thuộc danh mục Bánh không có topping.
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'price', t.price
                )
                ORDER BY t.display_order ASC, t.id ASC
              )
              FROM menu_toppings t
              WHERE t.is_available = TRUE
                AND c.slug <> 'banh'
            ),
            '[]'::json
          ) AS toppings

        FROM menu_products p
        LEFT JOIN menu_categories c
          ON c.id = p.category_id

        WHERE p.is_available = TRUE
          AND (c.id IS NULL OR c.is_active = TRUE)

        ORDER BY p.display_order ASC, p.name ASC
      `);

      return result.rows.map((row) => ({
        ...row,

        // Giá từ PostgreSQL chuyển thành number để frontend dễ tính toán
        id: Number(row.id),
        basePrice: Number(row.base_price),
        imageUrl: row.image_url,
        isFeatured: row.is_featured,

        categoryId:
          row.category_id === null
            ? null
            : Number(row.category_id),

        categoryName: row.category_name,
        categorySlug: row.category_slug,

        category: row.category_id
          ? {
              id: Number(row.category_id),
              name: row.category_name,
              slug: row.category_slug,
            }
          : null,

        // Chuẩn hóa giá size
        sizes: (row.sizes ?? []).map((size) => ({
          ...size,
          id: Number(size.id),
          price: Number(size.price),
        })),

        // Chuẩn hóa giá topping
        toppings: (row.toppings ?? []).map((topping) => ({
          ...topping,
          id: Number(topping.id),
          price: Number(topping.price),
        })),
      }));
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

   /**
   * Lấy toàn bộ sản phẩm và thông tin tồn kho dành cho Admin.
   * Không lọc is_available để Admin vẫn thấy món ngừng bán.
   */
  async getInventory() {
    try {
      const result = await this.pool.query(`
        SELECT
          p.id,
          p.name,
          p.slug,
          p.image_url,
          p.is_available,
          p.stock_quantity,
          p.low_stock_threshold,
          p.track_inventory,
          c.name AS category_name,
          CASE
            WHEN p.track_inventory = FALSE THEN 'KHONG_QUAN_LY_TON'
            WHEN p.stock_quantity = 0 THEN 'HET_HANG'
            WHEN p.stock_quantity <= p.low_stock_threshold
              THEN 'SAP_HET_HANG'
            ELSE 'CON_HANG'
          END AS inventory_status
        FROM menu_products p
        LEFT JOIN menu_categories c
          ON c.id = p.category_id
        ORDER BY c.display_order ASC, p.display_order ASC, p.name ASC
      `);

      return result.rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        slug: row.slug,
        imageUrl: row.image_url,
        categoryName: row.category_name,
        isAvailable: row.is_available,
        stockQuantity: Number(row.stock_quantity),
        lowStockThreshold: Number(row.low_stock_threshold),
        trackInventory: row.track_inventory,
        inventoryStatus: row.inventory_status,
      }));
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * Cập nhật số lượng tồn kho của một sản phẩm.
   */
  async updateInventory(id: number, stockQuantity: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException('ID sản phẩm không hợp lệ.');
    }

    if (
      !Number.isSafeInteger(stockQuantity) ||
      stockQuantity < 0
    ) {
      throw new BadRequestException(
        'Số lượng tồn kho phải là số nguyên không âm.',
      );
    }

    try {
      const result = await this.pool.query(
        `
          UPDATE menu_products
          SET stock_quantity = $1
          WHERE id = $2
          RETURNING
            id,
            name,
            stock_quantity,
            low_stock_threshold,
            track_inventory
        `,
        [stockQuantity, id],
      );

      if (result.rowCount === 0) {
        throw new NotFoundException('Không tìm thấy sản phẩm.');
      }

      const product = result.rows[0];

      return {
        message: 'Cập nhật tồn kho thành công.',
        product: {
          id: Number(product.id),
          name: product.name,
          stockQuantity: Number(product.stock_quantity),
          lowStockThreshold: Number(product.low_stock_threshold),
          trackInventory: product.track_inventory,
        },
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.handleDatabaseError(error);
    }
  }

  /**
   * Chuyển lỗi truy vấn PostgreSQL thành lỗi API dễ đọc.
   */
  private handleDatabaseError(error: unknown): never {
    const message =
      error instanceof Error ? error.message : String(error);

    throw new ServiceUnavailableException(
      `Không đọc được dữ liệu menu. Hãy kiểm tra bảng menu_categories, menu_products, menu_product_sizes và menu_toppings đã được tạo, có dữ liệu và DATABASE_URL trỏ đúng database. Chi tiết: ${message}`,
    );
  }
}